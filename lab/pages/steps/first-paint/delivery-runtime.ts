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

interface FirstViewportEntry {
  readonly image: HTMLImageElement;
  readonly stage: HTMLElement;
  readonly card: HTMLElement;
  readonly top: number;
  readonly left: number;
}

const VERSION = '__SC_VERSION__';
const documentRoot = document;
const browser: DeliveryWindow = window;
const FIRST_VIEWPORT_PULSE_MS = 1500;
const FIRST_VIEWPORT_ROW_DELAY_MS = 200;
const FIRST_VIEWPORT_COLUMN_DELAY_MS = 100;
const FIRST_VIEWPORT_ROW_TOLERANCE_PX = 4;
const runtimeSources: RuntimeSource[] = [
  { src: 'js/jquery-2.1.0.min.js', kind: 'classic' },
  /*__SC_PHP_GUARD__*/
  { src: '_pages/legacy.js?v=' + VERSION, kind: 'classic' },
  { src: '_js_dev/main-legacy.js?v=' + VERSION, kind: 'classic' },
  { src: 'override/main.js?v=' + VERSION, kind: 'module' },
  { src: '_pages/shop.js?v=' + VERSION, kind: 'classic' },
];

class DeliveryRuntimeController {
  readonly #dataLayer = browser.dataLayer ??= [];

  #imagesActivated = false;
  #runtimeStarted = false;
  #runtimeScheduled = false;
  #pendingClick: HTMLElement | null = null;
  #analyticsStarted = false;
  #recaptchaStarted = false;
  #layoutStable = false;
  #criticalMediaStable = false;

  start(): void {
    this.#waitForCriticalMedia();
    browser.addEventListener('sc:layoutstable', this.#onLayoutStable, { once: true });

    if (documentRoot.readyState === 'loading') {
      documentRoot.addEventListener('DOMContentLoaded', this.#boot, { once: true });
    } else {
      this.#boot();
    }

    for (const eventName of ['scroll', 'touchmove'] as const) {
      browser.addEventListener(eventName, this.#activateDeferredImages, { once: true, passive: true });
    }
    documentRoot.addEventListener('click', this.#onPreRuntimeClick, { capture: true });

    for (const eventName of ['pointerdown', 'keydown', 'touchstart', 'focusin'] as const) {
      browser.addEventListener(eventName, this.#startRuntimeOnInteraction, { once: true, passive: true });
    }
    for (const eventName of ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const) {
      browser.addEventListener(eventName, this.#startAnalytics, { once: true, passive: true });
    }
    browser.addEventListener('load', this.#scheduleAnalyticsFallback, { once: true });
    this.#installRecaptchaActivation();
  }

  #activateImage(image: HTMLImageElement | null): void {
    const source = image?.getAttribute('data-sc-src');
    if (!source || !image) return;
    image.removeAttribute('data-sc-src');
    try { image.fetchPriority = 'auto'; } catch { /* Compatibilidad de navegador. */ }
    image.src = source;
  }

  #isInViewport(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    return rect.width > 0
      && rect.height > 0
      && rect.bottom > 0
      && rect.top < browser.innerHeight
      && rect.right > 0
      && rect.left < browser.innerWidth;
  }

  #firstViewportEntries(images: readonly HTMLImageElement[]): FirstViewportEntry[] {
    const entries: FirstViewportEntry[] = [];
    for (const image of images) {
      const stage = image.closest<HTMLElement>('.imgShop,.imgLiquidNoFillShop');
      const card = image.closest<HTMLElement>('.productoShop');
      if (!stage || !card || !this.#isInViewport(card)) continue;
      const rect = card.getBoundingClientRect();
      entries.push({ image, stage, card, top: rect.top, left: rect.left });
    }
    return entries.sort((left, right) => (
      Math.abs(left.top - right.top) > FIRST_VIEWPORT_ROW_TOLERANCE_PX
        ? left.top - right.top
        : left.left - right.left
    ));
  }

  #primeFirstViewportSkeletons(entries: readonly FirstViewportEntry[]): void {
    if (!entries.length) return;
    documentRoot.documentElement.classList.add('sc-image-preloader-active');

    let row = -1;
    let rowTop = Number.NEGATIVE_INFINITY;
    let column = 0;
    const clock = performance.now() % FIRST_VIEWPORT_PULSE_MS;

    for (const entry of entries) {
      if (row < 0 || Math.abs(entry.top - rowTop) > FIRST_VIEWPORT_ROW_TOLERANCE_PX) {
        row += 1;
        rowTop = entry.top;
        column = 0;
      }

      const delay = row * FIRST_VIEWPORT_ROW_DELAY_MS + column * FIRST_VIEWPORT_COLUMN_DELAY_MS;
      const phase = `${-clock + delay}ms`;
      entry.stage.classList.add('sc-image-loading', 'sc-image-active');
      entry.card.classList.add('sc-card-placeholder-loading', 'sc-card-placeholder-active');
      entry.stage.style.setProperty('--sc-image-preloader-phase', phase);
      entry.card.style.setProperty('--sc-image-preloader-phase', phase);
      column += 1;
    }
  }

  #activateFirstViewportImages(): void {
    const images = Array.from(
      documentRoot.querySelectorAll<HTMLImageElement>('img[data-sc-first-viewport][data-sc-src]'),
    );
    const entries = this.#firstViewportEntries(images);
    this.#primeFirstViewportSkeletons(entries);
    entries.forEach(({ image }) => this.#activateImage(image));
  }

  #activateDeferredImages = (): void => {
    if (this.#imagesActivated) return;
    this.#imagesActivated = true;
    const images = Array.from(documentRoot.querySelectorAll<HTMLImageElement>('img[data-sc-src]'));
    if (!('IntersectionObserver' in browser)) {
      images.forEach((image) => {
        if (this.#isInViewport(image)) this.#activateImage(image);
      });
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || !(entry.target instanceof HTMLImageElement)) continue;
        observer.unobserve(entry.target);
        this.#activateImage(entry.target);
      }
    }, { rootMargin: '0px' });
    images.forEach((image) => observer.observe(image));
  };

  #activateDesktopImages(): void {
    documentRoot.querySelectorAll<HTMLImageElement>('img[data-sc-desktop-src]').forEach((image) => {
      const source = image.getAttribute('data-sc-desktop-src');
      if (!source) return;
      image.removeAttribute('data-sc-desktop-src');
      image.src = source;
    });
  }

  #scheduleDesktopImages(): void {
    const desktop = browser.matchMedia('(min-width: 993px)');
    if (desktop.matches) {
      this.#activateDesktopImages();
      return;
    }

    const onChange = (event: MediaQueryListEvent): void => {
      if (!event.matches) return;
      this.#activateDesktopImages();
      desktop.removeEventListener('change', onChange);
    };
    desktop.addEventListener('change', onChange);
  }

  #releasePrepaintWhenStable(): void {
    if (!this.#layoutStable || !this.#criticalMediaStable) return;
    documentRoot.documentElement.classList.remove(
      'sc-catalog-prepaint',
      'sc-banner-media-ready',
      'sc-mobile-logo-ready',
    );
  }

  #markCriticalMediaReady = (): void => {
    this.#criticalMediaStable = true;
    this.#releasePrepaintWhenStable();
  };

  #waitForCriticalMedia(): void {
    const desktop = browser.matchMedia('(min-width: 993px)').matches;
    const image = desktop
      ? documentRoot.querySelector('.bannerShop .imgBannerShop')
      : documentRoot.querySelector('img[data-sc-lcp-logo="1"]');
    if (!(image instanceof HTMLImageElement) || image.complete) {
      this.#markCriticalMediaReady();
      return;
    }
    image.addEventListener('load', this.#markCriticalMediaReady, { once: true });
    image.addEventListener('error', this.#markCriticalMediaReady, { once: true });
    setTimeout(this.#markCriticalMediaReady, 1800);
  }

  #onLayoutStable = (): void => {
    this.#layoutStable = true;
    this.#releasePrepaintWhenStable();
  };

  #loadStylesheet(href: string): Promise<void> {
    return new Promise((resolve) => {
      const link = documentRoot.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.addEventListener('load', () => resolve(), { once: true });
      link.addEventListener('error', () => resolve(), { once: true });
      documentRoot.head.append(link);
    });
  }

  #loadScript(descriptor: RuntimeSource): Promise<void> {
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

  #replayPendingClick(): void {
    const target = this.#pendingClick;
    this.#pendingClick = null;
    if (target?.isConnected) setTimeout(() => target.click(), 0);
  }

  #announceRuntimeReady(): void {
    browser.dispatchEvent(new CustomEvent('sc:runtime-ready'));
    const search = documentRoot.querySelector<HTMLInputElement>('.sc-catalog-search-input');
    if (search?.value) search.dispatchEvent(new Event('input', { bubbles: true }));
    this.#replayPendingClick();
  }

  #startRuntime = async (): Promise<void> => {
    if (this.#runtimeStarted) return;
    this.#runtimeStarted = true;
    await this.#loadStylesheet('_pages/deferred.css?v=' + VERSION);
    for (const descriptor of runtimeSources) await this.#loadScript(descriptor);
    this.#announceRuntimeReady();
  };

  #scheduleRuntime(): void {
    if (this.#runtimeScheduled) return;
    this.#runtimeScheduled = true;
    const queue = (): void => {
      if ('requestIdleCallback' in browser) {
        browser.requestIdleCallback(() => void this.#startRuntime(), { timeout: 650 });
      } else {
        setTimeout(() => void this.#startRuntime(), 70);
      }
    };
    requestAnimationFrame(() => requestAnimationFrame(queue));
  }

  #boot = (): void => {
    const logo = documentRoot.querySelector<HTMLImageElement>('img[data-sc-lcp-logo="1"]');
    let settled = false;
    const ready = (): void => {
      if (settled) return;
      settled = true;
      this.#activateFirstViewportImages();
      this.#activateDeferredImages();
      this.#scheduleDesktopImages();
      this.#scheduleRuntime();
    };

    if (logo && !logo.complete) {
      logo.addEventListener('load', ready, { once: true });
      logo.addEventListener('error', ready, { once: true });
      setTimeout(ready, 1800);
    } else {
      ready();
    }
  };

  #startAnalytics = (): void => {
    if (this.#analyticsStarted) return;
    this.#analyticsStarted = true;
    this.#dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    const script = documentRoot.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-WQPLGX9';
    documentRoot.head.appendChild(script);
  };

  #scheduleAnalyticsFallback = (): void => {
    setTimeout(this.#startAnalytics, 30000);
  };

  #startRecaptcha = (): void => {
    if (this.#recaptchaStarted) return;
    this.#recaptchaStarted = true;
    const script = documentRoot.createElement('script');
    script.async = true;
    script.defer = true;
    script.src = 'https://www.google.com/recaptcha/api.js';
    documentRoot.head.appendChild(script);
  };

  #onPreRuntimeClick = (event: MouseEvent): void => {
    if (this.#runtimeStarted) return;
    const origin = event.target instanceof Element ? event.target : null;
    const target = origin?.closest('.sc-catalog-view-toggle,.sc-theme-toggle,.sc-theme-option');
    if (!(target instanceof HTMLElement)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.#pendingClick = target;
    void this.#startRuntime();
  };

  #startRuntimeOnInteraction = (): void => {
    void this.#startRuntime();
  };

  #installRecaptchaActivation(): void {
    const newsletter = documentRoot.getElementById('newsletterForm');
    if (!newsletter) return;
    newsletter.addEventListener('focusin', this.#startRecaptcha, { once: true });
    newsletter.addEventListener('pointerdown', this.#startRecaptcha, { once: true, passive: true });
    if (!('IntersectionObserver' in browser)) return;

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      this.#startRecaptcha();
    }, { rootMargin: '600px 0px' });
    observer.observe(newsletter);
  }
}

new DeliveryRuntimeController().start();

export {};
