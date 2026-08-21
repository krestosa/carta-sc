import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, escapeRegExp, read } from '../../lib/core.js';

const DELIVERY_LOADER_ID = 'sc-pages-delivery-loader';
const PHP_GUARD_SLOT = '/*__SC_PHP_GUARD__*/';

function loaderSource(sha: string): string {
  return String.raw`<script type="module" id="${DELIVERY_LOADER_ID}">
const VERSION = '${sha}';
const documentRoot = document;
const browser = window;
const runtimeSources = [
  { src: 'js/jquery-2.1.0.min.js', kind: 'classic' },
  ${PHP_GUARD_SLOT}
  { src: '_pages/legacy.js?v=' + VERSION, kind: 'classic' },
  { src: '_js_dev/main-legacy.js?v=' + VERSION, kind: 'classic' },
  { src: 'override/main.js?v=' + VERSION, kind: 'module' },
  { src: '_pages/shop.js?v=' + VERSION, kind: 'classic' },
];

browser.dataLayer = browser.dataLayer || [];
let imagesActivated = false;
let runtimeStarted = false;
let runtimeScheduled = false;
let pendingClick = null;
let analyticsStarted = false;
let recaptchaStarted = false;

function activateImage(image) {
  const source = image?.getAttribute('data-sc-src');
  if (!source) return;
  image.removeAttribute('data-sc-src');
  try { image.fetchPriority = 'auto'; } catch {}
  image.src = source;
}

function activateDeferredImages() {
  if (imagesActivated) return;
  imagesActivated = true;
  const images = [...documentRoot.querySelectorAll('img[data-sc-src]')];
  if (!('IntersectionObserver' in browser)) {
    images.forEach(activateImage);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      activateImage(entry.target);
    }
  }, { rootMargin: '0px' });
  images.forEach((image) => observer.observe(image));
}

function loadStylesheet(href) {
  return new Promise((resolve) => {
    const link = documentRoot.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.addEventListener('load', resolve, { once: true });
    link.addEventListener('error', resolve, { once: true });
    documentRoot.head.append(link);
  });
}

function loadScript(descriptor) {
  return new Promise((resolve) => {
    const script = documentRoot.createElement('script');
    script.src = descriptor.src;
    script.fetchPriority = 'low';
    if (descriptor.kind === 'module') script.type = 'module';
    else script.async = false;
    script.addEventListener('load', resolve, { once: true });
    script.addEventListener('error', resolve, { once: true });
    documentRoot.head.append(script);
  });
}

function replayPendingClick() {
  const target = pendingClick;
  pendingClick = null;
  if (target?.isConnected) setTimeout(() => target.click(), 0);
}

function announceRuntimeReady() {
  browser.dispatchEvent(new CustomEvent('sc:runtime-ready'));
  const search = documentRoot.querySelector('.sc-catalog-search-input');
  if (search?.value) search.dispatchEvent(new Event('input', { bubbles: true }));
  replayPendingClick();
}

async function startRuntime() {
  if (runtimeStarted) return;
  runtimeStarted = true;
  await loadStylesheet('_pages/deferred.css?v=' + VERSION);
  for (const descriptor of runtimeSources) await loadScript(descriptor);
  announceRuntimeReady();
}

function scheduleRuntime() {
  if (runtimeScheduled) return;
  runtimeScheduled = true;
  const queue = () => {
    if ('requestIdleCallback' in browser) browser.requestIdleCallback(() => void startRuntime(), { timeout: 650 });
    else setTimeout(() => void startRuntime(), 70);
  };
  requestAnimationFrame(() => requestAnimationFrame(queue));
}

function boot() {
  const logo = documentRoot.querySelector('img[data-sc-lcp-logo="1"]');
  let settled = false;
  const ready = () => {
    if (settled) return;
    settled = true;
    activateDeferredImages();
    scheduleRuntime();
  };

  if (logo && !logo.complete) {
    logo.addEventListener('load', ready, { once: true });
    logo.addEventListener('error', ready, { once: true });
    setTimeout(ready, 1800);
  } else {
    ready();
  }
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

if (documentRoot.readyState === 'loading') documentRoot.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();

for (const eventName of ['scroll', 'touchmove']) {
  browser.addEventListener(eventName, activateDeferredImages, { once: true, passive: true });
}

const interactiveSelectors = '.sc-catalog-view-toggle,.sc-theme-toggle,.sc-theme-option';
documentRoot.addEventListener('click', (event) => {
  if (runtimeStarted) return;
  const origin = event.target instanceof Element ? event.target : null;
  const target = origin?.closest(interactiveSelectors);
  if (!(target instanceof HTMLElement)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  pendingClick = target;
  void startRuntime();
}, { capture: true });

for (const eventName of ['pointerdown', 'keydown', 'touchstart', 'focusin']) {
  browser.addEventListener(eventName, () => void startRuntime(), { once: true, passive: true });
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
}

export function injectLoader(html: string, sha: string): string {
  const pattern = new RegExp(`<script\\b[^>]*\\bid=["']${DELIVERY_LOADER_ID}["'][^>]*>[\\s\\S]*?<\\/script>`, 'i');
  assert(pattern.test(html), 'existing delivery loader missing');
  return html.replace(pattern, loaderSource(sha));
}

export function verify(
  html: string,
  sha: string,
  productImageCount: number,
  criticalBytes: number,
  deferredBytes: number,
): void {
  const active = html.replace(/<!--[\s\S]*?-->/g, '');
  assert(criticalBytes < 450_000 && deferredBytes >= 30_000 && fs.existsSync(path.join(SITE, '_pages/deferred.css')), 'CSS split budget failed');
  assert(!/<script\b[^>]*src=/i.test(active), 'initial external script remains');
  assert(html.split('data-sc-src=').length - 1 >= productImageCount, 'product hard-lazy incomplete');
  assert(!/data-sc-lcp-product=/i.test(html), 'stale product LCP promotion remains');
  assert(/<section\b[^>]*class=["'][^"']*\bsc-catalog-tools\b[^>]*data-sc-static-shell=/i.test(html), 'static catalog tools shell missing');
  assert(html.includes('sc-trait-reference-placeholder'), 'catalog trait-row reservation missing');
  assert(html.includes(`{ src: 'override/main.js?v=' + VERSION, kind: 'module' }`), 'override runtime must load as an ES module');
  assert(html.includes(PHP_GUARD_SLOT), 'PHP guard injection slot is missing');
  assert(!html.includes('__scRuntimeReady') && !html.includes('__scAfterRuntime'), 'legacy runtime readiness globals remain');

  const logo = new RegExp(
    `<img\\b(?=[^>]*data-sc-lcp-logo=["']1["'])(?=[^>]*src=["']_critical-media/mobile-logo\\.png\\?v=${escapeRegExp(sha)}["'])[^>]*>`,
    'i',
  ).exec(html);
  assert(logo, 'same-origin mobile LCP logo missing');
  assert(/loading=["']eager["']/i.test(logo[0]) && /fetchpriority=["']high["']/i.test(logo[0]), 'mobile LCP logo lost eager/high priority');
  assert(!/\b(?:margin-left|transform)\s*:/i.test(logo[0]), 'late-mutating mobile logo geometry remains');
  assert(
    new RegExp(
      `<link\\b(?=[^>]*rel=["']preload["'])(?=[^>]*href=["']_critical-media/mobile-logo\\.png\\?v=${escapeRegExp(sha)}["'])(?=[^>]*fetchpriority=["']high["'])[^>]*>`,
      'i',
    ).test(html),
    'same-origin mobile logo preload missing',
  );
  assert(fs.existsSync(path.join(SITE, '_critical-media/mobile-logo.png')), 'mirrored mobile logo file missing');

  const shop = read(path.join(SITE, '_pages/shop.js'));
  const legacy = read(path.join(SITE, '_pages/legacy.js'));
  assert(!shop.includes('.imgLiquid(') && !shop.includes('shop_imgLiquids') && !shop.includes('Knormalize(') && !legacy.includes('function Knormalize'), 'legacy catalog runtime remains');
  assert(!read(path.join(SITE, 'override/main.js')).includes('cetAttribute'), 'broken override call remains');
}

export { PHP_GUARD_SLOT };
