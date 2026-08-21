import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, escapeRegExp, githubSha, read, write } from '../lib/core.js';
import {
  BANNER,
  CHROME_MEDIA,
  COUNTRY_LINKS,
  DIMENSION_ONLY_MEDIA,
  FIRST_VIEWPORT_COUNT,
  MAX_CHROME_TOTAL_BYTES,
  MAX_PRODUCT_BYTES,
  type ChromeMediaStat,
  type DesktopMediaStats,
  type DimensionStat,
  type FirstViewportStat,
  type ImageSize,
} from './first-viewport-media/config.js';
import {
  downloadImage,
  encodeChromeImage,
  encodeDesktopBanner,
  encodeProductImage,
  imageSize,
} from './first-viewport-media/images.js';
import {
  ensureRemoteImageDimensions,
  normalizeCountryLink,
  replaceImageSource,
} from './first-viewport-media/html.js';

const PRODUCT_SOURCE_PATTERN = /<img\b(?=[^>]*\bdata-sc-src=["'](?<src>https:\/\/www\.sushiclub\.com\.ar\/uploads_shop\/productos\/[^"']+)["'])[^>]*>/gi;
const BANNER_TAG_PATTERN = /<img\b(?=[^>]*\bclass=["'][^"']*\bimgBannerShop\b[^"']*["'])[^>]*>/i;
const BANNER_PRELOAD_PATTERN = /<link\b(?=[^>]*\brel=["']preload["'])(?=[^>]*\bas=["']image["'])[^>]*>/gi;

interface Replacement {
  readonly start: number;
  readonly end: number;
  readonly tag: string;
}

interface FirstViewportResult {
  readonly html: string;
  readonly stats: readonly FirstViewportStat[];
}

interface DesktopResult {
  readonly html: string;
  readonly stats: DesktopMediaStats;
}

function addFirstViewportMarker(tag: string, source: string, index: number): string {
  const close = tag.endsWith('/>') ? '/>' : '>';
  const normalized = tag
    .replace(/\bdata-sc-src=["'][^"']+["']/i, `data-sc-src="${source}"`)
    .replace(/\s+data-sc-first-viewport=["'][^"']*["']/gi, '');
  return `${normalized.slice(0, -close.length).trimEnd()} data-sc-first-viewport="${index}"${close}`;
}

function applyReplacements(html: string, replacements: readonly Replacement[]): string {
  return [...replacements]
    .sort((left, right) => right.start - left.start)
    .reduce((current, replacement) => (
      `${current.slice(0, replacement.start)}${replacement.tag}${current.slice(replacement.end)}`
    ), html);
}

async function optimizeFirstViewportProducts(html: string): Promise<FirstViewportResult> {
  const matches = [...html.matchAll(PRODUCT_SOURCE_PATTERN)];
  assert(
    matches.length >= FIRST_VIEWPORT_COUNT,
    `expected at least ${FIRST_VIEWPORT_COUNT} hard-lazy products, found ${matches.length}`,
  );

  const replacements: Replacement[] = [];
  const stats: FirstViewportStat[] = [];

  for (let offset = 0; offset < FIRST_VIEWPORT_COUNT; offset += 1) {
    const match = matches[offset];
    const source = match?.groups?.src;
    assert(match?.index !== undefined && source, 'first-viewport product source missing');

    const index = offset + 1;
    const asset = await encodeProductImage(await downloadImage(source), `product-${index}`);
    replacements.push({
      start: match.index,
      end: match.index + match[0].length,
      tag: addFirstViewportMarker(match[0], asset.url, index),
    });
    stats.push({ index, bytes: asset.bytes, size: asset.size });
  }

  return { html: applyReplacements(html, replacements), stats };
}

function localizeBannerTag(html: string, url: string, size: ImageSize): string {
  const match = BANNER_TAG_PATTERN.exec(html);
  assert(match?.index !== undefined, 'desktop banner image missing');
  assert(match[0].includes(BANNER.url), 'unexpected desktop banner source before localization');

  const close = match[0].endsWith('/>') ? '/>' : '>';
  const normalized = match[0]
    .replace(/\bsrc=["'][^"']+["']/i, `src="${url}"`)
    .replace(/\s+(?:width|height|loading|decoding|fetchpriority)=["'][^"']*["']/gi, '');
  const tag = `${normalized.slice(0, -close.length).trimEnd()} width="${size[0]}" height="${size[1]}" loading="eager" decoding="async" fetchpriority="auto"${close}`;
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

async function optimizeDesktopStability(html: string, sha: string): Promise<DesktopResult> {
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

function verifyFirstViewportAssets(html: string): void {
  assert(
    html.split('data-sc-first-viewport=').length - 1 === FIRST_VIEWPORT_COUNT,
    'first-viewport product marker count mismatch',
  );

  for (let index = 1; index <= FIRST_VIEWPORT_COUNT; index += 1) {
    const file = path.join(SITE, `_first-viewport/product-${index}.webp`);
    assert(
      fs.existsSync(file) && fs.statSync(file).size <= MAX_PRODUCT_BYTES,
      `invalid first-viewport product asset: ${file}`,
    );
  }

  assert(
    html.includes("querySelectorAll('img[data-sc-first-viewport][data-sc-src]')"),
    'delivery loader does not release first-viewport products after LCP media',
  );
}

function verifyDesktopAssets(html: string, sha: string): void {
  assert(!html.includes(BANNER.url), 'remote desktop banner remains after localization');
  assert(!html.includes('web-sushiclub2_black.png'), 'remote desktop logo remains after localization');
  assert(
    (html.match(/_chrome-media\/flag-/g) ?? []).length >= COUNTRY_LINKS.length,
    'country chrome-media localization incomplete',
  );
  assert(
    fs.existsSync(path.join(SITE, '_critical-media', BANNER.outputName)),
    'localized desktop banner missing',
  );

  assert(
    new RegExp(
      `<img\\b(?=[^>]*\\bclass=["'][^"']*\\bimgBannerShop\\b)(?=[^>]*\\bsrc=["']_critical-media/desktop-banner\\.webp\\?v=${escapeRegExp(sha)}["'])(?=[^>]*\\bwidth=["']1500["'])(?=[^>]*\\bheight=["']157["'])[^>]*>`,
      'i',
    ).test(html),
    'desktop banner lost localized intrinsic geometry',
  );
  assert(
    new RegExp(
      `<img\\b(?=[^>]*\\bsrc=["']_chrome-media/desktop-logo\\.webp\\?v=${escapeRegExp(sha)}["'])(?=[^>]*\\bwidth=["'][1-9][0-9]*["'])(?=[^>]*\\bheight=["'][1-9][0-9]*["'])[^>]*>`,
      'i',
    ).test(html),
    'desktop logo intrinsic dimensions missing',
  );

  for (const [name, label] of COUNTRY_LINKS) {
    const localUrl = `_chrome-media/${name}.webp?v=${sha}`;
    const pattern = new RegExp(
      `<a\\b(?=[^>]*\\baria-label=["']${escapeRegExp(label)}["'])[^>]*>(?:(?!<\\/a>).)*?<img\\b(?=[^>]*\\bsrc=["']${escapeRegExp(localUrl)}["'])(?=[^>]*\\balt=["']["'])[^>]*>(?:(?!<\\/a>).)*?<\\/a>`,
      'is',
    );
    assert(pattern.test(html), `accessibility normalization missing for country ${label}`);
  }
}

function summarizeFirstViewport(stats: readonly FirstViewportStat[]): string {
  return stats
    .map((stat) => `${stat.index}:${stat.bytes}B/${stat.size[0]}x${stat.size[1]}`)
    .join(', ');
}

function summarizeChrome(stats: readonly ChromeMediaStat[]): string {
  return stats
    .map((stat) => `${stat.name}:${stat.count}x/${stat.size[0]}x${stat.size[1]}/${stat.bytes}B`)
    .join(', ');
}

export async function optimizeFirstViewportMedia(): Promise<void> {
  const sha = githubSha();
  const indexFile = path.join(SITE, 'index.html');
  const source = read(indexFile);

  const firstViewport = await optimizeFirstViewportProducts(source);
  const desktop = await optimizeDesktopStability(firstViewport.html, sha);

  verifyFirstViewportAssets(desktop.html);
  verifyDesktopAssets(desktop.html, sha);
  write(indexFile, desktop.html);

  console.log(
    `Optimized ${FIRST_VIEWPORT_COUNT} first-viewport products after logo readiness: ${summarizeFirstViewport(firstViewport.stats)}. `
      + `Desktop stability: banner ${desktop.stats.bannerSize[0]}x${desktop.stats.bannerSize[1]}/${desktop.stats.bannerBytes}B same-origin; `
      + `${summarizeChrome(desktop.stats.media)}; ${desktop.stats.countryLinks} country links labelled.`,
  );
}
