export const ORIGIN = 'https://www.sushiclub.com.ar/';
export const ASSET_ROOTS = ['uploads_shop', 'uploads', 'gfx', 'fonts', 'fuentes', 'iconos'] as const;
export const TEXT_SUFFIXES = new Set(['.html', '.css', '.js']);
export const FORBIDDEN_SUFFIXES = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp', '.avif',
  '.eot', '.woff', '.woff2', '.ttf', '.otf',
  '.mp4', '.webm', '.mov', '.m4v', '.avi', '.pdf',
]);
export const MIRRORED_FONT_SUFFIXES = new Set(['.woff', '.woff2', '.ttf', '.otf']);
export const REQUIRED_FONTS = new Set([
  '_remote-assets/fuentes/AcuminPro-Regular.woff2',
  '_remote-assets/fuentes/AcuminPro-Semibold.woff2',
  '_remote-assets/fonts/fontawesome-webfont.woff2',
  '_remote-assets/fonts/glyphicons-halflings-regular.woff',
  '_remote-assets/fonts/hnl.woff',
  '_remote-assets/fonts/bariol_bold-webfont.woff',
  '_remote-assets/fonts/bariol_light-webfont.woff',
  '_remote-assets/fonts/bariol_regular-webfont.woff',
  '_remote-assets/fonts/websymbolsligaregular.woff',
  '_remote-assets/fonts/PlutoBold.otf',
]);
export const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36';
export const REQUEST_TIMEOUT_MS = 15_000;
export const MAX_FONT_BYTES = 8 * 1024 * 1024;

const rootGroup = ASSET_ROOTS.join('|');
export const assetDirectoryPattern = new RegExp(
  `(?<![A-Za-z0-9:/])(?:\\.\\./|\\./|/)*(?<root>${rootGroup})/`,
  'gi',
);
export const faviconPattern = /(?<![A-Za-z0-9:/])(?:\.\.\/|\.\/|\/)*favicon\.ico\b/gi;
export const snapshotSuffixPattern = /(?:__q_[0-9a-f]{8}|__\d+)(?=\.(?:png|jpe?g|gif|webp|svg|ico|bmp|avif|eot|woff2?|ttf|otf|mp4|webm|mov|m4v|avi|pdf)\b)/gi;
export const remoteFontPattern = /https:\/\/www\.sushiclub\.com\.ar\/(?:fonts|fuentes)\/[^"'\s()<>?#]+?\.(?:woff2?|ttf|otf)(?:[?#][^"'\s()<>]*)?/gi;

export interface DownloadResponse {
  readonly bytes: Buffer;
  readonly contentType: string;
}

export interface MirrorFailure {
  readonly url: string;
  readonly reason: string;
}

export interface RewriteStats {
  filesChanged: number;
  replacements: number;
  canonicalized: number;
}

export interface MirrorResult {
  readonly downloaded: ReadonlyMap<string, string>;
  readonly targets: ReadonlySet<string>;
  readonly failures: readonly MirrorFailure[];
  readonly bytesTotal: number;
}
