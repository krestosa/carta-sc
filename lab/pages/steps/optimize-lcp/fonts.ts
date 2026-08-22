import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, write } from '../../lib/core.js';
import {
  ALLOWED_FONT_CONTENT_TYPES,
  FONT_DOWNLOAD_ATTEMPTS,
  FONT_DOWNLOAD_TIMEOUT_MS,
  FONT_MIME,
  FONT_RETRY_DELAY_MS,
  FONT_SUFFIXES,
  MAX_FONT_BYTES,
  MIN_LOCAL_FONT_BYTES,
  type FontMime,
  type FontReplacement,
  type FontSuffix,
  type LocalFontAsset,
} from './config.js';

const delay = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

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

function remoteRobotoFaces(css: string): RegExpMatchArray[] {
  const pattern = /@font-face\s*\{(?=[^{}]*\bfont-family\s*:\s*["']?Roboto["']?)([^{}]*)\}/gi;
  return [...css.matchAll(pattern)];
}

function replaceUrlInsideBlock(block: string, remoteUrl: string, localUrl: string): string {
  const escaped = remoteUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const remoteMatch = new RegExp(`url\\(\\s*["']?${escaped}["']?\\s*\\)`, 'i').exec(block);
  assert(remoteMatch?.index !== undefined, `Roboto URL missing from its @font-face block: ${remoteUrl}`);
  const urlIndex = remoteMatch[0].indexOf(remoteUrl);
  const start = remoteMatch.index + urlIndex;
  return `${block.slice(0, start)}${localUrl}${block.slice(start + remoteUrl.length)}`;
}

export async function localizeRoboto(
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
    write(path.join(SITE, '_critical-fonts', name), font.data);
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

export function removeRemoteGoogleFontBootstrap(html: string): string {
  return html
    .replace(/<link\b(?=[^>]*\bhref=["']https:\/\/fonts\.(?:googleapis|gstatic)\.com\/[^"']*["'])[^>]*>\s*/gi, '')
    .replace(/<style\b[^>]*id=["']sc-roboto-font-css["'][^>]*>[\s\S]*?<\/style>\s*/gi, '');
}

export function injectFontPreloads(html: string, preloads: readonly [href: string, mime: FontMime][]): string {
  if (preloads.length === 0) return html;
  const head = /<head\b[^>]*>/i.exec(html);
  assert(head?.index !== undefined, 'head missing while injecting Roboto preloads');
  const insertion = head.index + head[0].length;
  const links = preloads
    .map(([href, mime]) => `\n<link class="sc-roboto-preload" rel="preload" href="${href}" as="font" type="${mime}" crossorigin fetchpriority="high">`)
    .join('');
  return `${html.slice(0, insertion)}${links}${html.slice(insertion)}`;
}

export function injectFontAwesomePreload(html: string, deferredCss: string): string {
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

export function verifyLocalizedFonts(preloads: readonly [href: string, mime: FontMime][]): void {
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
