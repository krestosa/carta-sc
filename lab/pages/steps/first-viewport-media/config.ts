export type ImageSize = readonly [width: number, height: number];

export interface EncodedImageAsset {
  readonly url: string;
  readonly bytes: number;
  readonly size: ImageSize;
}

export interface FirstViewportStat {
  readonly index: number;
  readonly bytes: number;
  readonly size: ImageSize;
}

export interface ChromeMediaStat extends EncodedImageAsset {
  readonly name: string;
  readonly count: number;
}

export interface DimensionStat {
  readonly name: string;
  readonly count: number;
  readonly size: ImageSize;
}

export interface DesktopMediaStats {
  readonly bannerBytes: number;
  readonly bannerSize: ImageSize;
  readonly media: readonly ChromeMediaStat[];
  readonly countryLinks: number;
  readonly dimensions: readonly DimensionStat[];
}

export const FIRST_VIEWPORT_COUNT = 4;
export const MAX_PRODUCT_DIMENSION = 420;
export const MAX_PRODUCT_BYTES = 36_000;
export const MAX_DOWNLOAD_BYTES = 3_000_000;
export const MAX_CHROME_BYTES = 28_000;
export const MAX_CHROME_TOTAL_BYTES = 90_000;
export const MAX_BANNER_BYTES = 120_000;

export const PRODUCT_ENCODINGS = [
  { dimension: MAX_PRODUCT_DIMENSION, quality: 72 },
  { dimension: 384, quality: 70 },
  { dimension: 352, quality: 68 },
] as const;

export const CHROME_QUALITIES = [88, 82, 76] as const;

export const BANNER = {
  url: 'https://www.sushiclub.com.ar/uploads_shop/banner_shop/imagenes/aniversario_banner_desktop_(1)1782398717_556.webp',
  expectedSize: [1500, 157] as ImageSize,
  outputName: 'desktop-banner.webp',
} as const;

export const CHROME_MEDIA = [
  { name: 'desktop-logo', url: 'https://www.sushiclub.com.ar/gfx/web-sushiclub2_black.png' },
  { name: 'flag-arg', url: 'https://www.sushiclub.com.ar/gfx/band-arg.jpg' },
  { name: 'flag-mex', url: 'https://www.sushiclub.com.ar/gfx/band-mex.jpg' },
  { name: 'flag-par', url: 'https://www.sushiclub.com.ar/gfx/band-par.jpg' },
  { name: 'flag-esp', url: 'https://www.sushiclub.com.ar/gfx/band-esp.jpg' },
  { name: 'flag-uru', url: 'https://www.sushiclub.com.ar/gfx/band_uru.jpg' },
  { name: 'flag-usa', url: 'https://www.sushiclub.com.ar/gfx/band-usa.jpg' },
  { name: 'tiktok', url: 'https://www.sushiclub.com.ar/iconos/icons8-tiktok-32.png' },
] as const;

export const COUNTRY_LINKS = [
  ['flag-arg', 'Argentina'],
  ['flag-mex', 'México'],
  ['flag-par', 'Paraguay'],
  ['flag-esp', 'España'],
  ['flag-uru', 'Uruguay'],
  ['flag-usa', 'Estados Unidos'],
] as const;

export const DIMENSION_ONLY_MEDIA = [
  'https://www.sushiclub.com.ar/uploads/marcas/6/imagenes/chandon_web_gris_4_1749078095.png',
  'https://www.sushiclub.com.ar/uploads/marcas/8/imagenes/marca_06.jpg',
  'https://www.sushiclub.com.ar/uploads/marcas/4/imagenes/smartwater_gris_web_2_1749078414.png',
  'https://www.sushiclub.com.ar/uploads/marcas/5/imagenes/aquarius_gris_web_1_1749077984.png',
] as const;
