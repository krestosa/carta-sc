import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, githubSha, read, write } from '../lib/core.js';

interface LocalFontAsset {
  readonly data: Buffer;
  readonly suffix: FontSuffix;
  readonly mime: FontMime;
}

interface FontReplacement {
  readonly start: number;
  readonly end: number;
  readonly css: string;
}

type FontSuffix = '.woff2' | '.woff' | '.ttf' | '.otf';
type FontMime = 'font/woff2' | 'font/woff' | 'font/ttf' | 'font/otf';

const FIRST_VIEWPORT_COUNT = 4;
const FONT_DOWNLOAD_ATTEMPTS = 3;
const FONT_DOWNLOAD_TIMEOUT_MS = 10_000;
const FONT_RETRY_DELAY_MS = 500;
const MAX_FONT_BYTES = 180_000;
const MIN_LOCAL_FONT_BYTES = 1_000;
const FONT_SUFFIXES = new Set<FontSuffix>(['.woff2', '.woff', '.ttf', '.otf']);
const FONT_MIME: Readonly<Record<FontSuffix, FontMime>> = {
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};
const ALLOWED_FONT_CONTENT_TYPES = new Set([
  'application/font-sfnt',
  'application/octet-stream',
]);

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function normalizeFontSuffix(url: string): FontSuffix {
  const suffix = path.extname(new URL(url).pathname).toLowerCase() as FontSuffix;
  return FONT_SUFFIXES.has(suffix) ? suffix : '.woff2';
}

async function fetchFont(url: string): Promise<LocalFontAsset> {
  let lastError: unknown;

  for (let attempt = 0; attempt < FONT_DOWNLOAD_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(FONT_DOWNLOAD_TIMEOUT_MS),
      });
      assert(response.ok, `HTTP ${response.status}`);

      const data = Buffer.from(await response.arrayBuffer());
      const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
      assert(data.length > 0 && data.length <= MAX_FONT_BYTES, `invalid font byte size: ${data.length}`);
      assert(
        contentType.startsWith('font/') || ALLOWED_FONT_CONTENT_TYPES.has(contentType),
        `unexpected font content type: ${contentType}`,
      );

      const suffix = normalizeFontSuffix(url);
      return { data, suffix, mime: FONT_MIME[suffix] };
    } catch (error: unknown) {
      lastError = error;
      if (attempt + 1 < FONT_DOWNLOAD_ATTEMPTS) await delay(FONT_RETRY_DELAY_MS * (attempt + 1));
    }
  }

  throw new Error(`cannot localize Roboto font ${url}: ${errorMessage(lastError)}`);
}

function promoteFirstViewportProducts(html: string, sha: string): { readonly html: string; readonly sources: readonly string[] } {
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

function injectProductPreload(html: string, source: string): string {
  assert(!html.includes('id="sc-product-lcp-preload"'), 'product LCP preload already exists');
  const head = /<head\b[^>]*>/i.exec(html);
  assert(head?.index !== undefined, 'head missing while injecting product LCP preload');
  const insertion = head.index + head[0].length;
  const preload = `\n<link id="sc-product-lcp-preload" rel="preload" as="image" href="${source}" fetchpriority="high">`;
  return `${html.slice(0, insertion)}${preload}${html.slice(insertion)}`;
}

function remoteRobotoFaces(css: string): RegExpMatchArray[] {
  const pattern = /@font-face\s*\{(?=[^{}]*\bfont-family\s*:\s*["']?Roboto["']?)([^{}]*)\}/gi;
  return [...css.matchAll(pattern)];
}

function replaceUrlInsideBlock(block: string, remoteUrl: string, localUrl: string): string {
  const remoteMatch = new RegExp(`url\\(\\s*["']?${remoteUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']?\\s*\\)`, 'i').exec(block);
  assert(remoteMatch?.index !== undefined, `Roboto URL missing from its @font-face block: ${remoteUrl}`);
  const urlIndex = remoteMatch[0].indexOf(remoteUrl);
  const start = remoteMatch.index + urlIndex;
  return `${block.slice(0, start)}${localUrl}${block.slice(start + remoteUrl.length)}`;
}

async function localizeRoboto(
  deferredCss: string,
  sha: string,
): Promise<{ readonly css: string; readonly preloads: readonly [href: string, mime: FontMime][] }> {
  const replacements: FontReplacement[] = [];
  const preloads: Array<[string, FontMime]> = [];
  let assetIndex = 0;

  for (const match of remoteRobotoFaces(deferredCss)) {
    if (match.index === undefined) continue;
    const block = match[0];
    const remoteUrl = /url\(\s*["']?(https:\/\/fonts\.gstatic\.com\/[^)"']+)["']?\s*\)/i.exec(block)?.[1];
    if (!remoteUrl) continue;

    assetIndex += 1;
    const font = await fetchFont(remoteUrl);
    const name = `roboto-${assetIndex}${font.suffix}`;
    const target = path.join(SITE, '_critical-fonts', name);
    write(target, font.data);

    const href = `_critical-fonts/${name}?v=${sha}`;
    replacements.push({
      start: match.index,
      end: match.index + block.length,
      css: replaceUrlInsideBlock(block, remoteUrl, `../${href}`),
    });
    preloads.push([href, font.mime]);
  }

  const css = replacements
    .sort((left, right) => right.start - left.start)
    .reduce(
      (current, replacement) => `${current.slice(0, replacement.start)}${replacement.css}${current.slice(replacement.end)}`,
      deferredCss,
    );
  return { css, preloads };
}

function removeRemoteGoogleFontBootstrap(html: string): string {
  return html
    .replace(/<link\b(?=[^>]*\bhref=["']https:\/\/fonts\.(?:googleapis|gstatic)\.com\/[^"']*["'])[^>]*>\s*/gi, '')
    .replace(/<style\b[^>]*id=["']sc-roboto-font-css["'][^>]*>[\s\S]*?<\/style>\s*/gi, '');
}

function injectPreloads(html: string, preloads: readonly [href: string, mime: FontMime][]): string {
  if (preloads.length === 0) return html;
  const head = /<head\b[^>]*>/i.exec(html);
  assert(head?.index !== undefined, 'head missing while injecting Roboto preloads');
  const insertion = head.index + head[0].length;
  const links = preloads
    .map(([href, mime]) => `\n<link class="sc-roboto-preload" rel="preload" href="${href}" as="font" type="${mime}" crossorigin fetchpriority="high">`)
    .join('');
  return `${html.slice(0, insertion)}${links}${html.slice(insertion)}`;
}

function injectFontAwesomePreload(html: string, deferredCss: string): string {
  const source = /url\(\s*["']?([^)"']*fontawesome-webfont\.woff2(?:\?[^)"']*)?)["']?\s*\)/i.exec(deferredCss)?.[1];
  if (!source || html.includes('id="sc-fontawesome-preload"')) return html;
  assert(!/^(?:https?:)?\/\//i.test(source), 'Font Awesome must be same-origin in the Pages artifact');

  const href = path.posix.normalize(path.posix.join('_pages', source));
  const head = /<head\b[^>]*>/i.exec(html);
  assert(head?.index !== undefined, 'head missing while injecting Font Awesome preload');
  const insertion = head.index + head[0].length;
  const link = `\n<link id="sc-fontawesome-preload" rel="preload" href="${href}" as="font" type="font/woff2" crossorigin fetchpriority="high">`;
  return `${html.slice(0, insertion)}${link}${html.slice(insertion)}`;
}

function verifyLocalizedFonts(preloads: readonly [href: string, mime: FontMime][]): void {
  for (const [href] of preloads) {
    const relativePath = href.split('?')[0];
    assert(relativePath, `localized Roboto href is invalid: ${href}`);
    const file = path.join(SITE, relativePath);
    assert(
      fs.existsSync(file) && fs.statSync(file).size >= MIN_LOCAL_FONT_BYTES,
      `localized Roboto font missing or invalid: ${file}`,
    );
  }
}

export async function optimizeLcp(): Promise<void> {
  const sha = githubSha();
  const indexFile = path.join(SITE, 'index.html');
  const deferredFile = path.join(SITE, '_pages', 'deferred.css');
  let html = read(indexFile);
  let deferredCss = read(deferredFile);

  const promoted = promoteFirstViewportProducts(html, sha);
  html = injectProductPreload(promoted.html, promoted.sources[0] ?? '');

  const roboto = await localizeRoboto(deferredCss, sha);
  deferredCss = roboto.css;
  html = removeRemoteGoogleFontBootstrap(html);
  assert(!/fonts\.(?:gstatic|googleapis)\.com/.test(`${deferredCss}${html}`), 'remote Google font URL remains in final artifact');
  html = injectPreloads(html, roboto.preloads);
  html = injectFontAwesomePreload(html, deferredCss);

  assert(html.split('id="sc-product-lcp-preload"').length - 1 === 1, 'product LCP preload missing or duplicated');
  verifyLocalizedFonts(roboto.preloads);
  write(indexFile, html);
  write(deferredFile, deferredCss);
}
