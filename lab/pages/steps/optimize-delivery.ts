import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, escapeRegExp, githubSha, read, write } from '../lib/core.js';

const LOCAL_RUNTIME = [
  'js/jquery-2.1.0.min.js',
  '_pages/legacy.js',
  '_js_dev/main-legacy.js',
  'override/main.js',
  '_pages/shop.js',
] as const;

const DELIVERY_LOADER = String.raw`<script type="module" id="sc-pages-delivery-loader">
const browser = window;
const documentRoot = document;
browser.dataLayer = browser.dataLayer || [];
let analyticsStarted = false;
let recaptchaStarted = false;

function activateImage(image) {
  const source = image?.getAttribute('data-sc-src');
  if (!source) return;
  image.removeAttribute('data-sc-src');
  image.src = source;
}

const lazyImages = [...documentRoot.querySelectorAll('img[data-sc-src]')];
if ('IntersectionObserver' in browser) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      activateImage(entry.target);
    }
  }, { rootMargin: '120px 0px' });
  lazyImages.forEach((image) => observer.observe(image));
} else {
  lazyImages.forEach(activateImage);
}

function startAnalytics() {
  if (analyticsStarted) return;
  analyticsStarted = true;
  browser.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const script = documentRoot.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-WQPLGX9';
  documentRoot.head.append(script);
}

function startRecaptcha() {
  if (recaptchaStarted) return;
  recaptchaStarted = true;
  const script = documentRoot.createElement('script');
  script.async = true;
  script.defer = true;
  script.src = 'https://www.google.com/recaptcha/api.js';
  documentRoot.head.append(script);
}

for (const eventName of ['pointerdown', 'keydown', 'touchstart', 'wheel']) {
  browser.addEventListener(eventName, startAnalytics, { once: true, passive: true });
}
browser.addEventListener('load', () => setTimeout(startAnalytics, 30000), { once: true });

const newsletter = documentRoot.getElementById('newsletterForm');
if (newsletter) {
  newsletter.addEventListener('focusin', startRecaptcha, { once: true });
  newsletter.addEventListener('pointerdown', startRecaptcha, { once: true, passive: true });
  if ('IntersectionObserver' in browser) {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      startRecaptcha();
    }, { rootMargin: '600px 0px' });
    observer.observe(newsletter);
  }
}
</script>`;

function ensureFontDisplay(css: string): string {
  return css.replace(/@font-face\s*\{([\s\S]*?)\}/gi, (all, body: string) =>
    /\bfont-display\s*:/i.test(body)
      ? all
      : `@font-face {${body.trimEnd()}\n  font-display: swap;\n}`,
  );
}

function rebaseCss(css: string, sourceRelative: string): string {
  const base = path.posix.dirname(sourceRelative);
  return css.replace(/url\(\s*(["']?)(.*?)\1\s*\)/gi, (full, quote: string, raw: string) => {
    const value = raw.trim();
    if (!value || /^(?:data:|[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(value)) return full;
    const match = /^([^?#]+)([?#].*)?$/.exec(value);
    if (!match) return full;
    return `url(${quote}${path.posix.normalize(path.posix.join(base, match[1]!))}${match[2] ?? ''}${quote})`;
  });
}

function replaceExactlyOnce(html: string, pattern: RegExp, replacement: string, label: string): string {
  const matches = html.match(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`)) ?? [];
  assert(matches.length === 1, `${label}: expected exactly one match, found ${matches.length}`);
  return html.replace(pattern, replacement);
}

async function inlineOrDeferRoboto(html: string): Promise<string> {
  const pattern = /<link\b(?=[^>]*\bhref=["'](https:\/\/fonts\.googleapis\.com\/css\?family=Roboto:[^"']+)["'])(?=[^>]*\brel=["']stylesheet["'])[^>]*>/i;
  const match = pattern.exec(html);
  assert(match?.[1] && match.index !== undefined, 'Roboto stylesheet was not found');
  const escapedUrl = match[1];
  const url = escapedUrl.replaceAll('&amp;', '&');

  let replacement: string;
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(6000),
    });
    assert(response.ok, `Roboto HTTP ${response.status}`);
    replacement = `<style id="sc-roboto-font-css">${ensureFontDisplay(await response.text())}</style>`;
  } catch {
    replacement = `<link rel="stylesheet" href="${escapedUrl}" media="print" onload="this.media='all'">`;
  }
  return html.slice(0, match.index) + replacement + html.slice(match.index + match[0].length);
}

function deferRuntimeScripts(html: string, sha: string): string {
  let result = html;
  for (const relativePath of LOCAL_RUNTIME) {
    const version = relativePath.startsWith('js/jquery') ? '' : `\\?v=${escapeRegExp(sha)}`;
    const pattern = new RegExp(
      `<script\\b(?=[^>]*\\bsrc=["']${escapeRegExp(relativePath)}${version}["'])(?<attrs>[^>]*)><\\/script>`,
      'i',
    );
    let matches = 0;
    result = result.replace(pattern, (tag, ...args: unknown[]) => {
      matches += 1;
      const groups = args.at(-1) as { attrs?: string } | undefined;
      const attrs = groups?.attrs ?? '';
      if (/\btype=["']module["']/i.test(attrs)) {
        return /\bfetchpriority=/i.test(attrs) ? tag : `<script${attrs} fetchpriority="low"></script>`;
      }
      return /\bdefer\b/i.test(attrs)
        ? tag
        : `<script defer fetchpriority="low"${attrs}></script>`;
    });
    assert(matches === 1, `Expected one local runtime script for ${relativePath}, found ${matches}`);
  }
  return result;
}

function wrapLegacyHandlers(html: string): string {
  const scriptPattern = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  const markers = [
    /function\s+isValidEmailAddress\s*\(\s*emailAddress\s*\)/,
    /keepSessionAlive\s*=\s*function\s*\(/,
  ];

  let result = html;
  for (const marker of markers) {
    const matches = [...result.matchAll(scriptPattern)];
    const match = matches.find((item) => marker.test(item[2] ?? ''));
    assert(match && match.index !== undefined, `Inline runtime marker was not found: ${marker.source}`);
    const replacement = `<script>document.addEventListener('DOMContentLoaded', () => {\n${match[2]}\n}, { once: true });</script>`;
    result = result.slice(0, match.index) + replacement + result.slice(match.index + match[0].length);
  }
  return result;
}

function hardLazyProductImages(html: string): readonly [html: string, count: number] {
  let seen = 0;
  const result = html.replace(
    /(<div\b[^>]*class=["'][^"']*\b(?:imgShop|imgLiquidNoFillShop)\b[^"']*["'][^>]*>\s*<img\b)([^>]*)(>)/gi,
    (full, prefix: string, originalAttributes: string, close: string) => {
      seen += 1;
      if (seen <= 4) return full;
      const source = /\s+src=["']([^"']+)["']/i.exec(originalAttributes)?.[1];
      if (!source) return full;
      const attributes = originalAttributes
        .replace(/\s+src=["'][^"']+["']/i, '')
        .replace(/\s+fetchpriority=["'][^"']+["']/gi, '')
        .concat(` data-sc-src="${source}" fetchpriority="low"`);
      return `${prefix}${attributes}${close}`;
    },
  );
  assert(seen >= 100, `Expected the catalogue product images, found only ${seen}`);
  return [result, seen];
}

function installDeliveryLoader(html: string): string {
  assert(!html.includes('id="sc-pages-delivery-loader"'), 'Pages delivery loader is already present');
  return replaceExactlyOnce(html, /<\/body>/i, `${DELIVERY_LOADER}\n</body>`, 'body close');
}

function normalizeTikTokIcon(html: string): string {
  const match = /<img\b(?=[^>]*\bsrc=["']https:\/\/www\.sushiclub\.com\.ar\/iconos\/icons8-tiktok-32\.png["'])([^>]*)>/i.exec(html);
  if (!match || match.index === undefined) return html;
  let attributes = match[1] ?? '';
  if (!/\bwidth=/i.test(attributes)) attributes += ' width="22"';
  if (!/\bheight=/i.test(attributes)) attributes += ' height="22"';
  return html.slice(0, match.index) + `<img${attributes}>` + html.slice(match.index + match[0].length);
}

function stripSourceMaps(relativePath: string): void {
  const file = path.join(SITE, relativePath);
  write(file, read(file)
    .replace(/^\s*\/\/[@#]\s*sourceMappingURL=.*$/gm, '')
    .replace(/\/\*# sourceMappingURL=[\s\S]*?\*\//g, ''));
}

export async function optimizeDelivery(): Promise<void> {
  const sha = githubSha();
  const file = path.join(SITE, 'index.html');
  const legacyCss = path.join(SITE, '_pages/legacy.css');
  const overrideCss = path.join(SITE, 'override/main.css');
  assert(fs.existsSync(legacyCss) && fs.existsSync(overrideCss), 'Bundled local stylesheets are missing');

  let html = read(file);
  const criticalCss = `<style id="sc-pages-critical-css">\n${ensureFontDisplay(rebaseCss(read(legacyCss), '_pages/legacy.css')).trimEnd()}\n${ensureFontDisplay(rebaseCss(read(overrideCss), 'override/main.css')).trimEnd()}\n</style>`;
  html = replaceExactlyOnce(
    html,
    new RegExp(`<link\\b(?=[^>]*\\brel=["']stylesheet["'])(?=[^>]*\\bhref=["']_pages/legacy\\.css\\?v=${escapeRegExp(sha)}["'])[^>]*>`, 'i'),
    criticalCss,
    'legacy stylesheet',
  );
  html = replaceExactlyOnce(
    html,
    new RegExp(`<link\\b(?=[^>]*\\brel=["']stylesheet["'])(?=[^>]*\\bhref=["']override/main\\.css\\?v=${escapeRegExp(sha)}["'])[^>]*>\\s*`, 'i'),
    '',
    'override stylesheet',
  );

  for (const asset of ['_js_dev/main-legacy.js', 'override/main.js', 'override/main.css']) {
    html = html.replace(
      new RegExp(`<link\\b(?=[^>]*\\brel=["'](?:preload|modulepreload)["'])(?=[^>]*\\bhref=["']${escapeRegExp(asset)}\\?v=${escapeRegExp(sha)}["'])[^>]*>\\s*`, 'i'),
      '',
    );
  }

  html = await inlineOrDeferRoboto(html);
  html = deferRuntimeScripts(html, sha);
  html = wrapLegacyHandlers(html);
  html = replaceExactlyOnce(html, /<script\b(?=[^>]*\bsrc=["']https:\/\/www\.google\.com\/recaptcha\/api\.js["'])[^>]*>\s*<\/script>\s*/i, '', 'reCAPTCHA bootstrap');
  html = replaceExactlyOnce(html, /<script>\s*\(function\(w,d,s,l,i\)[\s\S]*?GTM-WQPLGX9[\s\S]*?<\/script>\s*/i, '', 'GTM bootstrap');

  const [lazyHtml, productCount] = hardLazyProductImages(html);
  html = installDeliveryLoader(normalizeTikTokIcon(lazyHtml));

  for (const relativePath of ['_pages/legacy.js', '_pages/shop.js', '_js_dev/main-legacy.js', 'override/main.js']) {
    stripSourceMaps(relativePath);
  }

  assert(html.includes('id="sc-pages-critical-css"'), 'Critical local CSS was not inlined');
  assert(html.includes('browser.dataLayer = browser.dataLayer || []'), 'Deferred analytics queue bootstrap is missing');
  assert(html.split('data-sc-src=').length - 1 >= productCount - 6, 'Explicit product-image lazy loading was not applied');
  write(file, html);
}
