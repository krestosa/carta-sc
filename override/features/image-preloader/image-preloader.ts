import type { Cleanup } from '../../core/types.js';
import { IMAGE_STAGE_SELECTOR, imagePreloaderPolicy } from './config.js';
import { ImagePreloaderController } from './controller.js';
import { synchronizeImagePlaceholderCycle } from './motion.js';

const INITIAL_PRELOAD_ROWS = 2;
const INITIAL_PRELOAD_ATTEMPTS = 8;
const ROW_TOLERANCE_PX = 4;

interface CardPosition {
  readonly card: HTMLElement;
  readonly top: number;
  readonly left: number;
}

const controller = new ImagePreloaderController();
let syncFrame = 0;
let syncListenersBound = false;
let initialPreloadFrame = 0;
let initialPreloadAttempts = 0;
let initialRowsReady = false;

function synchronizeWave(): void {
  syncFrame = 0;
  synchronizeImagePlaceholderCycle();
}

function scheduleWaveSync(): void {
  if (!syncFrame) syncFrame = requestAnimationFrame(synchronizeWave);
}

function positionedCards(): CardPosition[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.containerShop .listadoShop .productoShop'))
    .filter((card) => !card.hidden && card.offsetParent !== null)
    .map((card) => {
      const rect = card.getBoundingClientRect();
      return { card, top: rect.top, left: rect.left };
    })
    .filter(({ card, top, left }) => {
      const rect = card.getBoundingClientRect();
      return Number.isFinite(top) && Number.isFinite(left) && rect.width > 0 && rect.height > 0;
    })
    .sort((left, right) => Math.abs(left.top - right.top) > ROW_TOLERANCE_PX
      ? left.top - right.top
      : left.left - right.left);
}

function preloadInitialRows(): boolean {
  const rows: number[] = [];

  for (const { card, top } of positionedCards()) {
    let row = rows.findIndex((rowTop) => Math.abs(rowTop - top) <= ROW_TOLERANCE_PX);
    if (row < 0) {
      if (rows.length >= INITIAL_PRELOAD_ROWS) break;
      rows.push(top);
      row = rows.length - 1;
    }

    const stage = card.querySelector<HTMLElement>(IMAGE_STAGE_SELECTOR);
    const image = stage?.querySelector<HTMLImageElement>('img[src],img[srcset],img[data-sc-src]');
    if (!image) continue;

    image.decoding = 'async';
    image.loading = 'eager';
    try { image.fetchPriority = row === 0 ? 'high' : 'low'; } catch { /* Browser compatibility. */ }

    const deferred = image.getAttribute('data-sc-src')?.trim() ?? '';
    const source = image.getAttribute('src')?.trim() ?? '';
    if (deferred && !source && !image.currentSrc) {
      image.removeAttribute('data-sc-src');
      image.src = deferred;
    }
  }

  return rows.length >= INITIAL_PRELOAD_ROWS;
}

function scheduleInitialRowsPreload(): void {
  if (initialRowsReady || initialPreloadFrame || !controller.started) return;
  initialPreloadFrame = requestAnimationFrame(() => {
    initialPreloadFrame = 0;
    if (!controller.started || initialRowsReady) return;
    initialPreloadAttempts += 1;
    initialRowsReady = preloadInitialRows();
    if (!initialRowsReady && initialPreloadAttempts < INITIAL_PRELOAD_ATTEMPTS) {
      scheduleInitialRowsPreload();
    }
  });
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
  scheduleInitialRowsPreload();
  scheduleWaveSync();
};
export const startImagePreloader = (): void => {
  synchronizeImagePlaceholderCycle();
  bindWaveSync();
  initialRowsReady = false;
  initialPreloadAttempts = 0;
  controller.start();
  scheduleInitialRowsPreload();
  scheduleWaveSync();
};
export const destroyImagePreloader = (): void => {
  unbindWaveSync();
  if (initialPreloadFrame) cancelAnimationFrame(initialPreloadFrame);
  initialPreloadFrame = 0;
  initialPreloadAttempts = 0;
  initialRowsReady = false;
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
