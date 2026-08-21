import path from 'node:path';
import sharp from 'sharp';
import { SITE, assert, githubSha, write } from '../../lib/core.js';
import {
  BANNER,
  CHROME_QUALITIES,
  MAX_BANNER_BYTES,
  MAX_CHROME_BYTES,
  MAX_DOWNLOAD_BYTES,
  type EncodedImageAsset,
  type ImageSize,
} from './config.js';

const DOWNLOAD_ATTEMPTS = 3;
const DOWNLOAD_TIMEOUT_MS = 12_000;
const RETRY_DELAY_MS = 600;
const MAX_SOURCE_DIMENSION = 5_000;

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function downloadImage(url: string): Promise<Buffer> {
  let lastError: unknown;

  for (let attempt = 0; attempt < DOWNLOAD_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': 'Mozilla/5.0' },
        redirect: 'follow',
        signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
      });
      assert(response.ok, `HTTP ${response.status}`);

      const contentType = response.headers.get('content-type') ?? '';
      const data = Buffer.from(await response.arrayBuffer());
      assert(
        data.length > 0 && data.length <= MAX_DOWNLOAD_BYTES && contentType.startsWith('image/'),
        `invalid source image: type=${contentType} bytes=${data.length}`,
      );
      return data;
    } catch (error: unknown) {
      lastError = error;
      if (attempt + 1 < DOWNLOAD_ATTEMPTS) await delay(RETRY_DELAY_MS * (attempt + 1));
    }
  }

  throw new Error(`Pages image download failed: ${url}: ${errorMessage(lastError)}`);
}

export async function imageSize(data: Buffer, name: string): Promise<ImageSize> {
  try {
    const metadata = await sharp(data, { failOn: 'error' }).metadata();
    assert(
      metadata.width
        && metadata.height
        && metadata.width <= MAX_SOURCE_DIMENSION
        && metadata.height <= MAX_SOURCE_DIMENSION,
      `invalid Pages image dimensions for ${name}: ${metadata.width}x${metadata.height}`,
    );
    return [metadata.width, metadata.height];
  } catch (error: unknown) {
    throw new Error(`cannot decode Pages image ${name}: ${errorMessage(error)}`);
  }
}

export async function encodeChromeImage(data: Buffer, name: string): Promise<EncodedImageAsset> {
  const size = await imageSize(data, name);

  for (const quality of CHROME_QUALITIES) {
    const encoded = await sharp(data, { failOn: 'error' })
      .rotate()
      .webp({ quality, effort: 6 })
      .toBuffer();
    if (encoded.length > MAX_CHROME_BYTES) continue;

    const relativePath = `_chrome-media/${name}.webp`;
    write(path.join(SITE, relativePath), encoded);
    return {
      url: `${relativePath}?v=${githubSha()}`,
      bytes: encoded.length,
      size,
    };
  }

  throw new Error(`desktop chrome WebP budget exceeded for ${name}`);
}

export async function encodeDesktopBanner(sha: string): Promise<EncodedImageAsset> {
  const data = await downloadImage(BANNER.url);
  const size = await imageSize(data, 'desktop-banner');
  assert(
    size[0] === BANNER.expectedSize[0] && size[1] === BANNER.expectedSize[1],
    `desktop banner geometry changed upstream: expected ${BANNER.expectedSize.join('x')}, got ${size.join('x')}`,
  );

  const metadata = await sharp(data).metadata();
  const encoded = metadata.format === 'webp'
    ? data
    : await sharp(data).webp({ quality: 90, effort: 6 }).toBuffer();
  assert(encoded.length > 0 && encoded.length <= MAX_BANNER_BYTES, `desktop banner budget exceeded: ${encoded.length} bytes`);

  const relativePath = `_critical-media/${BANNER.outputName}`;
  write(path.join(SITE, relativePath), encoded);
  return {
    url: `${relativePath}?v=${sha}`,
    bytes: encoded.length,
    size,
  };
}
