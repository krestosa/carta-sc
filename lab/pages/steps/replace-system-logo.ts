import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, escapeRegExp, githubSha, read, write } from '../lib/core.js';
import {
  SYSTEM_LOGO_FILE,
  SYSTEM_LOGO_MAX_SVG_BYTES,
  SYSTEM_LOGO_STYLE_ID,
} from './system-logo-config.js';
import {
  injectSystemLogoCss,
  normalizeSystemLogoTag,
  replaceSingleHtmlTag,
} from './system-logo-markup.js';
import { SYSTEM_LOGO_SVG } from './system-logo-source.js';
import { createInitialSystemLogoCss } from './system-logo-style.js';

function writeSystemLogoSvg(target: string): number {
  const svg = SYSTEM_LOGO_SVG.trim();
  assert(/<svg\b[^>]*viewBox="0 0 312 45"/i.test(svg), 'unexpected SushiClub SVG geometry');
  assert((svg.match(/<path /g) ?? []).length === 9, 'unexpected SushiClub SVG path count');
  write(target, `${svg.replace(/>\s+</g, '><')}\n`);
  const bytes = fs.statSync(target).size;
  assert(bytes <= SYSTEM_LOGO_MAX_SVG_BYTES, 'optimized system SVG is missing or over budget');
  return bytes;
}

function replaceMobileLogo(html: string, oldUrl: string, newUrl: string): string {
  const pattern = new RegExp(
    `<img\\b(?=[^>]*\\bdata-sc-lcp-logo=["']1["'])(?=[^>]*\\bsrc=["']${escapeRegExp(oldUrl)}["'])[^>]*>`,
    'gi',
  );
  return replaceSingleHtmlTag(
    html,
    pattern,
    'generated mobile logo',
    (tag) => normalizeSystemLogoTag(tag, newUrl),
  );
}

function replaceMobilePreload(html: string, oldUrl: string, newUrl: string): string {
  const pattern = new RegExp(
    `<link\\b(?=[^>]*\\brel=["']preload["'])(?=[^>]*\\bas=["']image["'])(?=[^>]*\\bhref=["']${escapeRegExp(oldUrl)}["'])[^>]*>`,
    'gi',
  );
  return replaceSingleHtmlTag(html, pattern, 'generated mobile logo preload', (tag) => {
    let preload = tag.replace(oldUrl, newUrl).replace(/\s+media=["'][^"']*["']/gi, '');
    if (!/\stype=["']image\/svg\+xml["']/i.test(preload)) {
      preload = `${preload.slice(0, -1).trimEnd()} type="image/svg+xml">`;
    }
    return preload;
  });
}

function replaceDesktopLogo(html: string, oldUrl: string, newUrl: string): string {
  const pattern = new RegExp(
    `<img\\b(?=[^>]*\\bdata-sc-desktop-src=["']${escapeRegExp(oldUrl)}["'])[^>]*>`,
    'gi',
  );
  return replaceSingleHtmlTag(
    html,
    pattern,
    'generated desktop logo',
    (tag) => normalizeSystemLogoTag(tag, newUrl, 'data-sc-desktop-src'),
  );
}

function removeObsoleteRasterLogos(): void {
  for (const file of [
    path.join(SITE, '_critical-media', 'mobile-logo.webp'),
    path.join(SITE, '_chrome-media', 'desktop-logo.webp'),
  ]) {
    if (fs.existsSync(file)) fs.rmSync(file);
  }
}

function verifySystemLogo(
  html: string,
  oldMobile: string,
  oldDesktop: string,
  newLogo: string,
  target: string,
): void {
  assert(!html.includes(oldMobile) && !html.includes(oldDesktop), 'obsolete generated logo reference remains');
  const tags = html.match(
    /<img\b(?=[^>]*\bclass=["'][^"']*\bsc-system-brand-logo\b[^"']*["'])[^>]*>/gi,
  ) ?? [];
  assert(tags.length === 2, `system logo must appear exactly twice, found ${tags.length}`);
  assert(html.split(newLogo).length - 1 === 3, 'system logo URL must serve two images plus one preload');
  assert(
    html.split(`id="${SYSTEM_LOGO_STYLE_ID}"`).length - 1 === 1,
    'system logo critical CSS must appear exactly once',
  );
  assert(
    fs.existsSync(target) && fs.statSync(target).size <= SYSTEM_LOGO_MAX_SVG_BYTES,
    'optimized system SVG is missing or over budget',
  );
}

export function replaceSystemLogo(): void {
  const sha = githubSha();
  const indexFile = path.join(SITE, 'index.html');
  const target = path.join(SITE, SYSTEM_LOGO_FILE);
  const oldMobile = `_critical-media/mobile-logo.webp?v=${sha}`;
  const oldDesktop = `_chrome-media/desktop-logo.webp?v=${sha}`;
  const newLogo = `${SYSTEM_LOGO_FILE}?v=${sha}`;
  const bytes = writeSystemLogoSvg(target);

  let html = read(indexFile);
  html = replaceMobileLogo(html, oldMobile, newLogo);
  html = replaceMobilePreload(html, oldMobile, newLogo);
  html = replaceDesktopLogo(html, oldDesktop, newLogo);
  html = injectSystemLogoCss(html, createInitialSystemLogoCss());

  removeObsoleteRasterLogos();
  verifySystemLogo(html, oldMobile, oldDesktop, newLogo, target);
  write(indexFile, html);
  console.log(`System logo optimized: one ${bytes}B SVG shared by mobile and desktop; critical centering injected.`);
}
