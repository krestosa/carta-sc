import { tokenRuntime } from '../../core/tokens.generated.js';

export const imagePreloaderPolicy = Object.freeze({
  loadAllImagesInBatches: false,
  cacheImages: false,
});

export const imageBatchConfig = Object.freeze({
  sync: 2,
  size: 4,
  budgetMs: 2,
  idleTimeout: 1200,
  delayMs: tokenRuntime.durationMs['component.duration.imagePreloaderDelay'],
});

export const MOBILE_LOGO_URL = 'https://www.sushiclub.com.ar/gfx/web-sushiclub2_black_m2.png';
export const IMAGE_STAGE_SELECTOR = '.imgShop,.imgLiquidNoFillShop';
export const NEAR_VIEWPORT_MARGIN = 0;
