import {
  IMAGE_STAGE_SELECTOR,
  MOBILE_LOGO_URL,
} from './config.js';
import { ImagePlaceholderMotion } from './motion.js';

const SCROLL_SETTLE_MS = 96;
const PREFETCH_ROW_FALLBACK_PX = 320;
const PREFETCH_ROW_MIN_PX = 96;
const ROW_TOLERANCE_PX = 4;

type ImagePriority = 'high' | 'low';

interface ImageBinding {
  stage: HTMLElement;
  token: number;
  load: () => void;
  error: () => void;
}

interface StagePosition {
  readonly stage: HTMLElement;
  readonly top: number;
  readonly left: number;
}

function stageImage(stage: HTMLElement): HTMLImageElement | null {
  return stage.querySelector<HTMLImageElement>('img[src],img[srcset],img[data-sc-src]');
}

function orderedStages(stages: Iterable<HTMLElement>): HTMLElement[] {
  const positioned: StagePosition[] = [];
  for (const stage of stages) {
    if (!stage.isConnected) continue;
    const card = stage.closest<HTMLElement>('.productoShop');
    if (!card || card.hidden) continue;
    const rect = card.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    positioned.push({ stage, top: rect.top, left: rect.left });
  }

  return positioned
    .sort((left, right) => Math.abs(left.top - right.top) > ROW_TOLERANCE_PX
      ? left.top - right.top
      : right.left - left.left)
    .map((entry) => entry.stage);
}

export class ImagePreloaderController {
  readonly #bindings = new Map<HTMLImageElement, ImageBinding>();
  readonly #placeholderMotion = new ImagePlaceholderMotion();
  readonly #stages = new Set<HTMLElement>();
  readonly #visibleStages = new Set<HTMLElement>();
  readonly #prefetchStages = new Set<HTMLElement>();

  #observer: MutationObserver | null = null;
  #visibleObserver: IntersectionObserver | null = null;
  #prefetchObserver: IntersectionObserver | null = null;
  #readyHandler: (() => void) | null = null;
  #started = false;
  #generation = 0;
  #waveFrame = 0;
  #layoutFrame = 0;
  #scrollEndTimer = 0;
  #scrolling = false;
  #hasNativeScrollEnd = false;

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
    this.#stagesIn(root).forEach((stage) => this.#registerStage(stage));
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
    if (this.#waveFrame) cancelAnimationFrame(this.#waveFrame);
    if (this.#layoutFrame) cancelAnimationFrame(this.#layoutFrame);
    if (this.#scrollEndTimer) clearTimeout(this.#scrollEndTimer);
    this.#waveFrame = 0;
    this.#layoutFrame = 0;
    this.#scrollEndTimer = 0;
    this.#unbindViewportEvents();
    this.#observer?.disconnect();
    this.#visibleObserver?.disconnect();
    this.#prefetchObserver?.disconnect();
    this.#observer = null;
    this.#visibleObserver = null;
    this.#prefetchObserver = null;
    this.#unbindNativeImages();
    this.#placeholderMotion.destroy();
    this.#stages.clear();
    this.#visibleStages.clear();
    this.#prefetchStages.clear();
    document.documentElement.classList.remove('sc-image-preloader-active');
  }

  #decorateCriticalMedia(): void {
    const logo = document.querySelector<HTMLImageElement>('.brandOnlyMobile img')
      ?? document.querySelector<HTMLImageElement>(`img[src="${MOBILE_LOGO_URL}"]`);
    if (logo) {
      logo.loading = 'eager';
      logo.decoding = 'async';
      try { logo.fetchPriority = 'high'; } catch { /* Browser compatibility. */ }
      if (!logo.hasAttribute('width')) logo.width = 333;
      if (!logo.hasAttribute('height')) logo.height = 100;
    }

    const banner = document.querySelector<HTMLImageElement>('img.imgBannerShop');
    if (banner) banner.decoding = 'async';
  }

  #catalogueRoot(): ParentNode {
    return document.querySelector<HTMLElement>('.containerShop') ?? document;
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

  #setPriority(image: HTMLImageElement, priority: ImagePriority): void {
    image.decoding = 'async';
    image.loading = priority === 'high' ? 'eager' : 'lazy';
    try { image.fetchPriority = priority; } catch { /* Browser compatibility. */ }
  }

  #activateDeferredSource(image: HTMLImageElement): void {
    const source = image.getAttribute('data-sc-src')?.trim() ?? '';
    if (!source || image.getAttribute('src')?.trim()) return;
    image.removeAttribute('data-sc-src');
    image.src = source;
  }

  #unbindNativeImage(image: HTMLImageElement): void {
    const binding = this.#bindings.get(image);
    if (!binding) return;
    image.removeEventListener('load', binding.load);
    image.removeEventListener('error', binding.error);
    this.#bindings.delete(image);
  }

  #bindNativeImage(image: HTMLImageElement, stage: HTMLElement): void {
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
      const current = this.#stageFor(image) ?? binding.stage;
      if (
        this.#started
        && binding.token === this.#generation
        && current
        && this.#imageReady(image)
      ) {
        this.#placeholderMotion.markReady(current, this.#visibleStages.has(current));
        this.#scheduleWaveSync();
      }
      if (this.#imageReady(image)) this.#unbindNativeImage(image);
    };

    binding.error = () => {
      const current = this.#stageFor(image) ?? binding.stage;
      if (this.#started && binding.token === this.#generation && current) {
        this.#placeholderMotion.markReady(current, false);
        this.#scheduleWaveSync();
      }
      this.#unbindNativeImage(image);
    };

    this.#bindings.set(image, binding);
    image.addEventListener('load', binding.load);
    image.addEventListener('error', binding.error);
  }

  #unbindNativeImages(): void {
    for (const image of [...this.#bindings.keys()]) this.#unbindNativeImage(image);
  }

  #activateVisibleStage(stage: HTMLElement): void {
    if (!this.#started || !stage.isConnected || !this.#visibleStages.has(stage)) return;
    const image = stageImage(stage);
    if (!image) return;

    this.#setPriority(image, 'high');
    if (this.#imageReady(image)) {
      this.#placeholderMotion.markReady(stage, false);
      this.#unbindNativeImage(image);
      return;
    }

    this.#placeholderMotion.markLoading(stage, true);
    this.#bindNativeImage(image, stage);
    this.#activateDeferredSource(image);
  }

  #prefetchStage(stage: HTMLElement): void {
    if (
      !this.#started
      || !stage.isConnected
      || this.#visibleStages.has(stage)
      || !this.#prefetchStages.has(stage)
    ) return;
    const image = stageImage(stage);
    if (!image) return;

    this.#setPriority(image, 'low');
    if (this.#imageReady(image)) {
      this.#unbindNativeImage(image);
      return;
    }

    this.#bindNativeImage(image, stage);
    this.#activateDeferredSource(image);
  }

  #measurePrefetchMargin(): number {
    const stage = [...this.#stages].find((candidate) => candidate.isConnected);
    const card = stage?.closest<HTMLElement>('.productoShop') ?? null;
    if (!card) return PREFETCH_ROW_FALLBACK_PX;

    const height = card.getBoundingClientRect().height;
    if (!Number.isFinite(height) || height <= 0) return PREFETCH_ROW_FALLBACK_PX;

    const parent = card.parentElement;
    const rowGap = parent ? Number.parseFloat(getComputedStyle(parent).rowGap || '0') || 0 : 0;
    return Math.max(PREFETCH_ROW_MIN_PX, Math.ceil(height + rowGap));
  }

  #ensureVisibleObserver(): IntersectionObserver | null {
    if (this.#visibleObserver || !('IntersectionObserver' in window)) return this.#visibleObserver;

    this.#visibleObserver = new IntersectionObserver((entries) => {
      const entering: HTMLElement[] = [];

      for (const entry of entries) {
        if (!(entry.target instanceof HTMLElement)) continue;
        const stage = entry.target;
        if (entry.isIntersecting) {
          this.#visibleStages.add(stage);
          entering.push(stage);
        } else {
          this.#visibleStages.delete(stage);
          this.#placeholderMotion.suspend(stage);
        }
      }

      if (!this.#scrolling) {
        orderedStages(entering).forEach((stage) => this.#activateVisibleStage(stage));
      }
      this.#scheduleWaveSync();
    }, { root: null, rootMargin: '0px', threshold: 0 });

    return this.#visibleObserver;
  }

  #rebuildPrefetchObserver(): void {
    this.#prefetchObserver?.disconnect();
    this.#prefetchStages.clear();
    if (!('IntersectionObserver' in window)) {
      this.#prefetchObserver = null;
      return;
    }

    const margin = this.#measurePrefetchMargin();
    this.#prefetchObserver = new IntersectionObserver((entries) => {
      const entering: HTMLElement[] = [];

      for (const entry of entries) {
        if (!(entry.target instanceof HTMLElement)) continue;
        const stage = entry.target;
        if (entry.isIntersecting) {
          this.#prefetchStages.add(stage);
          entering.push(stage);
        } else {
          this.#prefetchStages.delete(stage);
        }
      }

      if (!this.#scrolling) {
        orderedStages(entering).forEach((stage) => this.#prefetchStage(stage));
      }
    }, {
      root: null,
      rootMargin: `0px 0px ${margin}px 0px`,
      threshold: 0,
    });

    for (const stage of this.#stages) {
      if (stage.isConnected) this.#prefetchObserver.observe(stage);
    }
  }

  #registerStage(stage: HTMLElement): void {
    if (this.#stages.has(stage)) return;
    this.#stages.add(stage);
    this.#ensureVisibleObserver()?.observe(stage);
    this.#prefetchObserver?.observe(stage);
  }

  #release(root: Node): void {
    if (!(root instanceof Element)) return;
    this.#stagesIn(root).forEach((stage) => {
      this.#visibleObserver?.unobserve(stage);
      this.#prefetchObserver?.unobserve(stage);
      this.#visibleStages.delete(stage);
      this.#prefetchStages.delete(stage);
      this.#stages.delete(stage);
      this.#placeholderMotion.release(stage);
    });

    if (root instanceof HTMLImageElement) this.#unbindNativeImage(root);
    root.querySelectorAll<HTMLImageElement>('img').forEach((image) => this.#unbindNativeImage(image));
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

  #settleViewport = (): void => {
    this.#scrollEndTimer = 0;
    if (!this.#started) return;
    this.#scrolling = false;
    orderedStages(this.#visibleStages).forEach((stage) => this.#activateVisibleStage(stage));
    orderedStages(this.#prefetchStages).forEach((stage) => this.#prefetchStage(stage));
    this.#scheduleWaveSync();
  };

  #handleScroll = (): void => {
    if (!this.#started) return;
    this.#scrolling = true;
    if (this.#hasNativeScrollEnd) return;
    if (this.#scrollEndTimer) clearTimeout(this.#scrollEndTimer);
    this.#scrollEndTimer = window.setTimeout(this.#settleViewport, SCROLL_SETTLE_MS);
  };

  #handleScrollEnd = (): void => {
    if (!this.#started) return;
    this.#settleViewport();
  };

  #handleLayoutChange = (): void => {
    if (this.#layoutFrame) return;
    this.#layoutFrame = requestAnimationFrame(() => {
      this.#layoutFrame = 0;
      if (!this.#started) return;
      this.#rebuildPrefetchObserver();
      this.#scheduleWaveSync();
    });
  };

  #bindViewportEvents(): void {
    this.#hasNativeScrollEnd = 'onscrollend' in window;
    window.addEventListener('scroll', this.#handleScroll, { passive: true });
    if (this.#hasNativeScrollEnd) window.addEventListener('scrollend', this.#handleScrollEnd, { passive: true });
    window.addEventListener('resize', this.#handleLayoutChange, { passive: true });
    window.addEventListener('sc:motionrefresh', this.#handleLayoutChange);
  }

  #unbindViewportEvents(): void {
    window.removeEventListener('scroll', this.#handleScroll);
    if (this.#hasNativeScrollEnd) window.removeEventListener('scrollend', this.#handleScrollEnd);
    window.removeEventListener('resize', this.#handleLayoutChange);
    window.removeEventListener('sc:motionrefresh', this.#handleLayoutChange);
    this.#hasNativeScrollEnd = false;
  }

  #observe(root: ParentNode | Node): void {
    if (this.#observer || !('MutationObserver' in window) || !document.documentElement) return;
    this.#observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          if (mutation.target instanceof HTMLImageElement) {
            const stage = this.#stageFor(mutation.target);
            if (stage) this.#registerStage(stage);
          }
          continue;
        }

        mutation.removedNodes.forEach((node) => this.#release(node));
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node instanceof HTMLImageElement) {
            const stage = this.#stageFor(node);
            if (stage) this.#registerStage(stage);
          } else {
            this.scan(node);
          }
        });
      }
    });

    this.#observer.observe(root instanceof Element ? root : document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['src', 'srcset', 'data-sc-src'],
    });
  }

  #activate(): void {
    if (!this.#started) return;
    this.#decorateCriticalMedia();
    const root = this.#catalogueRoot();
    this.#ensureVisibleObserver();
    this.scan(root);
    this.#rebuildPrefetchObserver();
    this.#observe(root);
    this.#bindViewportEvents();
  }
}
