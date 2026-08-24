import {
  IMAGE_STAGE_SELECTOR,
  IMAGE_WAVE_ROW_TOLERANCE_PX,
  MOBILE_LOGO_URL,
} from './config.js';
import { ImagePlaceholderMotion } from './motion.js';

const SCROLL_SETTLE_MS = 96;

type ImagePriority = 'high' | 'low';

interface ImageBinding {
  stage: HTMLElement;
  token: number;
  load: () => void;
  error: () => void;
}

interface StageEntry {
  readonly stage: HTMLElement;
  readonly image: HTMLImageElement;
  readonly rect: DOMRect;
}

export class ImagePreloaderController {
  readonly #bindings = new Map<HTMLImageElement, ImageBinding>();
  readonly #placeholderMotion = new ImagePlaceholderMotion();
  readonly #stages = new Set<HTMLElement>();

  #observer: MutationObserver | null = null;
  #readyHandler: (() => void) | null = null;
  #started = false;
  #generation = 0;
  #refreshFrame = 0;
  #cleanupFrame = 0;
  #scrollTimer = 0;

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
    for (const stage of this.#stagesIn(root)) this.#stages.add(stage);
    this.#scheduleViewportRefresh();
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
    window.removeEventListener('scroll', this.#handleScroll);
    window.removeEventListener('resize', this.#handleResize);
    if (this.#refreshFrame) cancelAnimationFrame(this.#refreshFrame);
    if (this.#cleanupFrame) cancelAnimationFrame(this.#cleanupFrame);
    if (this.#scrollTimer) clearTimeout(this.#scrollTimer);
    this.#refreshFrame = 0;
    this.#cleanupFrame = 0;
    this.#scrollTimer = 0;
    this.#observer?.disconnect();
    this.#observer = null;
    this.#unbindNativeImages();
    this.#placeholderMotion.destroy();
    this.#stages.clear();
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

  #imageForStage(stage: HTMLElement): HTMLImageElement | null {
    return stage.querySelector<HTMLImageElement>('img[src],img[srcset],img[data-sc-src]');
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

  #prepareNetworkPriority(image: HTMLImageElement, priority: ImagePriority): void {
    image.loading = 'eager';
    image.decoding = 'async';
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

  #unbindNativeImages(): void {
    for (const image of [...this.#bindings.keys()]) this.#unbindNativeImage(image);
  }

  #markReadyIfTracked(stage: HTMLElement): void {
    if (!this.#isPlaceholderTracked(stage)) return;
    this.#placeholderMotion.markReady(stage);
  }

  #bindNativeImage(image: HTMLImageElement, stage: HTMLElement): void {
    if (this.#imageReady(image)) {
      this.#markReadyIfTracked(stage);
      this.#unbindNativeImage(image);
      return;
    }

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
        current
        && this.#started
        && binding.token === this.#generation
        && this.#imageReady(image)
      ) this.#markReadyIfTracked(current);
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

  #activateVisibleImage(entry: StageEntry): void {
    const { image, stage } = entry;
    this.#prepareNetworkPriority(image, 'high');

    if (this.#imageReady(image)) {
      this.#markReadyIfTracked(stage);
      return;
    }

    this.#placeholderMotion.markLoading(stage, true);
    this.#bindNativeImage(image, stage);
    this.#activateDeferredSource(image);

    if (this.#imageReady(image)) {
      this.#markReadyIfTracked(stage);
      this.#unbindNativeImage(image);
    }
  }

  #prefetchImage(entry: StageEntry): void {
    const { image, stage } = entry;
    if (this.#imageReady(image)) return;
    this.#prepareNetworkPriority(image, 'low');
    this.#bindNativeImage(image, stage);
    this.#activateDeferredSource(image);
  }

  #release(root: Node): void {
    if (!(root instanceof Element)) return;
    for (const stage of this.#stagesIn(root)) {
      this.#stages.delete(stage);
      this.#placeholderMotion.release(stage);
    }
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

  #entryFor(stage: HTMLElement): StageEntry | null {
    if (!stage.isConnected) return null;
    const image = this.#imageForStage(stage);
    if (!image) return null;
    const rect = stage.closest<HTMLElement>('.productoShop')?.getBoundingClientRect()
      ?? stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return { stage, image, rect };
  }

  #isInsideViewport(rect: DOMRect): boolean {
    return rect.bottom > 0
      && rect.top < window.innerHeight
      && rect.right > 0
      && rect.left < window.innerWidth;
  }

  #isHorizontallyRelevant(rect: DOMRect): boolean {
    return rect.right > 0 && rect.left < window.innerWidth;
  }

  #sortByWaveOrder(entries: readonly StageEntry[]): StageEntry[] {
    return [...entries].sort((a, b) => (
      Math.abs(a.rect.top - b.rect.top) > IMAGE_WAVE_ROW_TOLERANCE_PX
        ? a.rect.top - b.rect.top
        : b.rect.left - a.rect.left
    ));
  }

  #nextRowBelowViewport(entries: readonly StageEntry[]): StageEntry[] {
    const below = entries
      .filter((entry) => entry.rect.top >= window.innerHeight && this.#isHorizontallyRelevant(entry.rect))
      .sort((a, b) => a.rect.top - b.rect.top || b.rect.left - a.rect.left);
    const first = below[0];
    if (!first) return [];
    return this.#sortByWaveOrder(
      below.filter((entry) => Math.abs(entry.rect.top - first.rect.top) <= IMAGE_WAVE_ROW_TOLERANCE_PX),
    );
  }

  #collectEntries(): StageEntry[] {
    const entries: StageEntry[] = [];
    for (const stage of [...this.#stages]) {
      const entry = this.#entryFor(stage);
      if (!entry) {
        if (!stage.isConnected) this.#stages.delete(stage);
        continue;
      }
      entries.push(entry);
    }
    return entries;
  }

  #deactivateOutsideViewport(entries: readonly StageEntry[]): void {
    for (const entry of entries) {
      if (this.#isInsideViewport(entry.rect)) continue;
      if (this.#isPlaceholderTracked(entry.stage)) this.#placeholderMotion.release(entry.stage);
    }
  }

  #refreshViewport = (): void => {
    this.#refreshFrame = 0;
    if (!this.#started) return;

    const entries = this.#collectEntries();
    const visible = this.#sortByWaveOrder(entries.filter((entry) => this.#isInsideViewport(entry.rect)));
    const visibleStages = new Set(visible.map((entry) => entry.stage));

    for (const entry of entries) {
      if (visibleStages.has(entry.stage)) continue;
      if (this.#isPlaceholderTracked(entry.stage)) this.#placeholderMotion.release(entry.stage);
    }

    for (const entry of visible) this.#activateVisibleImage(entry);
    for (const entry of this.#nextRowBelowViewport(entries)) this.#prefetchImage(entry);

    this.#placeholderMotion.synchronize(
      visible
        .map((entry) => entry.stage)
        .filter((stage) => stage.classList.contains('sc-image-loading') && stage.classList.contains('sc-image-active')),
    );
  };

  #scheduleViewportRefresh(): void {
    if (!this.#started || this.#refreshFrame) return;
    this.#refreshFrame = requestAnimationFrame(this.#refreshViewport);
  }

  #cleanupOutsideViewport = (): void => {
    this.#cleanupFrame = 0;
    if (!this.#started) return;
    this.#deactivateOutsideViewport(this.#collectEntries());
  };

  #scheduleViewportCleanup(): void {
    if (!this.#started || this.#cleanupFrame) return;
    this.#cleanupFrame = requestAnimationFrame(this.#cleanupOutsideViewport);
  }

  #scheduleSettledRefresh(): void {
    if (this.#scrollTimer) clearTimeout(this.#scrollTimer);
    this.#scrollTimer = window.setTimeout(() => {
      this.#scrollTimer = 0;
      this.#scheduleViewportRefresh();
    }, SCROLL_SETTLE_MS);
  }

  #handleScroll = (): void => {
    this.#scheduleViewportCleanup();
    this.#scheduleSettledRefresh();
  };

  #handleResize = (): void => {
    this.#scheduleViewportCleanup();
    this.#scheduleViewportRefresh();
  };

  #observe(root: ParentNode | Node): void {
    if (this.#observer || !('MutationObserver' in window) || !document.documentElement) return;
    this.#observer = new MutationObserver((mutations) => {
      let needsRefresh = false;
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          if (mutation.target instanceof HTMLImageElement) {
            const stage = this.#stageFor(mutation.target);
            if (stage) this.#stages.add(stage);
            needsRefresh = true;
          }
          continue;
        }

        mutation.removedNodes.forEach((node) => this.#release(node));
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          for (const stage of this.#stagesIn(node)) this.#stages.add(stage);
          needsRefresh = true;
        });
      }
      if (needsRefresh) this.#scheduleViewportRefresh();
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
    for (const stage of this.#stagesIn(root)) this.#stages.add(stage);
    this.#observe(root);
    window.addEventListener('scroll', this.#handleScroll, { passive: true });
    window.addEventListener('resize', this.#handleResize, { passive: true });
    this.#scheduleViewportRefresh();
  }
}
