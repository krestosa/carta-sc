import type { Cleanup } from '../../core/types.js';
import { imagePreloaderPolicy } from './config.js';
import { ImagePreloaderController } from './controller.js';
import { synchronizeImagePlaceholderCycle } from './motion.js';

const controller = new ImagePreloaderController();
let syncFrame = 0;
let syncListenersBound = false;

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
  unbindWaveSync();
  controller.destroy();
};

export const initializeImagePreloader = (): Cleanup => {
  controller.preloadCriticalMedia();
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
