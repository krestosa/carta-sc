import {
  criticalImageLimit,
  IMAGE_STAGE_SELECTOR,
  imageBatchConfig,
  imagePreloaderPolicy,
  MOBILE_LOGO_URL,
  NEAR_VIEWPORT_MARGIN,
} from './config.js';
import { ImagePlaceholderMotion } from './motion.js';

interface ImageBinding {
  stage: HTMLElement;
  token: number;
  load: () => void;
  error: () => void;
}

export class ImagePreloaderController {
  readonly #assignedPriority = new WeakSet<HTMLImageElement>();
  readonly #bindings = new Map<HTMLImageElement, ImageBinding>();
  readonly #cacheWarmUrls = new Set<string>();
  readonly #placeholderMotion = new ImagePlaceholderMotion();

  #observer: MutationObserver | null = null;
  #intersection: IntersectionObserver | null = null;
  #readyHandler: (() => void) | null = null;
  #started = false;
  #generation = 0;
  #criticalCount = 0;
  #criticalLimit = 0;
  #initialQueue: HTMLElement[] = [];
  #initialIdle = 0;
  #initialTimer = 0;

  get started(): boolean {
    return this.#started;
  }

  preloadCriticalMedia(): void {
    if (
      !document.head
      || !window.matchMedia('(max-width: 992px)').matches
      || document.querySelector('link[data-sc-mobile-logo-preload]')
      || document.querySelector('img[data-sc-lcp-logo="1"]')
    ) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = MOBILE_LOGO_URL;
    link.fetchPriority = 'high';
    link.dataset.scMobileLogoPreload = '';
    document.head.appendChild(link);
  }

  warmCache(image: HTMLImageElement | null): void {
    if (!imagePreloaderPolicy.cacheImages || !window.fetch || !image) return;
    const url = image.currentSrc || image.src || image.getAttribute('src') || '';
    if (!url || /^(?:data|blob):/i.test(url) || this.#cacheWarmUrls.has(url)) return;

    this.#cacheWarmUrls.add(url);
    try {
      void window.fetch(url, {
        cache: 'force-cache',
        mode: 'no-cors',
        credentials: 'same-origin',
      }).catch(() => this.#cacheWarmUrls.delete(url));
    } catch {
      this.#cacheWarmUrls.delete(url);
    }
  }

  scan(root: ParentNode | Node = document): void {
    if (!this.#started) return;
    this.#stagesIn(root).forEach((stage) => this.#collectStage(stage));
  }

  start(): void {
    if (this.#started) return;
    this.#started = true;
    this.#generation += 1;
    document.documentElement.classList.add('sc-image-preloader-active');

    if (document.readyState === 'loading') {
      this.#readyHandler ??= () => {
        this.#readyHandler = null;
        this.#activate();
      };
      document.addEventListener('DOMContentLoaded', this.#readyHandler, { once: true });
    } else {
      this.#activate();
    }
  }

  destroy(): void {
    this.#started = false;
    this.#generation += 1;
    if (this.#readyHandler) {
      document.removeEventListener('DOMContentLoaded', this.#readyHandler);
      this.#readyHandler = null;
    }
    this.#cancelInitialScan();
    this.#observer?.disconnect();
    this.#intersection?.disconnect();
    this.#observer = null;
    this.#intersection = null;
    this.#unbindNativeImages();
    this.#placeholderMotion.destroy();
    document.documentElement.classList.remove('sc-image-preloader-active');
  }

  #decorateCriticalMedia(): void {
    const logo = document.querySelector<HTMLImageElement>('.brandOnlyMobile img')
      ?? document.querySelector<HTMLImageElement>(`img[src="${MOBILE_LOGO_URL}"]`);
    if (logo) {
      logo.loading = 'eager';
      logo.decoding = 'async';
      try { logo.fetchPriority = 'high'; } catch { /* Compatibilidad de navegador. */ }
      if (!logo.hasAttribute('width')) logo.width = 333;
      if (!logo.hasAttribute('height')) logo.height = 100;
    }

    const banner = document.querySelector<HTMLImageElement>('img.imgBannerShop');
    if (banner) banner.decoding = 'async';
  }

  #markLoading(stage: HTMLElement | null, active: boolean): void {
    if (!stage) return;
    this.#placeholderMotion.markLoading(stage, active);
  }

  #markReady(stage: HTMLElement | null): void {
    if (!stage) return;
    this.#placeholderMotion.markReady(stage);
  }

  #stageFor(image: HTMLImageElement | null): HTMLElement | null {
    return image?.closest<HTMLElement>(IMAGE_STAGE_SELECTOR) ?? null;
  }

  #nearViewport(image: HTMLImageElement | null): boolean {
    if (!image) return false;
    const rect = image.getBoundingClientRect();
    return rect.bottom >= -NEAR_VIEWPORT_MARGIN && rect.top <= innerHeight + NEAR_VIEWPORT_MARGIN;
  }

  #catalogueRoot(): ParentNode {
    return document.querySelector<HTMLElement>('.containerShop') ?? document;
  }

  #unbindNativeImage(image: HTMLImageElement): void {
    const binding = this.#bindings.get(image);
    if (!binding) return;
    this.#intersection?.unobserve(image);
    image.removeEventListener('load', binding.load);
    image.removeEventListener('error', binding.error);
    this.#bindings.delete(image);
  }

  #revealLoaded(image: HTMLImageElement, stage: HTMLElement, token: number): void {
    const current = this.#stageFor(image) ?? stage;
    if (!current || !this.#started || token !== this.#generation) return;
    this.#markReady(current);
    this.warmCache(image);
  }

  #bindNativeImage(image: HTMLImageElement, stage: HTMLElement, active: boolean): void {
    if (image.complete) {
      this.#markReady(stage);
      this.warmCache(image);
      this.#unbindNativeImage(image);
      return;
    }

    this.#markLoading(stage, active);
    const existing = this.#bindings.get(image);
    if (existing) {
      existing.stage = stage;
      existing.token = this.#generation;
      return;
    }

    const binding: ImageBinding = {
      stage,
      token: this.#generation,
      load: () => undefined,
      error: () => undefined,
    };
    binding.load = () => {
      this.#revealLoaded(image, binding.stage, binding.token);
      this.#unbindNativeImage(image);
    };
    binding.error = () => {
      if (this.#started && binding.token === this.#generation) this.#markReady(binding.stage);
      this.#unbindNativeImage(image);
    };

    this.#bindings.set(image, binding);
    image.addEventListener('load', binding.load);
    image.addEventListener('error', binding.error);
    if (image.complete) {
      this.#markReady(stage);
      this.warmCache(image);
      this.#unbindNativeImage(image);
    }
  }

  #unbindNativeImages(): void {
    for (const image of [...this.#bindings.keys()]) this.#unbindNativeImage(image);
  }

  #release(root: Node): void {
    if (!(root instanceof Element)) return;
    this.#stagesIn(root).forEach((stage) => this.#placeholderMotion.release(stage));
    if (root instanceof HTMLImageElement) this.#unbindNativeImage(root);
    root.querySelectorAll<HTMLImageElement>('img').forEach((image) => this.#unbindNativeImage(image));
  }

  #promote(image: HTMLImageElement, visible: boolean): void {
    if (image.complete) return;
    try {
      if (visible && image.fetchPriority === 'low') image.fetchPriority = 'auto';
    } catch {
      // fetchPriority no está disponible en todos los motores.
    }
    if (visible) this.warmCache(image);
    this.#markLoading(this.#stageFor(image), visible);
  }

  #ensureIntersection(): IntersectionObserver | null {
    if (this.#intersection || !('IntersectionObserver' in window)) return this.#intersection;
    this.#intersection = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || !this.#intersection) continue;
        const image = entry.target as HTMLImageElement;
        this.#promote(image, true);
        this.#intersection.unobserve(image);
      }
    }, { rootMargin: `${NEAR_VIEWPORT_MARGIN}px 0px` });
    return this.#intersection;
  }

  #setPriority(image: HTMLImageElement): boolean {
    try {
      image.decoding = 'async';
      if (!this.#assignedPriority.has(image)) {
        this.#assignedPriority.add(image);
        if (this.#criticalCount < this.#criticalLimit) {
          this.#criticalCount += 1;
          image.loading = 'eager';
          image.fetchPriority = 'auto';
        } else if (imagePreloaderPolicy.loadAllImagesInBatches) {
          image.loading = 'eager';
          image.fetchPriority = 'low';
        } else {
          image.loading = 'lazy';
          image.fetchPriority = 'low';
        }
      }

      const active = this.#nearViewport(image);
      if (
        imagePreloaderPolicy.cacheImages
        && (imagePreloaderPolicy.loadAllImagesInBatches || active || image.complete)
      ) {
        this.warmCache(image);
      }
      if (!image.complete) {
        if (active) this.#promote(image, true);
        else this.#ensureIntersection()?.observe(image);
      }
      return active;
    } catch {
      return false;
    }
  }

  #collectImage(image: HTMLImageElement, explicitStage?: HTMLElement | null): void {
    const stage = explicitStage ?? this.#stageFor(image);
    const active = this.#setPriority(image);
    if (!stage) return;
    if (image.complete) {
      this.#markReady(stage);
      this.warmCache(image);
      this.#unbindNativeImage(image);
    } else {
      this.#bindNativeImage(image, stage, active);
    }
  }

  #collectStage(stage: HTMLElement | undefined): void {
    if (!stage) return;
    const image = stage.querySelector<HTMLImageElement>('img[src],img[srcset]');
    if (image) this.#collectImage(image, stage);
    else this.#markReady(stage);
  }

  #stagesIn(root: ParentNode | Node | null): HTMLElement[] {
    if (!root) return [];
    const stages = new Set<HTMLElement>();
    if (root instanceof HTMLElement) {
      if (root.matches(IMAGE_STAGE_SELECTOR)) stages.add(root);
      root.querySelectorAll<HTMLElement>(IMAGE_STAGE_SELECTOR).forEach((stage) => stages.add(stage));
    } else if (root instanceof Document) {
      root.querySelectorAll<HTMLElement>(IMAGE_STAGE_SELECTOR).forEach((stage) => stages.add(stage));
    }
    return [...stages];
  }

  #cancelInitialScan(): void {
    if (this.#initialIdle && window.cancelIdleCallback) window.cancelIdleCallback(this.#initialIdle);
    if (this.#initialTimer) clearTimeout(this.#initialTimer);
    this.#initialIdle = 0;
    this.#initialTimer = 0;
    this.#initialQueue = [];
  }

  #runInitialBatch = (deadline: IdleDeadline | null = null): void => {
    this.#initialIdle = 0;
    this.#initialTimer = 0;
    if (!this.#started) return;

    const startedAt = performance.now();
    let count = 0;
    while (
      this.#initialQueue.length
      && count < imageBatchConfig.size
      && performance.now() - startedAt < imageBatchConfig.budgetMs
      && (!deadline || deadline.didTimeout || deadline.timeRemaining() > 2)
    ) {
      this.#collectStage(this.#initialQueue.shift());
      count += 1;
    }
    if (this.#initialQueue.length) this.#scheduleInitialBatch();
  };

  #scheduleInitialBatch(): void {
    if (!this.#started || !this.#initialQueue.length || this.#initialIdle || this.#initialTimer) return;
    this.#initialTimer = window.setTimeout(() => {
      this.#initialTimer = 0;
      if (!this.#started || !this.#initialQueue.length) return;
      if (window.requestIdleCallback) {
        this.#initialIdle = window.requestIdleCallback(this.#runInitialBatch, { timeout: imageBatchConfig.idleTimeout });
      } else {
        this.#runInitialBatch();
      }
    }, imageBatchConfig.delayMs);
  }

  #scanInitial(root: ParentNode | Node): void {
    this.#cancelInitialScan();
    const stages = this.#stagesIn(root);
    const syncCount = Math.min(imageBatchConfig.sync, stages.length);
    stages.slice(0, syncCount).forEach((stage) => this.#collectStage(stage));
    this.#initialQueue = stages.slice(syncCount);
    this.#scheduleInitialBatch();
  }

  #observe(root: ParentNode | Node): void {
    if (this.#observer || !('MutationObserver' in window) || !document.documentElement) return;
    this.#observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          if (mutation.target instanceof HTMLImageElement) this.#collectImage(mutation.target);
          continue;
        }
        mutation.removedNodes.forEach((node) => this.#release(node));
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node instanceof HTMLImageElement) this.#collectImage(node);
          else this.scan(node);
        });
      }
    });

    this.#observer.observe(root instanceof Element ? root : document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['src', 'srcset'],
    });
  }

  #activate(): void {
    if (!this.#started) return;
    this.#criticalCount = 0;
    this.#criticalLimit = criticalImageLimit();
    this.#decorateCriticalMedia();
    const root = this.#catalogueRoot();
    this.#observe(root);
    this.#scanInitial(root);
  }
}
