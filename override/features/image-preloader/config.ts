export const imagePreloaderPolicy = Object.freeze({
  loadAllImagesInBatches: true,
  cacheImages: true,
});

export const imageBatchConfig = Object.freeze({
  sync: 6,
  size: 6,
  budgetMs: 3,
  idleTimeout: 900,
  delayMs: 40,
});

export const MOBILE_LOGO_URL = 'https://www.sushiclub.com.ar/gfx/web-sushiclub2_black_m2.png';
export const IMAGE_STAGE_SELECTOR = '.imgShop,.imgLiquidNoFillShop';
export const NEAR_VIEWPORT_MARGIN = 160;

export function criticalImageLimit(): number {
  const mode = document.documentElement.getAttribute('data-sc-catalog-view') ?? 'compact';
  if (mode === 'list') return 1;
  if (window.matchMedia('(max-width: 640px)').matches) return 1;
  if (window.matchMedia('(max-width: 992px)').matches) return mode === 'compact' ? 2 : 1;
  return mode === 'compact' ? 3 : 2;
}
