import type { Cleanup } from '../../core/types.js';

interface ImageBinding {
  stage: HTMLElement;
  token: number;
  load: () => void;
  error: () => void;
}

const POLICY = Object.freeze({
  loadAllImagesInBatches: true,
  cacheImages: true,
});

const BATCH = Object.freeze({
  sync: 6,
  size: 6,
  budgetMs: 3,
  idleTimeout: 900,
  delayMs: 40,
});

const MOBILE_LOGO = 'https://www.sushiclub.com.ar/gfx/web-sushiclub2_black_m2.png';
const STAGE_SELECTOR = '.imgShop,.imgLiquidNoFillShop';
const assignedPriority = new WeakSet<HTMLImageElement>();
const bindings = new Map<HTMLImageElement, ImageBinding>();
const cacheWarmUrls = new Set<string>();

let observer: MutationObserver | null = null;
let intersection: IntersectionObserver | null = null;
let readyHandler: (() => void) | null = null;
let started = false;
let generation = 0;
let criticalCount = 0;
let criticalLimitValue = 0;
let initialQueue: HTMLElement[] = [];
let initialIdle = 0;
let initialTimer = 0;

const preloadCriticalMedia = (): void => {
  if (
    !document.head
    || !window.matchMedia('(max-width: 992px)').matches
    || document.querySelector('link[data-sc-mobile-logo-preload]')
    || document.querySelector('img[data-sc-lcp-logo="1"]')
  ) return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = MOBILE_LOGO;
  link.fetchPriority = 'high';
  link.dataset.scMobileLogoPreload = '';
  document.head.appendChild(link);
};

const decorateCriticalMedia = (): void => {
  const logo = document.querySelector<HTMLImageElement>('.brandOnlyMobile img')
    ?? document.querySelector<HTMLImageElement>(`img[src="${MOBILE_LOGO}"]`);
  if (logo) {
    logo.loading = 'eager';
    logo.decoding = 'async';
    try { logo.fetchPriority = 'high'; } catch { /* Compatibilidad de navegador. */ }
    if (!logo.hasAttribute('width')) logo.width = 333;
    if (!logo.hasAttribute('height')) logo.height = 100;
  }

  const banner = document.querySelector<HTMLImageElement>('img.imgBannerShop');
  if (banner) banner.decoding = 'async';
};

const markLoading = (stage: HTMLElement | null, active: boolean): void => {
  if (!stage) return;
  stage.classList.remove('sc-image-ready');
  stage.classList.add('sc-image-loading');
  stage.classList.toggle('sc-image-active', active);
};

const markReady = (stage: HTMLElement | null): void => {
  if (!stage) return;
  stage.classList.remove('sc-image-loading', 'sc-image-active');
  stage.classList.add('sc-image-ready');
};

const stageFor = (image: HTMLImageElement | null): HTMLElement | null =>
  image?.closest<HTMLElement>(STAGE_SELECTOR) ?? null;

const nearViewport = (image: HTMLImageElement | null): boolean => {
  if (!image) return false;
  const rect = image.getBoundingClientRect();
  const margin = 160;
  return rect.bottom >= -margin && rect.top <= innerHeight + margin;
};

const criticalLimit = (): number => {
  const mode = document.documentElement.getAttribute('data-sc-catalog-view') ?? 'compact';
  if (mode === 'list') return 1;
  if (window.matchMedia('(max-width: 640px)').matches) return 1;
  if (window.matchMedia('(max-width: 992px)').matches) return mode === 'compact' ? 2 : 1;
  return mode === 'compact' ? 3 : 2;
};

const catalogueRoot = (): ParentNode => document.querySelector<HTMLElement>('.containerShop') ?? document;
const selectedUrl = (image: HTMLImageElement | null): string =>
  image ? image.currentSrc || image.src || image.getAttribute('src') || '' : '';

export const warmHttpCache = (image: HTMLImageElement | null): void => {
  if (!POLICY.cacheImages || !window.fetch || !image) return;
  const url = selectedUrl(image);
  if (!url || /^(?:data|blob):/i.test(url) || cacheWarmUrls.has(url)) return;

  cacheWarmUrls.add(url);
  try {
    void window.fetch(url, {
      cache: 'force-cache',
      mode: 'no-cors',
      credentials: 'same-origin',
    }).catch(() => cacheWarmUrls.delete(url));
  } catch {
    cacheWarmUrls.delete(url);
  }
};

const unbindNativeImage = (image: HTMLImageElement): void => {
  const binding = bindings.get(image);
  if (!binding) return;
  intersection?.unobserve(image);
  image.removeEventListener('load', binding.load);
  image.removeEventListener('error', binding.error);
  bindings.delete(image);
};

const revealLoaded = (image: HTMLImageElement, stage: HTMLElement, token: number): void => {
  const current = stageFor(image) ?? stage;
  if (!current || !started || token !== generation) return;
  markReady(current);
  warmHttpCache(image);
};

const bindNativeImage = (image: HTMLImageElement, stage: HTMLElement, active: boolean): void => {
  if (image.complete) {
    markReady(stage);
    warmHttpCache(image);
    unbindNativeImage(image);
    return;
  }

  markLoading(stage, active);
  const existing = bindings.get(image);
  if (existing) {
    existing.stage = stage;
    existing.token = generation;
    return;
  }

  const binding: ImageBinding = {
    stage,
    token: generation,
    load: () => undefined,
    error: () => undefined,
  };
  binding.load = () => {
    revealLoaded(image, binding.stage, binding.token);
    unbindNativeImage(image);
  };
  binding.error = () => {
    if (started && binding.token === generation) markReady(binding.stage);
    unbindNativeImage(image);
  };

  bindings.set(image, binding);
  image.addEventListener('load', binding.load);
  image.addEventListener('error', binding.error);
  if (image.complete) {
    markReady(stage);
    warmHttpCache(image);
    unbindNativeImage(image);
  }
};

const unbindNativeImages = (): void => [...bindings.keys()].forEach(unbindNativeImage);

const release = (root: Node): void => {
  if (!(root instanceof Element)) return;
  if (root.matches('img')) unbindNativeImage(root as HTMLImageElement);
  root.querySelectorAll<HTMLImageElement>('img').forEach(unbindNativeImage);
};

const promote = (image: HTMLImageElement, visible: boolean): void => {
  if (image.complete) return;
  try {
    if (visible && image.fetchPriority === 'low') image.fetchPriority = 'auto';
  } catch {
    // fetchPriority no está disponible en todos los motores.
  }
  if (visible) warmHttpCache(image);
  markLoading(stageFor(image), visible);
};

const ensureIntersection = (): IntersectionObserver | null => {
  if (intersection || !('IntersectionObserver' in window)) return intersection;
  intersection = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || !intersection) return;
      const image = entry.target as HTMLImageElement;
      promote(image, true);
      intersection.unobserve(image);
    });
  }, { rootMargin: '160px 0px' });
  return intersection;
};

const setPriority = (image: HTMLImageElement): boolean => {
  try {
    image.decoding = 'async';
    if (!assignedPriority.has(image)) {
      assignedPriority.add(image);
      if (criticalCount < criticalLimitValue) {
        criticalCount += 1;
        image.loading = 'eager';
        image.fetchPriority = 'auto';
      } else if (POLICY.loadAllImagesInBatches) {
        image.loading = 'eager';
        image.fetchPriority = 'low';
      } else {
        image.loading = 'lazy';
        image.fetchPriority = 'low';
      }
    }

    const active = nearViewport(image);
    if (POLICY.cacheImages && (POLICY.loadAllImagesInBatches || active || image.complete)) warmHttpCache(image);
    if (!image.complete) {
      if (active) promote(image, true);
      else ensureIntersection()?.observe(image);
    }
    return active;
  } catch {
    return false;
  }
};

const collectImage = (image: HTMLImageElement, explicitStage?: HTMLElement | null): void => {
  const stage = explicitStage ?? stageFor(image);
  const active = setPriority(image);
  if (!stage) return;
  if (image.complete) {
    markReady(stage);
    warmHttpCache(image);
    unbindNativeImage(image);
  } else {
    bindNativeImage(image, stage, active);
  }
};

const collectStage = (stage: HTMLElement | undefined): void => {
  if (!stage) return;
  const image = stage.querySelector<HTMLImageElement>('img[src],img[srcset]');
  if (image) collectImage(image, stage);
  else markReady(stage);
};

const stagesIn = (root: ParentNode | Node | null): HTMLElement[] => {
  if (!root) return [];
  const stages = new Set<HTMLElement>();
  if (root instanceof HTMLElement) {
    if (root.matches(STAGE_SELECTOR)) stages.add(root);
    root.querySelectorAll<HTMLElement>(STAGE_SELECTOR).forEach((stage) => stages.add(stage));
  } else if (root instanceof Document) {
    root.querySelectorAll<HTMLElement>(STAGE_SELECTOR).forEach((stage) => stages.add(stage));
  }
  return [...stages];
};

export const scanImages = (root: ParentNode | Node = document): void => {
  if (!started) return;
  stagesIn(root).forEach(collectStage);
};

const cancelInitialScan = (): void => {
  if (initialIdle && window.cancelIdleCallback) window.cancelIdleCallback(initialIdle);
  if (initialTimer) clearTimeout(initialTimer);
  initialIdle = 0;
  initialTimer = 0;
  initialQueue = [];
};

const runInitialBatch = (deadline: IdleDeadline | null = null): void => {
  initialIdle = 0;
  initialTimer = 0;
  if (!started) return;

  const startedAt = performance.now();
  let count = 0;
  while (
    initialQueue.length
    && count < BATCH.size
    && performance.now() - startedAt < BATCH.budgetMs
    && (!deadline || deadline.didTimeout || deadline.timeRemaining() > 2)
  ) {
    collectStage(initialQueue.shift());
    count += 1;
  }
  if (initialQueue.length) scheduleInitialBatch();
};

const scheduleInitialBatch = (): void => {
  if (!started || !initialQueue.length || initialIdle || initialTimer) return;
  initialTimer = window.setTimeout(() => {
    initialTimer = 0;
    if (!started || !initialQueue.length) return;
    if (window.requestIdleCallback) {
      initialIdle = window.requestIdleCallback(runInitialBatch, { timeout: BATCH.idleTimeout });
    } else {
      runInitialBatch();
    }
  }, BATCH.delayMs);
};

const scanInitial = (root: ParentNode | Node): void => {
  cancelInitialScan();
  const stages = stagesIn(root);
  const syncCount = Math.min(BATCH.sync, stages.length);
  stages.slice(0, syncCount).forEach(collectStage);
  initialQueue = stages.slice(syncCount);
  scheduleInitialBatch();
};

const observe = (root: ParentNode | Node): void => {
  if (observer || !('MutationObserver' in window) || !document.documentElement) return;
  observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes') {
        if (mutation.target instanceof HTMLImageElement) collectImage(mutation.target);
        return;
      }
      mutation.removedNodes.forEach(release);
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node instanceof HTMLImageElement) collectImage(node);
        else scanImages(node);
      });
    });
  });

  observer.observe(root instanceof Element ? root : document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['src', 'srcset'],
  });
};

const activate = (): void => {
  if (!started) return;
  criticalCount = 0;
  criticalLimitValue = criticalLimit();
  decorateCriticalMedia();
  const root = catalogueRoot();
  observe(root);
  scanInitial(root);
};

export const startImagePreloader = (): void => {
  if (started) return;
  started = true;
  generation += 1;
  document.documentElement.classList.add('sc-image-preloader-active');

  if (document.readyState === 'loading') {
    readyHandler ??= () => {
      readyHandler = null;
      activate();
    };
    document.addEventListener('DOMContentLoaded', readyHandler, { once: true });
  } else {
    activate();
  }
};

export const destroyImagePreloader = (): void => {
  started = false;
  generation += 1;
  if (readyHandler) {
    document.removeEventListener('DOMContentLoaded', readyHandler);
    readyHandler = null;
  }
  cancelInitialScan();
  observer?.disconnect();
  intersection?.disconnect();
  observer = null;
  intersection = null;
  unbindNativeImages();
  document.documentElement.classList.remove('sc-image-preloader-active');
};

export const initializeImagePreloader = (): Cleanup => {
  preloadCriticalMedia();
  startImagePreloader();
  return destroyImagePreloader;
};

export const imagePreloader = Object.freeze({
  start: startImagePreloader,
  scan: scanImages,
  destroy: destroyImagePreloader,
  warmCache: warmHttpCache,
  loadAllInBatches: POLICY.loadAllImagesInBatches,
  cacheImages: POLICY.cacheImages,
});
