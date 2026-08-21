import type { Cleanup } from '../../core/types.js';
import { imagePreloaderPolicy } from './config.js';
import { ImagePreloaderController } from './controller.js';
import { synchronizeImagePlaceholderCycle } from './motion.js';

const controller = new ImagePreloaderController();

export const warmHttpCache = (image: HTMLImageElement | null): void => controller.warmCache(image);
export const scanImages = (root: ParentNode | Node = document): void => controller.scan(root);
export const startImagePreloader = (): void => {
  synchronizeImagePlaceholderCycle();
  controller.start();
};
export const destroyImagePreloader = (): void => controller.destroy();

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
