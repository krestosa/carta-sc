import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { SITE, assert, read, readJson, write, writeJson } from '../lib/core.js';

type PixelSize = readonly [width: number, height: number];
type PixelBox = readonly [left: number, top: number, right: number, bottom: number];

interface OpticalBounds {
  readonly size: PixelSize;
  readonly box: PixelBox;
}

interface LogoOpticsState {
  readonly mobile_width: number;
  readonly desktop_width: number;
  readonly mobile_source: PixelSize;
  readonly mobile_bbox: PixelBox;
  readonly desktop_source: PixelSize;
  readonly desktop_bbox: PixelBox;
}

const ALPHA_THRESHOLD = 8;
const MOBILE_LAYOUT_WIDTH = 333;
const MOBILE_OPTICAL_RANGE = { min: 72, max: 240 } as const;
const DESKTOP_OPTICAL_RANGE = { min: 160, max: 280 } as const;
const STATE_FILE = '.system-logo-optics.json';
const STYLE_ID = 'sc-system-brand-css';

function opticalWidth(bounds: OpticalBounds): number {
  return bounds.box[2] - bounds.box[0];
}

async function visibleBounds(file: string): Promise<OpticalBounds> {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3] ?? 0;
      if (alpha <= ALPHA_THRESHOLD) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < 0) {
    return {
      size: [info.width, info.height],
      box: [0, 0, info.width, info.height],
    };
  }

  return {
    size: [info.width, info.height],
    box: [minX, minY, maxX + 1, maxY + 1],
  };
}

function assertOpticalWidth(width: number, range: { readonly min: number; readonly max: number }, label: string): void {
  assert(width >= range.min && width <= range.max, `unexpected ${label} logo optical width ${width}px`);
}

export async function measureSystemLogo(): Promise<void> {
  const mobileFile = path.join(SITE, '_critical-media', 'mobile-logo.webp');
  const desktopFile = path.join(SITE, '_chrome-media', 'desktop-logo.webp');
  assert(
    fs.existsSync(mobileFile) && fs.existsSync(desktopFile),
    'system-logo optical calibration inputs are missing',
  );

  const [mobile, desktop] = await Promise.all([
    visibleBounds(mobileFile),
    visibleBounds(desktopFile),
  ]);
  const mobileWidth = Math.round(MOBILE_LAYOUT_WIDTH * opticalWidth(mobile) / mobile.size[0]);
  const desktopWidth = opticalWidth(desktop);

  assertOpticalWidth(mobileWidth, MOBILE_OPTICAL_RANGE, 'mobile');
  assertOpticalWidth(desktopWidth, DESKTOP_OPTICAL_RANGE, 'desktop');

  const state: LogoOpticsState = {
    mobile_source: mobile.size,
    mobile_bbox: mobile.box,
    mobile_width: mobileWidth,
    desktop_source: desktop.size,
    desktop_bbox: desktop.box,
    desktop_width: desktopWidth,
  };
  writeJson(path.join(SITE, STATE_FILE), state);
}

function systemLogoCss(mobileWidth: number, desktopWidth: number): string {
  return `<style id="${STYLE_ID}">
body.sushiShop .sc-system-brand-logo{display:block!important;width:auto!important;height:auto!important;margin:0!important;padding:0!important;opacity:1!important;visibility:visible!important;object-fit:contain!important;object-position:center center!important;filter:invert(1)!important;transform:none!important;transition:filter var(--sc-motion-theme,560ms) cubic-bezier(.45,0,.55,1)!important}
html[data-sc-theme-resolved='dark'] body.sushiShop .sc-system-brand-logo{filter:none!important}
@media(min-width:993px){body.sushiShop .topBar.newVer17topBar{background-color:var(--sc-color-surface)!important;color:var(--sc-color-ink)!important}body.sushiShop .newVer17topBar span,body.sushiShop .newVer17topBar a,body.sushiShop .newVer17topBar .dropdown a,body.sushiShop .newVer17topBar .top-reservas span a,body.sushiShop .newVer17topBar .socialTop .fa{color:var(--sc-color-ink)!important}body.sushiShop .newVer17topBar .brandCol,body.sushiShop .newVer17topBar .main-nav,body.sushiShop .newVer17topBar .nav{background-color:transparent!important}body.sushiShop .newVer17topBar .brand:has(.sc-system-brand-logo){box-sizing:border-box!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;width:${desktopWidth}px!important;max-width:${desktopWidth}px!important;height:55px!important;max-height:55px!important;margin:0 auto!important;padding:0!important;line-height:0!important;vertical-align:top!important}body.sushiShop .newVer17topBar .brand:has(.sc-system-brand-logo)>a{display:flex!important;position:static!important;top:auto!important;left:auto!important;align-items:center!important;justify-content:center!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important;line-height:0!important;transform:none!important}body.sushiShop .newVer17topBar .sc-system-brand-logo{width:${desktopWidth}px!important;max-width:${desktopWidth}px!important;height:auto!important;max-height:45px!important}}
@media(max-width:992px){body.sushiShop .brandOnlyMobile:has(.sc-system-brand-logo){display:flex!important;position:relative!important;align-items:center!important;justify-content:center!important;height:var(--sc-mobile-header-height,100px)!important;margin:0!important;padding:0!important}body.sushiShop .brandOnlyMobile:has(.sc-system-brand-logo)>a{display:flex!important;position:static!important;top:auto!important;right:auto!important;bottom:auto!important;left:auto!important;align-items:center!important;justify-content:center!important;width:${mobileWidth}px!important;max-width:calc(100vw - 96px)!important;height:100%!important;margin:0!important;padding:0!important;line-height:0!important;transform:none!important}body.sushiShop .brandOnlyMobile .sc-system-brand-logo{width:${mobileWidth}px!important;max-width:100%!important;height:auto!important;max-height:45px!important;aspect-ratio:312/45!important}}
</style>`;
}

export function applySystemLogoOptics(): void {
  const indexFile = path.join(SITE, 'index.html');
  const stateFile = path.join(SITE, STATE_FILE);
  assert(
    fs.existsSync(indexFile) && fs.existsSync(stateFile),
    'system-logo optical calibration state is missing',
  );

  const state = readJson<LogoOpticsState>(stateFile);
  let html = read(indexFile);
  const start = html.indexOf(`<style id="${STYLE_ID}">`);
  const endStart = html.indexOf('</style>', start);
  assert(start >= 0 && endStart >= 0, 'system logo critical CSS was not generated');

  const css = systemLogoCss(state.mobile_width, state.desktop_width);
  html = `${html.slice(0, start)}${css}${html.slice(endStart + '</style>'.length)}`;
  write(indexFile, html);
  fs.rmSync(stateFile);
}
