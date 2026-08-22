import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, escapeRegExp } from '../../lib/core.js';
import {
  BANNER,
  COUNTRY_LINKS,
  type ChromeMediaStat,
} from './config.js';

export function verifyDesktopAssets(html: string, sha: string): void {
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

  const bannerPattern = new RegExp(
    `<img\\b(?=[^>]*\\bclass=["'][^"']*\\bimgBannerShop\\b)(?=[^>]*\\bsrc=["']_critical-media/desktop-banner\\.webp\\?v=${escapeRegExp(sha)}["'])(?=[^>]*\\bwidth=["']1500["'])(?=[^>]*\\bheight=["']157["'])[^>]*>`,
    'i',
  );
  assert(bannerPattern.test(html), 'desktop banner lost localized intrinsic geometry');

  const logoPattern = new RegExp(
    `<img\\b(?=[^>]*\\bsrc=["']_chrome-media/desktop-logo\\.webp\\?v=${escapeRegExp(sha)}["'])(?=[^>]*\\bwidth=["'][1-9][0-9]*["'])(?=[^>]*\\bheight=["'][1-9][0-9]*["'])[^>]*>`,
    'i',
  );
  assert(logoPattern.test(html), 'desktop logo intrinsic dimensions missing');

  for (const [name, label] of COUNTRY_LINKS) {
    const localUrl = `_chrome-media/${name}.webp?v=${sha}`;
    const pattern = new RegExp(
      `<a\\b(?=[^>]*\\baria-label=["']${escapeRegExp(label)}["'])[^>]*>(?:(?!<\\/a>).)*?<img\\b(?=[^>]*\\bsrc=["']${escapeRegExp(localUrl)}["'])(?=[^>]*\\balt=["']["'])[^>]*>(?:(?!<\\/a>).)*?<\\/a>`,
      'is',
    );
    assert(pattern.test(html), `accessibility normalization missing for country ${label}`);
  }
}

export function summarizeChrome(stats: readonly ChromeMediaStat[]): string {
  return stats
    .map((stat) => `${stat.name}:${stat.count}x/${stat.size[0]}x${stat.size[1]}/${stat.bytes}B`)
    .join(', ');
}
