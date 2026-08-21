import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { SITE, assert, escapeRegExp, githubSha, read, write } from '../lib/core.js';

const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
const DESKTOP_ONLY_MEDIA = [
  'desktop-logo',
  'flag-arg',
  'flag-mex',
  'flag-par',
  'flag-esp',
  'flag-uru',
  'flag-usa',
] as const;
const MOBILE_BANNER_WIDTH = 764;
const MOBILE_LOGO_BUDGET = 6_000;
const MOBILE_BANNER_BUDGET = 14_000;

interface MediaTransformResult {
  readonly html: string;
  readonly summary: string;
}

function closeToken(tag: string): '/>' | '>' {
  return tag.endsWith('/>') ? '/>' : '>';
}

function addAttribute(tag: string, attribute: string): string {
  const close = closeToken(tag);
  return `${tag.slice(0, -close.length).trimEnd()} ${attribute}${close}`;
}

async function convertMobileLogo(html: string, sha: string): Promise<MediaTransformResult> {
  const pngPath = path.join(SITE, '_critical-media/mobile-logo.png');
  assert(fs.existsSync(pngPath), 'mobile LCP PNG missing');

  const metadata = await sharp(pngPath).metadata();
  const bytes = await sharp(pngPath).webp({ lossless: true, effort: 6 }).toBuffer();
  assert(bytes.length > 0 && bytes.length <= MOBILE_LOGO_BUDGET, `mobile LCP WebP budget exceeded: ${bytes.length}`);

  const webpPath = path.join(SITE, '_critical-media/mobile-logo.webp');
  write(webpPath, bytes);
  const oldReference = `_critical-media/mobile-logo.png?v=${sha}`;
  const newReference = `_critical-media/mobile-logo.webp?v=${sha}`;
  assert(html.split(oldReference).length - 1 >= 2, 'mobile LCP image/preload references missing');

  fs.rmSync(pngPath);
  return {
    html: html.split(oldReference).join(newReference),
    summary: `${metadata.width}x${metadata.height}/${bytes.length}B`,
  };
}

async function createResponsiveBanner(html: string, sha: string): Promise<MediaTransformResult> {
  const desktopPath = path.join(SITE, '_critical-media/desktop-banner.webp');
  assert(fs.existsSync(desktopPath), 'desktop banner missing');

  const metadata = await sharp(desktopPath).metadata();
  assert(metadata.width && metadata.height, 'desktop banner metadata missing');
  const mobileHeight = Math.max(1, Math.round(metadata.height * MOBILE_BANNER_WIDTH / metadata.width));
  const mobileBytes = await sharp(desktopPath)
    .resize({ width: MOBILE_BANNER_WIDTH, height: mobileHeight, kernel: sharp.kernel.lanczos3 })
    .webp({ quality: 78, effort: 6 })
    .toBuffer();
  assert(mobileBytes.length > 0 && mobileBytes.length <= MOBILE_BANNER_BUDGET, `mobile banner budget exceeded: ${mobileBytes.length}`);
  write(path.join(SITE, '_critical-media/mobile-banner.webp'), mobileBytes);

  const desktopUrl = `_critical-media/desktop-banner.webp?v=${sha}`;
  const mobileUrl = `_critical-media/mobile-banner.webp?v=${sha}`;
  const bannerPattern = /<img\b(?=[^>]*\bclass=["'][^"']*\bimgBannerShop\b[^"']*["'])[^>]*>/i;
  const banner = bannerPattern.exec(html);
  assert(banner?.index !== undefined && banner[0].includes(desktopUrl), 'localized banner tag missing');

  let tag = banner[0].replace(/\s+(?:srcset|sizes)=["'][^"']*["']/gi, '');
  tag = addAttribute(
    tag,
    `srcset="${mobileUrl} ${MOBILE_BANNER_WIDTH}w, ${desktopUrl} ${metadata.width}w" sizes="(max-width: 992px) 100vw, 1140px"`,
  );

  return {
    html: `${html.slice(0, banner.index)}${tag}${html.slice(banner.index + banner[0].length)}`,
    summary: `${MOBILE_BANNER_WIDTH}x${mobileHeight}/${mobileBytes.length}B`,
  };
}

function deferDesktopOnlyMedia(html: string, sha: string): string {
  let result = html;
  for (const name of DESKTOP_ONLY_MEDIA) {
    const url = `_chrome-media/${name}.webp?v=${sha}`;
    const pattern = new RegExp(`<img\\b(?=[^>]*\\bsrc=["']${escapeRegExp(url)}["'])[^>]*>`, 'gi');
    const matches = [...result.matchAll(pattern)];
    assert(matches.length > 0, `desktop-only media missing: ${name}`);

    for (const match of matches.reverse()) {
      if (match.index === undefined) continue;
      let tag = match[0]
        .replace(/\bsrc=["'][^"']+["']/i, `src="${TRANSPARENT_PIXEL}"`)
        .replace(/\s+data-sc-desktop-src=["'][^"']*["']/gi, '');
      tag = addAttribute(tag, `data-sc-desktop-src="${url}"`);
      result = `${result.slice(0, match.index)}${tag}${result.slice(match.index + match[0].length)}`;
    }
  }
  return result;
}

function lazyBrandImages(html: string): string {
  return html.replace(
    /<img\b(?=[^>]*\bsrc=["']https:\/\/www\.sushiclub\.com\.ar\/uploads\/marcas\/[^"']+["'])[^>]*>/gi,
    (tag) => {
      const normalized = tag.replace(/\s+(?:loading|decoding|fetchpriority)=["'][^"']*["']/gi, '');
      return addAttribute(normalized, 'loading="lazy" decoding="async" fetchpriority="low"');
    },
  );
}

function verify(html: string, sha: string): void {
  assert(!html.includes(`_critical-media/mobile-logo.png?v=${sha}`), 'stale mobile LCP PNG reference remains');
  assert(html.includes("querySelectorAll('img[data-sc-desktop-src]')"), 'desktop breakpoint media activator missing from delivery loader');

  for (const name of DESKTOP_ONLY_MEDIA) {
    const url = `_chrome-media/${name}.webp?v=${sha}`;
    assert(
      !new RegExp(`<img\\b[^>]*\\ssrc=["']${escapeRegExp(url)}["'][^>]*>`, 'i').test(html),
      `desktop-only media remains eager on mobile: ${name}`,
    );
  }
}

class BreakpointMediaOptimizer {
  readonly #sha = githubSha();
  readonly #file = path.join(SITE, 'index.html');
  #html = read(this.#file);
  #logoSummary = '';
  #bannerSummary = '';

  async run(): Promise<void> {
    await this.#optimizeCriticalMedia();
    this.#html = deferDesktopOnlyMedia(this.#html, this.#sha);
    this.#html = lazyBrandImages(this.#html);
    verify(this.#html, this.#sha);
    write(this.#file, this.#html);
    console.log(
      `Breakpoint media optimized: mobile LCP ${this.#logoSummary}; mobile banner ${this.#bannerSummary}.`,
    );
  }

  async #optimizeCriticalMedia(): Promise<void> {
    const logo = await convertMobileLogo(this.#html, this.#sha);
    this.#html = logo.html;
    this.#logoSummary = logo.summary;

    const banner = await createResponsiveBanner(this.#html, this.#sha);
    this.#html = banner.html;
    this.#bannerSummary = banner.summary;
  }
}

export async function optimizeBreakpointMedia(): Promise<void> {
  await new BreakpointMediaOptimizer().run();
}
