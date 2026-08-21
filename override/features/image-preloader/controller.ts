import {
  IMAGE_STAGE_SELECTOR,
  imageBatchConfig,
  imagePreloaderPolicy,
  MOBILE_LOGO_URL,
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
  readonly #placeholderMotion = new ImagePlaceholderMotion();

  #observer: MutationObserver | null = null;
  #intersection: IntersectionObserver | null = null;
  #readyHandler: (() => void) | null = null;
  #started = false;
  #generation = 0;
  #initialQueue: HTMLElement[] = [];
  #initialIdle = 0;
  #initialTimer = 0;
  #waveFrame = 0;

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

  warmCache(_image: HTMLImageElement | null): void {
    // Native image loading owns caching. Deliberately no duplicate fetch pipeline.
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
    if (this.#waveFrame) cancelAnimationFrame(this.#waveFrame);
    this.#waveFrame = 0;
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

  #stageFor(image: HTMLImageElement | null): HTMLElement | null {
    return image?.closest<HTMLElement>(IMAGE_STAGE_SELECTOR) ?? null;
  }

  #deferredWithoutSource(image: HTMLImageElement): boolean {
    const deferred = image.getAttribute('data-sc-src')?.trim() ?? '';
    const source = image.getAttribute('src')?.trim() ?? '';
    return Boolean(deferred && !source && !image.currentSrc);
  }

  #imageReady(image: HTMLImageElement): boolean {
    return !this.#deferredWithoutSource(image) && image.complete && image.naturalWidth > 0;
  }

  #isPlaceholderTracked(stage: HTMLElement): boolean {
    return stage.classList.contains('sc-image-loading')
      || stage.classList.contains('sc-image-revealing')
      || stage.classList.contains('sc-image-transitioning');
  }

  #activateDeferredSource(image: HTMLImageElement): void {
    const source = image.getAttribute('data-sc-src')?.trim() ?? '';
    if (!source || image.getAttribute('src')?.trim()) return;
    image.removeAttribute('data-sc-src');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!this.#started || !image.isConnected || image.getAttribute('src')?.trim()) return;
        image.src = source;
      });
    });
  }

  #catalogueRoot(): ParentNode {
    return document.querySelector<HTMLElement>('.containerShop') ?? document;
  }

  #unbindNativeImage(image: HTMLImageElement): void {
    const binding = this.#bindings.get(image);
    if (!binding) return;
    image.removeEventListener('load', binding.load);
    image.removeEventListener('error', binding.error);
    this.#bindings.delete(image);
  }

  #markReadyIfTracked(stage: HTMLElement): void {
    if (this.#isPlaceholderTracked(stage)) this.#placeholderMotion.markReady(stage);
  }

  #revealLoaded(image: HTMLImageElement, stage: HTMLElement, token: number): void {
    const current = this.#stageFor(image) ?? stage;
    if (!current || !this.#started || token !== this.#generation || !this.#imageReady(image)) return;
    this.#markReadyIfTracked(current);
  }

  #bindNativeImage(image: HTMLImageElement, stage: HTMLElement): void {
    if (this.#imageReady(image)) {
      this.#markReadyIfTracked(stage);
      this.#unbindNativeImage(image);
      return;
    }

    this.#placeholderMotion.markLoading(stage, true);
    this.#scheduleWaveSync();

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
      if (this.#imageReady(image)) this.#unbindNativeImage(image);
    };
    binding.error = () => {
      if (this.#started && binding.token === this.#generation) {
        this.#markReadyIfTracked(binding.stage);
      }
      this.#unbindNativeImage(image);
    };

    this.#bindings.set(image, binding);
    image.addEventListener('load', binding.load);
    image.addEventListener('error', binding.error);

    if (this.#imageReady(image)) {
      this.#markReadyIfTracked(stage);
      this.#unbindNativeImage(image);
    }
  }

  #unbindNativeImages(): void {
    for (const image of [...this.#bindings.keys()]) this.#unbindNativeImage(image);
  }

  #release(root: Node): void {
    if (!(root instanceof Element)) return;
    this.#stagesIn(root).forEach((stage) => this.#placeholderMotion.release(stage));
    if (root instanceof HTMLImageElement) {
      this.#intersection?.unobserve(root);
      this.#unbindNativeImage(root);
    }
    root.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
      this.#intersection?.unobserve(image);
      this.#unbindNativeImage(image);
    });
  }

  #activateVisibleImage(image: HTMLImageElement): void {
    const stage = this.#stageFor(image);
    if (!stage) return;

    if (this.#imageReady(image)) {
      this.#markReadyIfTracked(stage);
      return;
    }

    this.#bindNativeImage(image, stage);
    this.#activateDeferredSource(image);

    if (this.#imageReady(image)) {
      this.#markReadyIfTracked(stage);
      this.#unbindNativeImage(image);
    }
  }

  #ensureIntersection(): IntersectionObserver | null {
    if (this.#intersection || !('IntersectionObserver' in window)) return this.#intersection;
    this.#intersection = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!(entry.target instanceof HTMLImageElement)) continue;
        const image = entry.target;
        if (!entry.isIntersecting) continue;
        this.#intersection?.unobserve(image);
        this.#activateVisibleImage(image);
      }
    }, { root: null, rootMargin: '0px', threshold: 0 });
    return this.#intersection;
  }

  #setPriority(image: HTMLImageElement): void {
    if (this.#assignedPriority.has(image)) return;
    this.#assignedPriority.add(image);
    image.loading = 'lazy';
    image.decoding = 'async';
    try { image.fetchPriority = 'low'; } catch { /* Compatibilidad de navegador. */ }
  }

  #collectImage(image: HTMLImageElement, explicitStage?: HTMLElement | null): void {
    const stage = explicitStage ?? this.#stageFor(image);
    if (!stage) return;
    this.#setPriority(image);

    if (this.#imageReady(image)) {
      this.#markReadyIfTracked(stage);
      return;
    }

    const intersection = this.#ensureIntersection();
    if (intersection) {
      intersection.observe(image);
      return;
    }

    this.#activateVisibleImage(image);
  }

  #collectStage(stage: HTMLElement | undefined): void {
    if (!stage) return;
    const image = stage.querySelector<HTMLImageElement>('img[src],img[srcset],img[data-sc-src]');
    if (image) this.#collectImage(image, stage);
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

  #activePlaceholderStages(): HTMLElement[] {
    return [...document.querySelectorAll<HTMLElement>(
      '.listadoShop .productoShop .sc-image-loading.sc-image-active',
    )];
  }

  #scheduleWaveSync(): void {
    if (this.#waveFrame) return;
    this.#waveFrame = requestAnimationFrame(() => {
      this.#waveFrame = 0;
      this.#placeholderMotion.synchronize(this.#activePlaceholderStages());
    });
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
    this.#decorateCriticalMedia();
    const root = this.#catalogueRoot();
    this.#observe(root);
    this.#scanInitial(root);
  }
}
