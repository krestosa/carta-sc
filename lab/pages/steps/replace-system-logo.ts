import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, escapeRegExp, githubSha, read, write } from '../lib/core.js';
import { SYSTEM_LOGO_SVG } from './system-logo-source.js';

type LogoSourceAttribute = 'src' | 'data-sc-desktop-src';

const SYSTEM_LOGO_FILE = '_critical-media/sushiclub-logo.svg';
const SYSTEM_LOGO_SIZE = { width: 312, height: 45 } as const;
const MAX_SVG_BYTES = 7_000;
const BLOCKED_INLINE_PROPERTIES = new Set([
  'margin-left',
  'width',
  'height',
  'max-width',
  'max-height',
  'transform',
]);

const INITIAL_CRITICAL_CSS = `<style id="sc-system-brand-css">
body.sushiShop .sc-system-brand-logo{display:block!important;flex:0 0 auto!important;width:312px!important;max-width:100%!important;height:45px!important;max-height:45px!important;margin:0!important;padding:0!important;opacity:1!important;visibility:visible!important;object-fit:contain!important;object-position:center center!important;filter:invert(1)!important;transform:none!important;transition:filter var(--sc-motion-theme,560ms) cubic-bezier(.45,0,.55,1)!important}
html[data-sc-theme-resolved='dark'] body.sushiShop .sc-system-brand-logo{filter:none!important}
@media(min-width:993px){body.sushiShop .newVer17topBar .brand:has(.sc-system-brand-logo){box-sizing:border-box!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;width:312px!important;max-width:312px!important;height:55px!important;max-height:55px!important;margin:0 auto!important;padding:0!important;line-height:0!important;vertical-align:top!important}body.sushiShop .newVer17topBar .brand:has(.sc-system-brand-logo)>a{display:flex!important;align-items:center!important;justify-content:center!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important;line-height:0!important}}
@media(max-width:992px){body.sushiShop .brandOnlyMobile:has(.sc-system-brand-logo){display:flex!important;align-items:center!important;justify-content:center!important}body.sushiShop .brandOnlyMobile:has(.sc-system-brand-logo)>a{display:flex!important;align-items:center!important;justify-content:center!important;width:312px!important;max-width:calc(100vw - 120px)!important;height:var(--sc-mobile-header-height,100px)!important;margin:0!important;padding:0!important;line-height:0!important}body.sushiShop .brandOnlyMobile .sc-system-brand-logo{width:312px!important;max-width:100%!important;height:auto!important;max-height:45px!important;aspect-ratio:312/45!important}}
</style>`;

function cleanInlineStyle(tag: string): string {
  const style = /\s+style=["'](?<value>[^"']*)["']/i.exec(tag);
  const value = style?.groups?.value;
  if (!value || style.index === undefined) return tag;

  const kept = value
    .split(';')
    .map((declaration) => declaration.trim())
    .filter((declaration) => {
      const separator = declaration.indexOf(':');
      if (separator < 0) return false;
      const property = declaration.slice(0, separator).trim().toLowerCase();
      return !BLOCKED_INLINE_PROPERTIES.has(property);
    });
  const replacement = kept.length ? ` style="${kept.join('; ')}"` : '';
  return `${tag.slice(0, style.index)}${replacement}${tag.slice(style.index + style[0].length)}`;
}

function addSystemLogoClass(tag: string): string {
  let classChanged = false;
  const withClass = tag.replace(
    /\s+class=["'](?<classes>[^"']*)["']/i,
    (_match, ...args: unknown[]) => {
      const groups = args.at(-1) as { classes?: string } | undefined;
      const classes = [...new Set(`${groups?.classes ?? ''} sc-system-brand-logo`.trim().split(/\s+/))].join(' ');
      classChanged = true;
      return ` class="${classes}"`;
    },
  );
  if (classChanged) return withClass;

  const close = withClass.endsWith('/>') ? '/>' : '>';
  return `${withClass.slice(0, -close.length).trimEnd()} class="sc-system-brand-logo"${close}`;
}

function normalizeLogoTag(
  sourceTag: string,
  newLogo: string,
  sourceAttribute: LogoSourceAttribute = 'src',
): string {
  let tag = addSystemLogoClass(
    cleanInlineStyle(sourceTag).replace(/\s+(?:width|height)=["'][^"']*["']/gi, ''),
  );

  if (sourceAttribute === 'data-sc-desktop-src') {
    tag = tag.replace(/\s+data-sc-desktop-src=["'][^"']*["']/i, '');
  }
  tag = tag.replace(/\bsrc=["'][^"']*["']/i, `src="${newLogo}"`);

  const close = tag.endsWith('/>') ? '/>' : '>';
  return `${tag.slice(0, -close.length).trimEnd()} width="${SYSTEM_LOGO_SIZE.width}" height="${SYSTEM_LOGO_SIZE.height}"${close}`;
}

function replaceSingleTag(
  html: string,
  pattern: RegExp,
  label: string,
  replacement: (tag: string) => string,
): string {
  const matches = [...html.matchAll(pattern)];
  const match = matches[0];
  assert(matches.length === 1 && match?.index !== undefined, `expected one ${label}, found ${matches.length}`);
  return `${html.slice(0, match.index)}${replacement(match[0])}${html.slice(match.index + match[0].length)}`;
}

function writeSystemLogoSvg(target: string): number {
  const svg = SYSTEM_LOGO_SVG.trim();
  assert(/<svg\b[^>]*viewBox="0 0 312 45"/i.test(svg), 'unexpected SushiClub SVG geometry');
  assert((svg.match(/<path /g) ?? []).length === 9, 'unexpected SushiClub SVG path count');
  write(target, `${svg.replace(/>\s+</g, '><')}\n`);
  const bytes = fs.statSync(target).size;
  assert(bytes <= MAX_SVG_BYTES, 'optimized system SVG is missing or over budget');
  return bytes;
}

function replaceMobileLogo(html: string, oldUrl: string, newUrl: string): string {
  const pattern = new RegExp(
    `<img\\b(?=[^>]*\\bdata-sc-lcp-logo=["']1["'])(?=[^>]*\\bsrc=["']${escapeRegExp(oldUrl)}["'])[^>]*>`,
    'gi',
  );
  return replaceSingleTag(html, pattern, 'generated mobile logo', (tag) => normalizeLogoTag(tag, newUrl));
}

function replaceMobilePreload(html: string, oldUrl: string, newUrl: string): string {
  const pattern = new RegExp(
    `<link\\b(?=[^>]*\\brel=["']preload["'])(?=[^>]*\\bas=["']image["'])(?=[^>]*\\bhref=["']${escapeRegExp(oldUrl)}["'])[^>]*>`,
    'gi',
  );
  return replaceSingleTag(html, pattern, 'generated mobile logo preload', (tag) => {
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
  return replaceSingleTag(
    html,
    pattern,
    'generated desktop logo',
    (tag) => normalizeLogoTag(tag, newUrl, 'data-sc-desktop-src'),
  );
}

function injectCriticalCss(html: string): string {
  assert(!html.includes('id="sc-system-brand-css"'), 'system logo critical CSS already exists');
  const headClose = /<\/head\s*>/i.exec(html);
  assert(headClose?.index !== undefined, 'document head closing tag missing');
  return `${html.slice(0, headClose.index)}${INITIAL_CRITICAL_CSS}\n${html.slice(headClose.index)}`;
}

function removeObsoleteRasterLogos(): void {
  for (const file of [
    path.join(SITE, '_critical-media', 'mobile-logo.webp'),
    path.join(SITE, '_chrome-media', 'desktop-logo.webp'),
  ]) {
    if (fs.existsSync(file)) fs.rmSync(file);
  }
}

function verifySystemLogo(html: string, oldMobile: string, oldDesktop: string, newLogo: string, target: string): void {
  assert(!html.includes(oldMobile) && !html.includes(oldDesktop), 'obsolete generated logo reference remains');
  const tags = html.match(/<img\b(?=[^>]*\bclass=["'][^"']*\bsc-system-brand-logo\b[^"']*["'])[^>]*>/gi) ?? [];
  assert(tags.length === 2, `system logo must appear exactly twice, found ${tags.length}`);
  assert(html.split(newLogo).length - 1 === 3, 'system logo URL must serve two images plus one preload');
  assert(html.split('id="sc-system-brand-css"').length - 1 === 1, 'system logo critical CSS must appear exactly once');
  assert(fs.existsSync(target) && fs.statSync(target).size <= MAX_SVG_BYTES, 'optimized system SVG is missing or over budget');
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
  html = injectCriticalCss(html);

  removeObsoleteRasterLogos();
  verifySystemLogo(html, oldMobile, oldDesktop, newLogo, target);
  write(indexFile, html);
  console.log(`System logo optimized: one ${bytes}B SVG shared by mobile and desktop; critical centering injected.`);
}
