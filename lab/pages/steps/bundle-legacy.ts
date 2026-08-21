import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, ensureDir, escapeRegExp, githubSha, read, write } from '../lib/core.js';

type AssetKind = 'script' | 'link';

type Externalizer = () => void | Promise<void>;

interface BundleSource {
  readonly path: string;
  readonly content: string;
}

interface TagPosition {
  readonly start: number;
  readonly end: number;
}

const LEGACY_STYLES = [
  '_css_dev/font-awesome.min.css',
  '_css_dev/bootstrap.min.css',
  '_css_dev/fnt-helvlig.css',
  '_css_dev/fontBar.css',
  '_css_dev/jquery.fancybox.css',
  '_css_dev/jquery.fancybox-buttons.css',
  '_css_dev/slick.css',
  '_css_dev/slick-theme.css',
  '_css_dev/sweetalert2.min.css',
  '_css_dev/slicknav__q_dd9216b6.css',
  '_css_dev/nyroModal_wkTheme.css',
  '_css_dev/daterangepicker.css',
  '_css_dev/styles.css',
  '_css_dev/styles_newver17.css',
  'css/styles_shop__q_a48cd660.css',
  'css/_aux__q_a48cd660.css',
] as const;

const LEGACY_SCRIPTS = [
  '_js_dev/modernizr-2.6.1-respond-1.1.0.min.js',
  '_js_dev/jquery.easing.1.3.min.js',
  'js/bootstrap.min.js',
  '_js_dev/jquery.cycle2.min.js',
  '_js_dev/jquery.slicknav.js',
  '_js_dev/jquery.nyroModal.custom.js',
  '_js_dev/jquery.livequery.min.js',
  '_js_dev/jquery.fancybox.js',
  '_js_dev/jquery.fancybox-buttons.js',
  '_js_dev/jquery.fancybox-media.js',
  '_js_dev/moment.min.js',
  '_js_dev/daterangepicker.js',
  '_js_dev/imgLiquid.js',
  '_js_dev/slick.min.js',
  '_js_dev/sweetalert2.min.js',
  '_js_dev/plugins.js',
] as const;

const SHOP_SCRIPTS = [
  'js/funcionesShop__q_f352afe3.js',
  'js/main_shop__q_a48cd660.js',
] as const;

const DATE_FLOW_JS = ['_js_dev/moment.min.js', '_js_dev/daterangepicker.js'] as const;
const DATE_FLOW_CSS = ['_css_dev/daterangepicker.css'] as const;

function sourceBlockPattern(source: string): RegExp {
  return new RegExp(
    `/\\* origen: ${escapeRegExp(source)} \\*/\\n.*?(?=\\n\\n/\\* origen:|$)`,
    's',
  );
}

function scriptPattern(src: string): RegExp {
  return new RegExp(
    `<script\\b(?=[^>]*\\bsrc=["']${escapeRegExp(src)}["'])[^>]*>\\s*</script>`,
    'i',
  );
}

function linkPattern(href: string): RegExp {
  return new RegExp(`<link\\b(?=[^>]*\\bhref=["']${escapeRegExp(href)}["'])[^>]*>`, 'i');
}

function removeCommentedAsset(html: string, kind: AssetKind, asset: string): string {
  const attribute = kind === 'script' ? 'src' : 'href';
  const tail = kind === 'script' ? '[^>]*>\\s*</script>' : '[^>]*>';
  const pattern = new RegExp(
    `<!--\\s*<${kind}\\b(?=[^>]*\\b${attribute}=["']${escapeRegExp(asset)}["'])${tail}\\s*-->`,
    'ig',
  );
  return html.replace(pattern, '');
}

function rebaseCssUrls(source: string, bundle: string, content: string): string {
  return content.replace(
    /url\(\s*(["']?)(.*?)\1\s*\)/gi,
    (whole: string, quote: string, value: string) => {
      const raw = value.trim();
      if (!raw || /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(raw)) return whole;

      const match = /^([^?#]+)([?#].*)?$/.exec(raw);
      if (!match) return whole;
      const assetPath = match[1];
      if (!assetPath) return whole;

      const resolved = path.normalize(path.join(path.dirname(source), assetPath));
      const rebased = path.relative(path.dirname(bundle), resolved).split(path.sep).join('/');
      return `url(${quote}${rebased}${match[2] ?? ''}${quote})`;
    },
  );
}

function normalizeFontAwesome(content: string): string {
  const face = /@font-face\s*\{\s*font-family\s*:\s*['"]FontAwesome['"].*?\}/is;
  assert(face.test(content), 'Could not normalize Font Awesome @font-face exactly once');
  return content.replace(
    face,
    "@font-face{font-family:'FontAwesome';src:url('../fonts/fontawesome-webfont__q_fb3a7b16.woff2') format('woff2');font-weight:normal;font-style:normal;font-display:swap}",
  );
}

function normalizeSlickFont(content: string): string {
  const face = /@font-face\s*\{\s*font-family\s*:\s*['"]slick['"].*?\}/is;
  assert(face.test(content), 'Could not remove Slick @font-face');
  const withoutFace = content.replace(face, '');
  const normalized = withoutFace.replace(
    /font-family\s*:\s*['"]slick['"]\s*;/gi,
    'font-family: Arial, sans-serif;',
  );
  assert(normalized !== withoutFace, 'No Slick pseudo-element font declarations were normalized');
  return normalized;
}

function normalizeLegacyFonts(source: string, content: string): string {
  if (source === '_css_dev/font-awesome.min.css') return normalizeFontAwesome(content);
  if (source === '_css_dev/slick-theme.css') return normalizeSlickFont(content);
  return content;
}

function readStylesheetSource(relativePath: string, bundle: string): BundleSource {
  const source = path.join(SITE, relativePath);
  assert(fs.existsSync(source), `Missing legacy stylesheet: ${relativePath}`);

  let content = read(source).replace(/^\s*@charset\s+["'][^"']+["'];\s*/i, '');
  assert(!/@import\b/i.test(content), `Nested @import in ${relativePath}`);
  content = normalizeLegacyFonts(relativePath, content);
  return {
    path: relativePath,
    content: rebaseCssUrls(source, bundle, content),
  };
}

function readScriptSource(relativePath: string): BundleSource {
  const source = path.join(SITE, relativePath);
  assert(fs.existsSync(source), `Missing legacy script: ${relativePath}`);
  const content = read(source);
  assert(
    !/\bdocument\.currentScript\b|\bimport\.meta\b/.test(content),
    `Per-file semantics in ${relativePath}`,
  );
  return { path: relativePath, content };
}

function sourceComment(source: BundleSource): string {
  return `/* origen: ${source.path} */\n${source.content.trimEnd()}`;
}

function scriptSourceComment(source: BundleSource): string {
  return `${sourceComment(source)}\n;`;
}

function activeStylesheetTag(html: string, href: string): string {
  const pattern = linkPattern(href);
  const matches = html.match(new RegExp(pattern.source, 'ig')) ?? [];
  assert(matches.length === 1, `Expected one active stylesheet tag for ${href}, found ${matches.length}`);
  const tag = matches[0] ?? '';
  assert(/\brel=["']stylesheet["']/i.test(tag), `Non-stylesheet link matched for ${href}`);
  const media = tag.match(/\bmedia=["']([^"']+)["']/i)?.[1];
  assert(!media || media.trim().toLowerCase() === 'all', `Cannot bundle ${href} with media=${media}`);
  return tag;
}

function activeScriptTag(html: string, src: string): string {
  const pattern = scriptPattern(src);
  const matches = html.match(new RegExp(pattern.source, 'ig')) ?? [];
  assert(matches.length === 1, `Expected one active script for ${src}, found ${matches.length}`);
  const tag = matches[0] ?? '';
  assert(!/\b(?:async|defer)\b/i.test(tag), `Cannot bundle async/defer script ${src}`);
  const type = tag.match(/\btype=["']([^"']+)["']/i)?.[1]?.trim().toLowerCase();
  assert(
    !type || type === 'text/javascript' || type === 'application/javascript',
    `Unsupported script type for ${src}`,
  );
  return tag;
}

export function bundleLegacyCss(): void {
  const sha = githubSha();
  const indexFile = path.join(SITE, 'index.html');
  const bundleFile = path.join(SITE, '_pages', 'legacy.css');
  let html = read(indexFile);
  const output: string[] = [];

  for (const href of LEGACY_STYLES) html = removeCommentedAsset(html, 'link', href);

  LEGACY_STYLES.forEach((href, position) => {
    activeStylesheetTag(html, href);
    output.push(sourceComment(readStylesheetSource(href, bundleFile)));
    html = html.replace(
      linkPattern(href),
      position === 0
        ? `<link href="_pages/legacy.css?v=${sha}" rel="stylesheet" media="all" type="text/css">`
        : '',
    );
  });

  ensureDir(path.dirname(bundleFile));
  write(bundleFile, `${output.join('\n\n')}\n`);
  write(indexFile, html);

  assert(html.split(`_pages/legacy.css?v=${sha}`).length - 1 === 1, 'Legacy CSS bundle link must appear exactly once');
  const bundle = read(bundleFile);
  assert((bundle.match(/^\/\* origen:/gm) ?? []).length === LEGACY_STYLES.length, 'Legacy CSS source count mismatch');
  assert(!/fontawesome-webfont\.(?:eot|ttf|svg)|fontawesome-webfont\.woff\?/i.test(bundle), 'Obsolete Font Awesome fallbacks remain');
  assert(!/url\([^)]*fonts\/slick\.(?:eot|woff|ttf|svg)/i.test(bundle), 'Missing Slick font URLs remain');
  assert(bundle.includes("font-family:'FontAwesome'") && bundle.includes('font-display:swap'), 'Font Awesome must use font-display:swap');
}

export function bundleLegacyJs(): void {
  const sha = githubSha();
  const indexFile = path.join(SITE, 'index.html');
  const bundleFile = path.join(SITE, '_pages', 'legacy.js');
  let html = read(indexFile);
  const output: string[] = [];

  for (const src of LEGACY_SCRIPTS) html = removeCommentedAsset(html, 'script', src);

  LEGACY_SCRIPTS.forEach((src, position) => {
    activeScriptTag(html, src);
    output.push(scriptSourceComment(readScriptSource(src)));
    html = html.replace(
      scriptPattern(src),
      position === 0 ? `<script src="_pages/legacy.js?v=${sha}" type="text/javascript"></script>` : '',
    );
  });

  ensureDir(path.dirname(bundleFile));
  write(bundleFile, `${output.join('\n\n')}\n`);
  write(indexFile, html);
  assert((read(bundleFile).match(/^\/\* origen:/gm) ?? []).length === LEGACY_SCRIPTS.length, 'Legacy JS source count mismatch');
}

function pruneSourceBlock(file: string, source: string): void {
  const pattern = sourceBlockPattern(source);
  const text = read(file);
  assert(pattern.test(text), `Expected bundled source block for ${source}`);
  write(file, text.replace(pattern, `/* origen: ${source} (omitido: flujo de fecha inactivo) */`));
}

function dateFlowPresent(html: string): boolean {
  return /\bid=["']dateInit["']/i.test(html) || /\bshopfunc_(?:start|submit)_init\s*\(/.test(html);
}

function shopPositions(html: string): TagPosition[] {
  return SHOP_SCRIPTS.map((src) => {
    const match = scriptPattern(src).exec(html);
    assert(match, `Missing shop script ${src}`);
    return { start: match.index, end: match.index + match[0].length };
  });
}

function normalizeShopSource(source: BundleSource, hasDateFlow: boolean): BundleSource {
  if (hasDateFlow || source.path !== 'js/main_shop__q_a48cd660.js') return source;

  const normalized = source.content.replace(
    /^([\t ]*)moment\.locale\(\s*['"]es['"]\s*\);\s*$/m,
    "$1if (window.moment) moment.locale('es');",
  );
  assert(normalized !== source.content, 'Expected one moment.locale call');
  return { ...source, content: normalized };
}

export async function bundleShopJs(externalize: Externalizer): Promise<void> {
  const sha = githubSha();
  const indexFile = path.join(SITE, 'index.html');
  const bundleFile = path.join(SITE, '_pages', 'shop.js');
  const legacyJs = path.join(SITE, '_pages', 'legacy.js');
  const legacyCss = path.join(SITE, '_pages', 'legacy.css');
  let html = read(indexFile);
  const output: string[] = [];
  const hasDateFlow = dateFlowPresent(html);
  const positions = shopPositions(html);

  const first = positions[0];
  const second = positions[1];
  assert(first && second, 'Shop script positions are incomplete');
  assert(!/\S/.test(html.slice(first.end, second.start)), 'Unexpected markup between shop scripts');

  SHOP_SCRIPTS.forEach((src, position) => {
    activeScriptTag(html, src);
    const source = normalizeShopSource(readScriptSource(src), hasDateFlow);
    output.push(scriptSourceComment(source));
    html = html.replace(
      scriptPattern(src),
      position === 0 ? `<script src="_pages/shop.js?v=${sha}" type="text/javascript"></script>` : '',
    );
  });

  ensureDir(path.dirname(bundleFile));
  write(bundleFile, `${output.join('\n\n')}\n`);
  write(indexFile, html);

  if (!hasDateFlow) {
    DATE_FLOW_JS.forEach((source) => pruneSourceBlock(legacyJs, source));
    DATE_FLOW_CSS.forEach((source) => pruneSourceBlock(legacyCss, source));
  }

  assert((read(bundleFile).match(/^\/\* origen:/gm) ?? []).length === SHOP_SCRIPTS.length, 'Shop JS source count mismatch');
  await externalize();
}
