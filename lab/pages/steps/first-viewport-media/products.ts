import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert } from '../../lib/core.js';
import {
  FIRST_VIEWPORT_COUNT,
  MAX_PRODUCT_BYTES,
  type FirstViewportStat,
} from './config.js';
import { downloadImage, encodeProductImage } from './images.js';

const PRODUCT_SOURCE_PATTERN = /<img\b(?=[^>]*\bdata-sc-src=["'](?<src>https:\/\/www\.sushiclub\.com\.ar\/uploads_shop\/productos\/[^"']+)["'])[^>]*>/gi;

interface Replacement {
  readonly start: number;
  readonly end: number;
  readonly tag: string;
}

export interface FirstViewportResult {
  readonly html: string;
  readonly stats: readonly FirstViewportStat[];
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
    .reduce(
      (current, replacement) =>
        `${current.slice(0, replacement.start)}${replacement.tag}${current.slice(replacement.end)}`,
      html,
    );
}

export async function optimizeFirstViewportProducts(html: string): Promise<FirstViewportResult> {
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

export function verifyFirstViewportAssets(html: string): void {
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

export function summarizeFirstViewport(stats: readonly FirstViewportStat[]): string {
  return stats
    .map((stat) => `${stat.index}:${stat.bytes}B/${stat.size[0]}x${stat.size[1]}`)
    .join(', ');
}
