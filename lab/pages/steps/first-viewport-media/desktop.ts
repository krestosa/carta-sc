import path from 'node:path';
import { assert } from '../../lib/core.js';
import {
  BANNER,
  CHROME_MEDIA,
  COUNTRY_LINKS,
  DIMENSION_ONLY_MEDIA,
  MAX_CHROME_TOTAL_BYTES,
  type ChromeMediaStat,
  type DesktopMediaStats,
  type DimensionStat,
  type ImageSize,
} from './config.js';
import {
  downloadImage,
  encodeChromeImage,
  encodeDesktopBanner,
  imageSize,
} from './images.js';
import {
  ensureRemoteImageDimensions,
  normalizeCountryLink,
  replaceImageSource,
} from './html.js';

const BANNER_TAG_PATTERN = /<img\b(?=[^>]*\bclass=["'][^"']*\bimgBannerShop\b[^"']*["'])[^>]*>/i;
const BANNER_PRELOAD_PATTERN = /<link\b(?=[^>]*\brel=["']preload["'])(?=[^>]*\bas=["']image["'])[^>]*>/gi;

export interface DesktopResult {
  readonly html: string;
  readonly stats: DesktopMediaStats;
}

function localizeBannerTag(html: string, url: string, size: ImageSize): string {
  const match = BANNER_TAG_PATTERN.exec(html);
  assert(match?.index !== undefined, 'desktop banner image missing');
  assert(match[0].includes(BANNER.url), 'unexpected desktop banner source before localization');

  const close = match[0].endsWith('/>') ? '/>' : '>';
  const normalized = match[0]
    .replace(/\bsrc=["'][^"']+["']/i, `src="${url}"`)
    .replace(/\s+(?:width|height|loading|decoding|fetchpriority)=["'][^"']*["']/gi, '');
  const attributes = [
    `width="${size[0]}"`,
    `height="${size[1]}"`,
    'loading="eager"',
    'decoding="async"',
    'fetchpriority="auto"',
  ].join(' ');
  const tag = `${normalized.slice(0, -close.length).trimEnd()} ${attributes}${close}`;
  return `${html.slice(0, match.index)}${tag}${html.slice(match.index + match[0].length)}`;
}

function localizeBannerPreload(html: string, url: string): string {
  const matches = [...html.matchAll(BANNER_PRELOAD_PATTERN)].filter((match) => match[0].includes(BANNER.url));
  const preload = matches[0];
  assert(matches.length === 1 && preload?.index !== undefined, `expected one desktop banner preload, found ${matches.length}`);

  const replacement = preload[0].replace(BANNER.url, url);
  assert(
    /\bmedia=["']\(min-width:\s*993px\)["']/i.test(replacement),
    'desktop banner preload lost desktop media gate',
  );
  return `${html.slice(0, preload.index)}${replacement}${html.slice(preload.index + preload[0].length)}`;
}

export async function optimizeDesktopStability(html: string, sha: string): Promise<DesktopResult> {
  const banner = await encodeDesktopBanner(sha);
  let result = localizeBannerTag(html, banner.url, banner.size);
  result = localizeBannerPreload(result, banner.url);

  const mediaStats: ChromeMediaStat[] = [];
  const localizedMedia = new Map<string, string>();
  let totalChromeBytes = 0;

  for (const definition of CHROME_MEDIA) {
    const asset = await encodeChromeImage(await downloadImage(definition.url), definition.name);
    totalChromeBytes += asset.bytes;
    assert(
      totalChromeBytes <= MAX_CHROME_TOTAL_BYTES,
      `desktop chrome total WebP budget exceeded: ${totalChromeBytes} bytes`,
    );

    const mutation = replaceImageSource(result, definition.url, asset.url, asset.size);
    assert(mutation.count >= 1, `expected desktop chrome image not found: ${definition.url}`);
    result = mutation.html;
    localizedMedia.set(definition.name, asset.url);
    mediaStats.push({ name: definition.name, count: mutation.count, ...asset });
  }

  let countryLinks = 0;
  for (const [name, label] of COUNTRY_LINKS) {
    const localUrl = localizedMedia.get(name);
    assert(localUrl, `localized country media missing: ${name}`);
    const mutation = normalizeCountryLink(result, localUrl, label);
    assert(mutation.count >= 1, `country link not found for ${label}`);
    result = mutation.html;
    countryLinks += mutation.count;
  }

  const dimensions: DimensionStat[] = [];
  for (const url of DIMENSION_ONLY_MEDIA) {
    const name = path.basename(new URL(url).pathname);
    const size = await imageSize(await downloadImage(url), name);
    const mutation = ensureRemoteImageDimensions(result, url, size);
    assert(mutation.count >= 1, `dimension-only image not found: ${url}`);
    result = mutation.html;
    dimensions.push({ name, count: mutation.count, size });
  }

  return {
    html: result,
    stats: {
      bannerBytes: banner.bytes,
      bannerSize: banner.size,
      media: mediaStats,
      countryLinks,
      dimensions,
    },
  };
}
