import fs from 'node:fs';
import path from 'node:path';
import {
  SITE,
  assert,
  githubSha,
  read,
  replaceRegexOnce,
  write,
  walk,
} from '../lib/core.js';

const MAP_HELPERS = new Set([
  path.resolve(SITE, '_js_dev/mapKrc.js'),
  path.resolve(SITE, 'js/main_shop_maps__q_9fc895e1.js'),
]);

const MAP_USAGE = /\b(?:shop_init_mapear|shop_krc_geoCode|shop_krc_mapear|krc_geoCode|krc_mapear)\s*\(/i;
const MAP_MARKUP = /(?:\bid=["'][^"']*map[^"']*["']|\bclass=["'][^"']*\bmapParent\b[^"']*["'])/i;
const CSS_IMPORT = /^\s*@import\s+["'](?<path>\.\/[^"']+)\?v=unversioned["'];\s*$/gm;
const RELATIVE_MODULE_SPECIFIER = /(?<prefix>\b(?:from\s+|import\s*\(\s*))(?<quote>["'])(?<path>\.{1,2}\/[^"']+\.js)(?:\?v=(?<version>[^"']+))?\k<quote>/g;

function pruneUnusedMaps(html: string): string {
  assert(!MAP_MARKUP.test(html), 'Map markup detected; refusing to remove Google Maps from Pages');

  for (const file of walk(SITE).filter((item) => item.endsWith('.js'))) {
    if (MAP_HELPERS.has(path.resolve(file))) continue;
    if (MAP_USAGE.test(read(file))) {
      throw new Error(`Map helper usage detected in ${file}; refusing to remove Google Maps`);
    }
  }

  const removableScripts = [
    /<script\b[^>]*\bsrc=["']https:\/\/maps\.googleapis\.com\/maps\/api\/js\?[^"']*["'][^>]*><\/script>/i,
    /<script\b[^>]*\bsrc=["']_js_dev\/mapKrc\.js["'][^>]*><\/script>/i,
    /<script\b[^>]*\bsrc=["']js\/main_shop_maps__q_9fc895e1\.js["'][^>]*><\/script>/i,
  ];

  for (const pattern of removableScripts) {
    const matches = html.match(new RegExp(pattern.source, 'gi')) ?? [];
    assert(matches.length === 1, `Expected exactly one removable map script for pattern: ${pattern.source}`);
    html = html.replace(pattern, '');
  }
  return html;
}

function stampEntrypoint(sha: string): void {
  const file = path.join(SITE, 'index.html');
  let html = read(file);

  html = replaceRegexOnce(
    html,
    /_js_dev\/main\.js\?v=[^"']+/,
    `_js_dev/main.js?v=${sha}`,
    'Could not rewrite the main.js entrypoint exactly once',
  );

  const entry = new RegExp(
    `(?<tag><script\\s+src=["']_js_dev/main\\.js\\?v=${sha}["'][^>]*><\\/script>)`,
    'i',
  );
  const match = entry.exec(html);
  assert(match?.groups?.tag, 'Could not inject override preload hints exactly once');

  const hints = [
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    `<link rel="preload" as="script" href="_js_dev/main-legacy.js?v=${sha}">`,
    `<link rel="preload" as="style" href="override/main.css?v=${sha}">`,
    `<link rel="modulepreload" href="override/main.js?v=${sha}">`,
  ].join('\n');

  html = `${html.slice(0, match.index)}${hints}\n${match.groups.tag}${html.slice(match.index + match[0].length)}`;

  let fontCount = 0;
  html = html.replace(
    /(?<tag><link\s+rel="preload"\s+href="fuentes\/AcuminPro-(?:Regular|Semibold)\.woff2"\s+as="font"\s+type="font\/woff2")(?<end>>)/gi,
    (_all: string, tag: string, end: string) => {
      fontCount += 1;
      return `${tag} crossorigin${end}`;
    },
  );
  assert(fontCount === 2, `Expected two Acumin font preloads, found ${fontCount}`);

  const banner = /<img\b(?=[^>]*\bclass="[^"]*\bimgBannerShop\b[^"]*")(?<attrs>[^>]*)>/i.exec(html);
  assert(banner?.groups?.attrs && banner.index !== undefined, 'Expected one catalogue banner image, found 0');
  const bannerAttrs = banner.groups.attrs
    .replace(/\s+(?:loading|decoding|fetchpriority)="[^"]*"/gi, '')
    .concat(' loading="eager" decoding="async" fetchpriority="high"');
  html = `${html.slice(0, banner.index)}<img${bannerAttrs}>${html.slice(banner.index + banner[0].length)}`;

  let productImageCount = 0;
  html = html.replace(
    /(?<prefix><div\b[^>]*class="[^"]*\bimgShop\b[^"]*"[^>]*>\s*<img\b)(?<attrs>[^>]*)(?<close>>)/gi,
    (_all: string, prefix: string, imageAttrs: string, close: string) => {
      productImageCount += 1;
      let attrs = imageAttrs;
      if (!/\bloading\s*=/i.test(attrs)) attrs += ' loading="lazy"';
      if (!/\bdecoding\s*=/i.test(attrs)) attrs += ' decoding="async"';
      return `${prefix}${attrs}${close}`;
    },
  );
  assert(productImageCount >= 1, 'No product images were found for native lazy loading');

  write(file, pruneUnusedMaps(html));
}

function stampLegacyBootstrap(sha: string): void {
  const file = path.join(SITE, '_js_dev/main.js');
  const source = read(file);
  const versionPlaceholder = /var\s+version='[^']+';/;
  write(
    file,
    replaceRegexOnce(
      source,
      versionPlaceholder,
      `var version='${sha}';`,
      'Could not stamp the legacy bootstrap version exactly once',
    ),
  );
}

function rebaseCssUrls(bundle: string, source: string, content: string): string {
  return content.replace(
    /url\(\s*(?<quote>["']?)(?<value>.*?)(?:\k<quote>)\s*\)/gi,
    (full: string, ...args: unknown[]) => {
      const groups = args.at(-1) as { quote?: string; value?: string } | undefined;
      const value = (groups?.value ?? '').trim();
      const quote = groups?.quote ?? '';
      if (!value || /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(value)) return full;

      const parts = /^(?<path>[^?#]+)(?<suffix>[?#].*)?$/.exec(value);
      if (!parts?.groups?.path) return full;
      const resolved = path.normalize(path.join(path.dirname(source), parts.groups.path));
      const rebased = path.relative(path.dirname(bundle), resolved).split(path.sep).join('/');
      return `url(${quote}${rebased}${parts.groups.suffix ?? ''}${quote})`;
    },
  );
}

function bundleCss(): void {
  const file = path.join(SITE, 'override/main.css');
  const manifest = read(file);
  const imports = [...manifest.matchAll(CSS_IMPORT)]
    .map((match) => match.groups?.path)
    .filter((value): value is string => Boolean(value));

  assert(imports.length > 0, 'No CSS imports were found to bundle');
  assert(new Set(imports).size === imports.length, 'Duplicate CSS imports found while bundling');
  assert(manifest.replace(CSS_IMPORT, '').trim() === '', 'override/main.css contains non-import content; refusing unsafe bundle');

  const chunks = imports.map((importPath) => {
    const source = path.join(path.dirname(file), importPath.slice(2));
    assert(fs.existsSync(source), `Missing CSS source while bundling: ${source}`);
    const content = read(source);
    assert(!content.includes('@import'), `Nested CSS import found while bundling: ${source}`);
    return `/* origen: ${importPath} */\n${rebaseCssUrls(file, source, content).trimEnd()}`;
  });

  write(file, `${chunks.join('\n\n')}\n`);
}

function stampModuleSpecifiers(sha: string): void {
  const moduleFiles = walk(path.join(SITE, 'override')).filter((file) => file.endsWith('.js'));
  assert(moduleFiles.length > 1, 'Compiled override module graph is missing');

  for (const file of moduleFiles) {
    const source = read(file);
    const stamped = source.replace(
      RELATIVE_MODULE_SPECIFIER,
      (_match: string, ...args: unknown[]) => {
        const groups = args.at(-1) as { prefix?: string; quote?: string; path?: string } | undefined;
        const prefix = groups?.prefix ?? '';
        const quote = groups?.quote ?? "'";
        const specifier = groups?.path ?? '';
        return `${prefix}${quote}${specifier}?v=${sha}${quote}`;
      },
    );
    write(file, stamped.replace(/^\s*\/\/[#@]\s*sourceMappingURL=.*$/gm, ''));
  }
}

interface ModuleSpecifier {
  readonly path: string;
  readonly version: string | null;
}

function relativeModuleSpecifiers(source: string): ModuleSpecifier[] {
  return [...source.matchAll(RELATIVE_MODULE_SPECIFIER)].flatMap((match) => {
    const modulePath = match.groups?.path;
    if (!modulePath) return [];
    return [{ path: modulePath, version: match.groups?.version ?? null } satisfies ModuleSpecifier];
  });
}

function verify(sha: string): void {
  const index = read(path.join(SITE, 'index.html'));
  const bootstrap = read(path.join(SITE, '_js_dev/main.js'));
  const css = read(path.join(SITE, 'override/main.css'));
  const main = read(path.join(SITE, 'override/main.js'));

  assert(index.includes(`_js_dev/main.js?v=${sha}`), 'Stamped main.js entrypoint is missing');
  assert(index.includes(`_js_dev/main-legacy.js?v=${sha}`), 'Legacy runtime preload is missing');
  assert(index.includes(`override/main.css?v=${sha}`), 'Override stylesheet preload is missing');
  assert(index.includes(`rel="modulepreload" href="override/main.js?v=${sha}"`), 'Override modulepreload is missing');
  assert(!index.includes('cdn.jsdelivr.net'), 'Obsolete jsDelivr connection hint remains');

  for (const origin of ['https://fonts.googleapis.com', 'https://fonts.gstatic.com']) {
    assert(index.includes(`rel="preconnect" href="${origin}"`), `Preconnect hint is missing for ${origin}`);
  }

  assert(
    (index.match(/<link\s+rel="preload"\s+href="fuentes\/AcuminPro-(?:Regular|Semibold)\.woff2"\s+as="font"\s+type="font\/woff2"\s+crossorigin>/gi) ?? []).length === 2,
    'Acumin font preloads must include crossorigin',
  );
  assert(
    /<img\b(?=[^>]*\bclass="[^"]*\bimgBannerShop\b[^"]*")(?=[^>]*\bloading="eager")(?=[^>]*\bdecoding="async")(?=[^>]*\bfetchpriority="high")[^>]*>/i.test(index),
    'Catalogue banner must be eager, async-decoded and high priority',
  );
  assert(index.includes('loading="lazy"') && index.includes('decoding="async"'), 'Native lazy product image attributes are missing');
  assert(!index.includes('maps.googleapis.com/maps/api/js'), 'Unused Google Maps API runtime remains');
  assert(!index.includes('_js_dev/mapKrc.js'), 'Unused mapKrc runtime remains');
  assert(!index.includes('js/main_shop_maps__q_9fc895e1.js'), 'Unused shop maps runtime remains');
  assert(bootstrap.includes(`var version='${sha}';`), 'Stamped legacy bootstrap version is missing');
  assert(!css.includes('@import'), 'CSS imports remain in bundled Pages artifact');
  assert(main.includes('import(`./runtime-main.js?v=${encodeURIComponent(assetVersion)}`)'), 'ES-module runtime bootstrap is missing');

  const moduleFiles = walk(path.join(SITE, 'override')).filter((file) => file.endsWith('.js'));
  for (const file of moduleFiles) {
    const source = read(file);
    for (const specifier of relativeModuleSpecifiers(source)) {
      assert(specifier.version === sha, `Unversioned module dependency remains in ${path.relative(SITE, file)}: ${specifier.path}`);
    }
  }
}

export function prepareArtifact(): void {
  const sha = githubSha();
  stampEntrypoint(sha);
  stampLegacyBootstrap(sha);
  bundleCss();
  stampModuleSpecifiers(sha);
  verify(sha);
}
