import { assert } from '../../lib/core.js';
import {
  ORIGIN,
  REQUEST_TIMEOUT_MS,
  USER_AGENT,
  type DownloadResponse,
} from './config.js';

export async function requestAsset(url: string): Promise<DownloadResponse> {
  const response = await fetch(url, {
    headers: {
      'user-agent': USER_AGENT,
      referer: `${ORIGIN}carta_delivery.php`,
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return {
    bytes: Buffer.from(await response.arrayBuffer()),
    contentType: (response.headers.get('content-type') ?? '').toLowerCase(),
  };
}

export async function verifyCriticalImages(): Promise<void> {
  for (const url of [
    `${ORIGIN}gfx/web-sushiclub2_black_m2.png`,
    `${ORIGIN}gfx/web-sushiclub2_black.png`,
  ]) {
    const response = await requestAsset(url);
    assert(
      response.contentType.startsWith('image/'),
      `Critical SushiClub image is not usable: type=${response.contentType || '(missing)'}, url=${url}`,
    );
  }
}
