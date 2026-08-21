import path from 'node:path';
import { SITE, assert, escapeRegExp, write } from '../../lib/core.js';

export interface CssSplitResult {
  readonly html: string;
  readonly criticalBytes: number;
  readonly deferredBytes: number;
}

interface CssSourceChunk {
  readonly name: string;
  readonly content: string;
}

const LEGACY_CRITICAL = new Set([
  '_css_dev/bootstrap.min.css',
  '_css_dev/fnt-helvlig.css',
  '_css_dev/fontBar.css',
  '_css_dev/slicknav__q_dd9216b6.css',
  '_css_dev/styles.css',
  '_css_dev/styles_newver17.css',
  'css/styles_shop__q_a48cd660.css',
  'css/_aux__q_a48cd660.css',
]);

const OVERRIDE_CRITICAL = new Set([
  './core/variables.css',
  './core/theme.css',
  './core/a11y.css',
  './features/catalog/catalog.css',
  './components/category-nav/desktop.css',
  './components/category-nav/mobile.css',
  './components/category-nav/controls.css',
  './core/prepaint.css',
  './core/performance.css',
  './core/no-loading-state.css',
  './components/product-card/image-ratio.css',
  './features/catalog/layout.css',
  './components/section-heading/layout.css',
  './components/product-card/layout.css',
  './components/product-card/content.css',
  './components/product-card/pricing.css',
  './components/catalog-tools/catalog-tools.css',
  './components/catalog-tools/theme.css',
  './components/catalog-tools/view-stability.css',
  './components/section-heading/section-heading.css',
  './components/section-heading/responsive.css',
  './components/mobile-header/mobile-header.css',
  './components/mobile-header/state-icon.css',
  './components/category-nav/compatibility.css',
  './features/image-preloader/image-preloader.css',
]);

const CSS_SOURCE_MARKER = /^\/\* origen: (?<name>.*?) \*\/\s*/gm;
const GOOGLE_FONT_PRECONNECT = /<link\b(?=[^>]*rel=["']preconnect["'])(?=[^>]*href=["']https:\/\/fonts\.(?:googleapis|gstatic)\.com\/?["'])[^>]*>\s*/gi;

function minifyCss(css: string): string {
  return css
    .replace(/\/\*(?!\!)[\s\S]*?\*\//g, '')
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
}

function rebaseDeferredUrls(css: string): string {
  return css.replace(
    /url\(\s*(?<quote>["']?)(?<value>.*?)(?:\k<quote>)\s*\)/gi,
    (full, ...args: unknown[]) => {
      const groups = args.at(-1) as { quote?: string; value?: string } | undefined;
      const value = (groups?.value ?? '').trim();
      const quote = groups?.quote ?? '';
      if (!value || /^(?:data:|[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(value)) return full;

      const match = /^(?<path>[^?#]+)(?<suffix>[?#].*)?$/.exec(value);
      const assetPath = match?.groups?.path;
      if (!assetPath) return full;

      const rebased = path.posix.normalize(path.posix.join('..', assetPath));
      return `url(${quote}${rebased}${match.groups?.suffix ?? ''}${quote})`;
    },
  );
}

function cssSourceChunks(css: string): CssSourceChunk[] {
  const markers = [...css.matchAll(CSS_SOURCE_MARKER)];
  assert(markers.length > 0, 'CSS source markers missing');

  return markers.map((marker, index) => {
    assert(marker.index !== undefined, 'CSS source marker index missing');
    const next = markers[index + 1];
    const end = next?.index ?? css.length;
    const rawName = marker.groups?.name ?? '';
    return {
      name: rawName.replace(/\s+\(omitido:.*?\)$/, ''),
      content: css.slice(marker.index, end),
    };
  });
}

function isCriticalSource(name: string): boolean {
  return LEGACY_CRITICAL.has(name) || OVERRIDE_CRITICAL.has(name);
}

function lowPriorityFontPreloads(html: string): string {
  return html.replace(
    /(<link\b(?=[^>]*rel=["']preload["'])(?=[^>]*AcuminPro-(?:Regular|Semibold)\.woff2)(?<attrs>[^>]*))>/gi,
    (_all, prefix: string, ...args: unknown[]) => {
      const groups = args.at(-1) as { attrs?: string } | undefined;
      return `${prefix}${groups?.attrs && /fetchpriority=/i.test(groups.attrs) ? '' : ' fetchpriority="low"'}>`;
    },
  );
}

export function splitCss(html: string): CssSplitResult {
  const criticalPattern = /<style id="sc-pages-critical-css">(?<css>[\s\S]*?)<\/style>/i;
  const criticalMatch = criticalPattern.exec(html);
  assert(criticalMatch?.groups?.css && criticalMatch.index !== undefined, 'current critical CSS block missing');

  const critical: string[] = [];
  const deferred: string[] = [];
  for (const chunk of cssSourceChunks(criticalMatch.groups.css)) {
    if (isCriticalSource(chunk.name)) critical.push(chunk.content);
    else deferred.push(rebaseDeferredUrls(chunk.content));
  }

  const roboto = /<style id="sc-roboto-font-css">(?<css>[\s\S]*?)<\/style>\s*/i.exec(html);
  if (roboto?.groups?.css) deferred.push(roboto.groups.css);

  const criticalCss = minifyCss(critical.join('\n'));
  const deferredCss = minifyCss(deferred.join('\n'));
  write(path.join(SITE, '_pages', 'deferred.css'), `${deferredCss}\n`);

  let result = `${html.slice(0, criticalMatch.index)}<style id="sc-pages-critical-css">${criticalCss}</style>${html.slice(criticalMatch.index + criticalMatch[0].length)}`;
  if (roboto?.index !== undefined) {
    result = `${result.slice(0, roboto.index)}${result.slice(roboto.index + roboto[0].length)}`;
  }
  result = result.replace(GOOGLE_FONT_PRECONNECT, '');
  result = lowPriorityFontPreloads(result);

  return {
    html: result,
    criticalBytes: criticalCss.length,
    deferredBytes: deferredCss.length,
  };
}

export function criticalMedia(html: string): string {
  const mobileLogo = 'https://www.sushiclub.com.ar/gfx/web-sushiclub2_black_m2.png';
  let result = html.replace(
    new RegExp(`<link\\b(?=[^>]*rel=["']preload["'])(?=[^>]*as=["']image["'])(?=[^>]*href=["']${escapeRegExp(mobileLogo)}["'])[^>]*>\\s*`, 'i'),
    '',
  );

  const bannerPreload = /(<link\b(?=[^>]*rel=["']preload["'])(?=[^>]*as=["']image["'])(?=[^>]*banner_shop)[^>]*)(>)/i.exec(result);
  if (bannerPreload?.index !== undefined && !/media=/i.test(bannerPreload[1] ?? '')) {
    const prefix = bannerPreload[1] ?? '';
    const close = bannerPreload[2] ?? '>';
    const replacement = `${prefix} media="(min-width: 993px)"${close}`;
    result = `${result.slice(0, bannerPreload.index)}${replacement}${result.slice(bannerPreload.index + bannerPreload[0].length)}`;
  }

  const bannerImage = /(<img\b(?=[^>]*class=["'][^"']*\bimgBannerShop\b[^"']*["'])(?<attrs>[^>]*))>/i.exec(result);
  if (bannerImage?.groups?.attrs && bannerImage.index !== undefined) {
    const attributes = `${bannerImage.groups.attrs.replace(/\s+fetchpriority=["'][^"']*["']/gi, '')} fetchpriority="auto"`;
    const replacement = `<img${attributes}>`;
    result = `${result.slice(0, bannerImage.index)}${replacement}${result.slice(bannerImage.index + bannerImage[0].length)}`;
  }

  return result;
}
