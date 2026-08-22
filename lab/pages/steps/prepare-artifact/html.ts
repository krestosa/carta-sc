import { assert, replaceRegexOnce } from '../../lib/core.js';
import { pruneUnusedMaps } from './maps.js';

interface RuntimeAssets {
  readonly bootstrap: string;
  readonly legacyRuntime: string;
  readonly overrideStyle: string;
  readonly overrideModule: string;
}

function runtimeAssets(sha: string): RuntimeAssets {
  return {
    bootstrap: `_js_dev/main.js?v=${sha}`,
    legacyRuntime: `_js_dev/main-legacy.js?v=${sha}`,
    overrideStyle: `override/main.css?v=${sha}`,
    overrideModule: `override/main.js?v=${sha}`,
  };
}

function preloadHints(assets: RuntimeAssets): string {
  return [
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    `<link rel="preload" as="script" href="${assets.legacyRuntime}">`,
    `<link rel="preload" as="style" href="${assets.overrideStyle}">`,
    `<link rel="modulepreload" href="${assets.overrideModule}">`,
  ].join('\n');
}

function stampBootstrapReference(html: string, assets: RuntimeAssets): string {
  const stamped = replaceRegexOnce(
    html,
    /_js_dev\/main\.js\?v=[^"']+/,
    assets.bootstrap,
    'Could not rewrite the main.js entrypoint exactly once',
  );

  const entry = new RegExp(
    `(?<tag><script\\s+src=["']${assets.bootstrap.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*><\\/script>)`,
    'i',
  );
  const match = entry.exec(stamped);
  assert(match?.groups?.tag && match.index !== undefined, 'Could not inject override preload hints exactly once');

  return `${stamped.slice(0, match.index)}${preloadHints(assets)}\n${match.groups.tag}${stamped.slice(match.index + match[0].length)}`;
}

function addFontCrossorigin(html: string): string {
  let count = 0;
  const result = html.replace(
    /(?<tag><link\s+rel="preload"\s+href="fuentes\/AcuminPro-(?:Regular|Semibold)\.woff2"\s+as="font"\s+type="font\/woff2")(?<end>>)/gi,
    (_all: string, tag: string, end: string) => {
      count += 1;
      return `${tag} crossorigin${end}`;
    },
  );
  assert(count === 2, `Expected two Acumin font preloads, found ${count}`);
  return result;
}

function prioritizeCatalogueBanner(html: string): string {
  const banner = /<img\b(?=[^>]*\bclass="[^"]*\bimgBannerShop\b[^"]*")(?<attrs>[^>]*)>/i.exec(html);
  assert(banner?.groups?.attrs && banner.index !== undefined, 'Expected one catalogue banner image, found 0');

  const attributes = banner.groups.attrs
    .replace(/\s+(?:loading|decoding|fetchpriority)="[^"]*"/gi, '')
    .concat(' loading="eager" decoding="async" fetchpriority="high"');
  return `${html.slice(0, banner.index)}<img${attributes}>${html.slice(banner.index + banner[0].length)}`;
}

function enableNativeProductLazyLoading(html: string): string {
  let productImageCount = 0;
  const result = html.replace(
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
  return result;
}

export function prepareDocument(html: string, sha: string): string {
  const assets = runtimeAssets(sha);
  let result = stampBootstrapReference(html, assets);
  result = addFontCrossorigin(result);
  result = prioritizeCatalogueBanner(result);
  result = enableNativeProductLazyLoading(result);
  return pruneUnusedMaps(result);
}

export function verifyPreparedDocument(html: string, sha: string): void {
  const assets = runtimeAssets(sha);
  assert(html.includes(assets.bootstrap), 'Stamped main.js entrypoint is missing');
  assert(html.includes(assets.legacyRuntime), 'Legacy runtime preload is missing');
  assert(html.includes(assets.overrideStyle), 'Override stylesheet preload is missing');
  assert(html.includes(`rel="modulepreload" href="${assets.overrideModule}"`), 'Override modulepreload is missing');
  assert(!html.includes('cdn.jsdelivr.net'), 'Obsolete jsDelivr connection hint remains');

  for (const origin of ['https://fonts.googleapis.com', 'https://fonts.gstatic.com']) {
    assert(html.includes(`rel="preconnect" href="${origin}"`), `Preconnect hint is missing for ${origin}`);
  }

  assert(
    (html.match(/<link\s+rel="preload"\s+href="fuentes\/AcuminPro-(?:Regular|Semibold)\.woff2"\s+as="font"\s+type="font\/woff2"\s+crossorigin>/gi) ?? []).length === 2,
    'Acumin font preloads must include crossorigin',
  );
  assert(
    /<img\b(?=[^>]*\bclass="[^"]*\bimgBannerShop\b[^"]*")(?=[^>]*\bloading="eager")(?=[^>]*\bdecoding="async")(?=[^>]*\bfetchpriority="high")[^>]*>/i.test(html),
    'Catalogue banner must be eager, async-decoded and high priority',
  );
  assert(html.includes('loading="lazy"') && html.includes('decoding="async"'), 'Native lazy product image attributes are missing');
  assert(!html.includes('maps.googleapis.com/maps/api/js'), 'Unused Google Maps API runtime remains');
  assert(!html.includes('_js_dev/mapKrc.js'), 'Unused mapKrc runtime remains');
  assert(!html.includes('js/main_shop_maps__q_9fc895e1.js'), 'Unused shop maps runtime remains');
}
