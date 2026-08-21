export type FontSuffix = '.woff2' | '.woff' | '.ttf' | '.otf';
export type FontMime = 'font/woff2' | 'font/woff' | 'font/ttf' | 'font/otf';

export interface LocalFontAsset {
  readonly data: Buffer;
  readonly suffix: FontSuffix;
  readonly mime: FontMime;
}

export interface FontReplacement {
  readonly start: number;
  readonly end: number;
  readonly css: string;
}

export const FONT_DOWNLOAD_ATTEMPTS = 3;
export const FONT_DOWNLOAD_TIMEOUT_MS = 10_000;
export const FONT_RETRY_DELAY_MS = 500;
export const MAX_FONT_BYTES = 180_000;
export const MIN_LOCAL_FONT_BYTES = 1_000;
export const FONT_SUFFIXES = new Set<FontSuffix>(['.woff2', '.woff', '.ttf', '.otf']);
export const FONT_MIME: Readonly<Record<FontSuffix, FontMime>> = {
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};
export const ALLOWED_FONT_CONTENT_TYPES = new Set([
  'application/font-sfnt',
  'application/octet-stream',
]);
