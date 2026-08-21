import { assert } from '../../lib/core.js';
import { FIRST_VIEWPORT_COUNT } from '../first-viewport-media/config.js';

export interface PromotedProducts {
  readonly html: string;
  readonly sources: readonly string[];
}

export function promoteFirstViewportProducts(html: string, sha: string): PromotedProducts {
  let result = html;
  const promoted: string[] = [];

  for (let index = 1; index <= FIRST_VIEWPORT_COUNT; index += 1) {
    const pattern = new RegExp(`<img\\b(?=[^>]*\\bdata-sc-first-viewport=["']${index}["'])[^>]*>`, 'gi');
    const matches = [...result.matchAll(pattern)];
    const match = matches[0];
    assert(matches.length === 1 && match?.index !== undefined, `first-viewport product ${index} count mismatch: ${matches.length}`);

    const source = /\bdata-sc-src=["']([^"']+)["']/i.exec(match[0])?.[1];
    const expected = `_first-viewport/product-${index}.webp?v=${sha}`;
    assert(source === expected, `unexpected first-viewport product ${index} source: ${source}`);

    let tag = match[0].replace(/\s+(?:src|data-sc-src|loading|decoding|fetchpriority)=["'][^"']*["']/gi, '');
    const close = tag.endsWith('/>') ? '/>' : '>';
    tag = `${tag.slice(0, -close.length).trimEnd()} src="${source}" loading="eager" decoding="async" fetchpriority="high"${close}`;
    result = `${result.slice(0, match.index)}${tag}${result.slice(match.index + match[0].length)}`;
    promoted.push(source);
  }

  return { html: result, sources: promoted };
}

export function injectProductPreload(html: string, source: string): string {
  assert(source.length > 0, 'product LCP preload source is empty');
  assert(!html.includes('id="sc-product-lcp-preload"'), 'product LCP preload already exists');
  const head = /<head\b[^>]*>/i.exec(html);
  assert(head?.index !== undefined, 'head missing while injecting product LCP preload');
  const insertion = head.index + head[0].length;
  const preload = `\n<link id="sc-product-lcp-preload" rel="preload" as="image" href="${source}" fetchpriority="high">`;
  return `${html.slice(0, insertion)}${preload}${html.slice(insertion)}`;
}
