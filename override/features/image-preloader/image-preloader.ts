import type { Cleanup } from '../../core/types.js';
import { IMAGE_STAGE_SELECTOR, imagePreloaderPolicy } from './config.js';
import { ImagePreloaderController } from './controller.js';
import { synchronizeImagePlaceholderCycle } from './motion.js';

const controller = new ImagePreloaderController();
let syncFrame = 0;
let syncListenersBound = false;
let initialSkeletonHandler: (() => void) | null = null;

function initialSkeletonLimit(): number {
  const mode = document.documentElement.getAttribute('data-sc-catalog-view') ?? 'compact';
  if (mode === 'list') return 1;
  if (window.matchMedia('(max-width: 640px)').matches) return 2;
  if (window.matchMedia('(max-width: 992px)').matches) return 3;
  return 4;
}

function primeInitialSkeletons(): void {
  const limit = initialSkeletonLimit();
  let primed = 0;

  for (const card of document.querySelectorAll<HTMLElement>('.containerShop .productoShop')) {
    if (card.hidden) continue;
    const stage = card.querySelector<HTMLElement>(IMAGE_STAGE_SELECTOR);
    if (!stage) continue;

    stage.classList.remove('sc-image-ready', 'sc-image-revealing', 'sc-image-transitioning');
    stage.classList.add('sc-image-loading', 'sc-image-active');
    card.classList.remove(
      'sc-card-placeholder-ready',
      'sc-card-placeholder-revealing',
      'sc-card-placeholder-transitioning',
    );
    card.classList.add('sc-card-placeholder-loading', 'sc-card-placeholder-active');

    primed += 1;
    if (primed >= limit) break;
  }

  if (primed) scheduleWaveSync();
}

function primeInitialSkeletonsBeforeActivation(): void {
  if (document.readyState !== 'loading') {
    primeInitialSkeletons();
    return;
  }

  if (initialSkeletonHandler) return;
  initialSkeletonHandler = () => {
    initialSkeletonHandler = null;
    primeInitialSkeletons();
  };
  document.addEventListener('DOMContentLoaded', initialSkeletonHandler, { once: true });
}

function cancelInitialSkeletonPrime(): void {
  if (!initialSkeletonHandler) return;
  document.removeEventListener('DOMContentLoaded', initialSkeletonHandler);
  initialSkeletonHandler = null;
}

function synchronizeWave(): void {
  syncFrame = 0;
  synchronizeImagePlaceholderCycle();
}

function scheduleWaveSync(): void {
  if (!syncFrame) syncFrame = requestAnimationFrame(synchronizeWave);
}

function bindWaveSync(): void {
  if (syncListenersBound) return;
  syncListenersBound = true;
  window.addEventListener('resize', scheduleWaveSync, { passive: true });
  window.addEventListener('sc:motionrefresh', scheduleWaveSync);
}

function unbindWaveSync(): void {
  if (!syncListenersBound) return;
  syncListenersBound = false;
  window.removeEventListener('resize', scheduleWaveSync);
  window.removeEventListener('sc:motionrefresh', scheduleWaveSync);
  if (syncFrame) cancelAnimationFrame(syncFrame);
  syncFrame = 0;
}

export const warmHttpCache = (image: HTMLImageElement | null): void => controller.warmCache(image);
export const scanImages = (root: ParentNode | Node = document): void => {
  controller.scan(root);
  scheduleWaveSync();
};
export const startImagePreloader = (): void => {
  synchronizeImagePlaceholderCycle();
  bindWaveSync();
  controller.start();
  scheduleWaveSync();
};
export const destroyImagePreloader = (): void => {
  cancelInitialSkeletonPrime();
  unbindWaveSync();
  controller.destroy();
};

export const initializeImagePreloader = (): Cleanup => {
  controller.preloadCriticalMedia();
  primeInitialSkeletonsBeforeActivation();
  startImagePreloader();
  return destroyImagePreloader;
};

export const imagePreloader = Object.freeze({
  start: startImagePreloader,
  scan: scanImages,
  destroy: destroyImagePreloader,
  warmCache: warmHttpCache,
  loadAllInBatches: imagePreloaderPolicy.loadAllImagesInBatches,
  cacheImages: imagePreloaderPolicy.cacheImages,
});
