interface RuntimeSource {
  readonly src: string;
  readonly kind: 'classic' | 'module';
}

interface AnalyticsEvent {
  readonly 'gtm.start': number;
  readonly event: 'gtm.js';
}

interface DeliveryWindow extends Window {
  dataLayer?: AnalyticsEvent[];
}

const VERSION = '__SC_VERSION__';
const documentRoot = document;
const browser: DeliveryWindow = window;
const runtimeSources: RuntimeSource[] = [
  { src: 'js/jquery-2.1.0.min.js', kind: 'classic' },
  /*__SC_PHP_GUARD__*/
  { src: '_pages/legacy.js?v=' + VERSION, kind: 'classic' },
  { src: '_js_dev/main-legacy.js?v=' + VERSION, kind: 'classic' },
  { src: 'override/main.js?v=' + VERSION, kind: 'module' },
  { src: '_pages/shop.js?v=' + VERSION, kind: 'classic' },
];

const dataLayer = browser.dataLayer ??= [];
let imagesActivated = false;
let runtimeStarted = false;
let runtimeScheduled = false;
let pendingClick: HTMLElement | null = null;
let analyticsStarted = false;
let recaptchaStarted = false;
let layoutStable = false;
let criticalMediaStable = false;

function activateImage(image: HTMLImageElement | null): void {
  const source = image?.getAttribute('data-sc-src');
  if (!source || !image) return;
  image.removeAttribute('data-sc-src');
  try { image.fetchPriority = 'auto'; } catch { /* Compatibilidad de navegador. */ }
  image.src = source;
}

function activateFirstViewportImages(): void {
  const images = documentRoot.querySelectorAll<HTMLImageElement>('img[data-sc-first-viewport][data-sc-src]');
  images.forEach(activateImage);
}

function activateDeferredImages(): void {
  if (imagesActivated) return;
  imagesActivated = true;
  const images = Array.from(documentRoot.querySelectorAll<HTMLImageElement>('img[data-sc-src]'));
  if (!('IntersectionObserver' in browser)) {
    images.forEach(activateImage);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting || !(entry.target instanceof HTMLImageElement)) continue;
      observer.unobserve(entry.target);
      activateImage(entry.target);
    }
  }, { rootMargin: '0px' });
  images.forEach((image) => observer.observe(image));
}

function activateDesktopImages(): void {
  documentRoot.querySelectorAll<HTMLImageElement>('img[data-sc-desktop-src]').forEach((image) => {
    const source = image.getAttribute('data-sc-desktop-src');
    if (!source) return;
    image.removeAttribute('data-sc-desktop-src');
    image.src = source;
  });
}

function scheduleDesktopImages(): void {
  const desktop = browser.matchMedia('(min-width: 993px)');
  if (desktop.matches) {
    activateDesktopImages();
    return;
  }

  const onChange = (event: MediaQueryListEvent): void => {
    if (!event.matches) return;
    activateDesktopImages();
    desktop.removeEventListener('change', onChange);
  };
  desktop.addEventListener('change', onChange);
}

function releasePrepaintWhenStable(): void {
  if (!layoutStable || !criticalMediaStable) return;
  documentRoot.documentElement.classList.remove(
    'sc-catalog-prepaint',
    'sc-banner-media-ready',
    'sc-mobile-logo-ready',
  );
}

function markCriticalMediaReady(): void {
  criticalMediaStable = true;
  releasePrepaintWhenStable();
}

function waitForCriticalMedia(): void {
  const desktop = browser.matchMedia('(min-width: 993px)').matches;
  const image = desktop
    ? documentRoot.querySelector('.bannerShop .imgBannerShop')
    : documentRoot.querySelector('img[data-sc-lcp-logo="1"]');
  if (!(image instanceof HTMLImageElement) || image.complete) {
    markCriticalMediaReady();
    return;
  }
  image.addEventListener('load', markCriticalMediaReady, { once: true });
  image.addEventListener('error', markCriticalMediaReady, { once: true });
  setTimeout(markCriticalMediaReady, 1800);
}

browser.addEventListener('sc:layoutstable', () => {
  layoutStable = true;
  releasePrepaintWhenStable();
}, { once: true });

function loadStylesheet(href: string): Promise<void> {
  return new Promise((resolve) => {
    const link = documentRoot.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener('error', () => resolve(), { once: true });
    documentRoot.head.append(link);
  });
}

function loadScript(descriptor: RuntimeSource): Promise<void> {
  return new Promise((resolve) => {
    const script = documentRoot.createElement('script');
    script.src = descriptor.src;
    script.fetchPriority = 'low';
    if (descriptor.kind === 'module') script.type = 'module';
    else script.async = false;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => resolve(), { once: true });
    documentRoot.head.append(script);
  });
}

function replayPendingClick(): void {
  const target = pendingClick;
  pendingClick = null;
  if (target?.isConnected) setTimeout(() => target.click(), 0);
}

function announceRuntimeReady(): void {
  browser.dispatchEvent(new CustomEvent('sc:runtime-ready'));
  const search = documentRoot.querySelector<HTMLInputElement>('.sc-catalog-search-input');
  if (search?.value) search.dispatchEvent(new Event('input', { bubbles: true }));
  replayPendingClick();
}

async function startRuntime(): Promise<void> {
  if (runtimeStarted) return;
  runtimeStarted = true;
  await loadStylesheet('_pages/deferred.css?v=' + VERSION);
  for (const descriptor of runtimeSources) await loadScript(descriptor);
  announceRuntimeReady();
}

function scheduleRuntime(): void {
  if (runtimeScheduled) return;
  runtimeScheduled = true;
  const queue = (): void => {
    if ('requestIdleCallback' in browser) browser.requestIdleCallback(() => void startRuntime(), { timeout: 650 });
    else setTimeout(() => void startRuntime(), 70);
  };
  requestAnimationFrame(() => requestAnimationFrame(queue));
}

function boot(): void {
  const logo = documentRoot.querySelector<HTMLImageElement>('img[data-sc-lcp-logo="1"]');
  let settled = false;
  const ready = (): void => {
    if (settled) return;
    settled = true;
    activateFirstViewportImages();
    activateDeferredImages();
    scheduleDesktopImages();
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

function startAnalytics(): void {
  if (analyticsStarted) return;
  analyticsStarted = true;
  dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const script = documentRoot.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-WQPLGX9';
  documentRoot.head.append(script);
}

function startRecaptcha(): void {
  if (recaptchaStarted) return;
  recaptchaStarted = true;
  const script = documentRoot.createElement('script');
  script.async = true;
  script.defer = true;
  script.src = 'https://www.google.com/recaptcha/api.js';
  documentRoot.head.append(script);
}

waitForCriticalMedia();
if (documentRoot.readyState === 'loading') documentRoot.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();

for (const eventName of ['scroll', 'touchmove'] as const) {
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

for (const eventName of ['pointerdown', 'keydown', 'touchstart', 'focusin'] as const) {
  browser.addEventListener(eventName, () => void startRuntime(), { once: true, passive: true });
}
for (const eventName of ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const) {
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

export {};
