import path from 'node:path';
import { SITE, assert, escapeRegExp, read, write } from '../lib/core.js';

interface BackgroundReplacement {
  readonly url: string;
  readonly expectedCount: number;
}

const TRAIT_IMAGE_PATTERN = /<img\b[^>]*>/gi;
const LEGACY_TRAIT_SOURCE = /\s+src=(["'])(https:\/\/www\.sushiclub\.com\.ar\/gfx\/sabor_(?:pic_[0-3]|vegano)\.png)\1/i;
const SUPERSEDED_BACKGROUNDS: readonly BackgroundReplacement[] = [
  { url: 'https://www.sushiclub.com.ar/gfx/back_body_01.png', expectedCount: 1 },
  { url: 'https://www.sushiclub.com.ar/gfx/back_body_01_white.png', expectedCount: 1 },
  { url: 'https://www.sushiclub.com.ar/gfx/scrollTab2.png', expectedCount: 2 },
];
const EXPECTED_TRAIT_ASSETS = 5;

function stripLegacyTraitSources(html: string): { readonly html: string; readonly count: number; readonly urls: ReadonlySet<string> } {
  const urls = new Set<string>();
  let count = 0;

  const result = html.replace(TRAIT_IMAGE_PATTERN, (tag) => {
    const source = LEGACY_TRAIT_SOURCE.exec(tag);
    const url = source?.[2];
    if (!source || !url || source.index === undefined) return tag;

    assert(
      /\bdata-original-title=(["'])[^"']+\1/i.test(tag),
      `legacy trait image lacks metadata: ${url}`,
    );
    count += 1;
    urls.add(url);

    let normalized = `${tag.slice(0, source.index)}${tag.slice(source.index + source[0].length)}`;
    normalized = normalized.replace(/\s+data-toggle=(["'])tooltip\1/i, '');
    if (!/\baria-hidden=/i.test(normalized)) {
      normalized = `${normalized.slice(0, -1).trimEnd()} aria-hidden="true">`;
    }
    return normalized;
  });

  return { html: result, count, urls };
}

function removeBackground(html: string, replacement: BackgroundReplacement): string {
  const pattern = new RegExp(
    `background-image\\s*:\\s*url\\(\\s*(["']?)${escapeRegExp(replacement.url)}\\1\\s*\\)`,
    'gi',
  );
  let count = 0;
  const result = html.replace(pattern, () => {
    count += 1;
    return 'background-image:none';
  });

  assert(
    count === replacement.expectedCount,
    `superseded CSS asset contract mismatch for ${replacement.url}: ${count} != ${replacement.expectedCount}`,
  );
  assert(!result.includes(replacement.url), `superseded CSS background URL remains in final HTML: ${replacement.url}`);
  return result;
}

export function pruneSupersededMedia(): void {
  const file = path.join(SITE, 'index.html');
  const traitResult = stripLegacyTraitSources(read(file));
  assert(traitResult.count > 0, 'no legacy trait image sources found to prune');
  assert(
    traitResult.urls.size === EXPECTED_TRAIT_ASSETS,
    `expected ${EXPECTED_TRAIT_ASSETS} unique legacy trait assets, found ${traitResult.urls.size}`,
  );

  let html = traitResult.html;
  for (const background of SUPERSEDED_BACKGROUNDS) html = removeBackground(html, background);
  write(file, html);
}
