export const imagePreloaderPolicy = Object.freeze({
  loadAllImagesInBatches: false,
  cacheImages: false,
});

export const imageBatchConfig = Object.freeze({
  sync: 2,
  size: 4,
  budgetMs: 2,
  idleTimeout: 1200,
  delayMs: 80,
});

export const MOBILE_LOGO_URL = 'https://www.sushiclub.com.ar/gfx/web-sushiclub2_black_m2.png';
export const IMAGE_STAGE_SELECTOR = '.imgShop,.imgLiquidNoFillShop';
export const NEAR_VIEWPORT_MARGIN = 0;

export function criticalImageLimit(): number {
  const mode = document.documentElement.getAttribute('data-sc-catalog-view') ?? 'compact';
  if (mode === 'list') return 1;
  if (window.matchMedia('(max-width: 640px)').matches) return 1;
  if (window.matchMedia('(max-width: 992px)').matches) return mode === 'compact' ? 2 : 1;
  return mode === 'compact' ? 3 : 2;
}
