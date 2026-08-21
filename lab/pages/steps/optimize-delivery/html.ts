import { assert } from '../../lib/core.js';
import { ensureFontDisplay } from './css.js';

const DELIVERY_LOADER_SLOT = '<script type="module" id="sc-pages-delivery-loader"></script>';
const ROBOTO_TIMEOUT_MS = 6_000;

function replaceExactlyOnce(html: string, pattern: RegExp, replacement: string, label: string): string {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const matches = html.match(new RegExp(pattern.source, flags)) ?? [];
  assert(matches.length === 1, `${label}: expected exactly one match, found ${matches.length}`);
  return html.replace(pattern, replacement);
}

export async function inlineOrDeferRoboto(html: string): Promise<string> {
  const pattern = /<link\b(?=[^>]*\bhref=["'](https:\/\/fonts\.googleapis\.com\/css\?family=Roboto:[^"']+)["'])(?=[^>]*\brel=["']stylesheet["'])[^>]*>/i;
  const match = pattern.exec(html);
  assert(match?.[1] && match.index !== undefined, 'Roboto stylesheet was not found');

  const escapedUrl = match[1];
  const url = escapedUrl.replaceAll('&amp;', '&');
  let replacement: string;

  try {
    const response = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(ROBOTO_TIMEOUT_MS),
    });
    assert(response.ok, `Roboto HTTP ${response.status}`);
    replacement = `<style id="sc-roboto-font-css">${ensureFontDisplay(await response.text())}</style>`;
  } catch {
    replacement = `<link rel="stylesheet" href="${escapedUrl}" media="print" onload="this.media='all'">`;
  }

  return html.slice(0, match.index) + replacement + html.slice(match.index + match[0].length);
}

export function removeRemoteBootstraps(html: string): string {
  let result = replaceExactlyOnce(
    html,
    /<script\b(?=[^>]*\bsrc=["']https:\/\/www\.google\.com\/recaptcha\/api\.js["'])[^>]*>\s*<\/script>\s*/i,
    '',
    'reCAPTCHA bootstrap',
  );
  result = replaceExactlyOnce(
    result,
    /<script>\s*\(function\(w,d,s,l,i\)[\s\S]*?GTM-WQPLGX9[\s\S]*?<\/script>\s*/i,
    '',
    'GTM bootstrap',
  );
  return result;
}

export function installDeliveryLoaderSlot(html: string): string {
  assert(!html.includes('id="sc-pages-delivery-loader"'), 'Pages delivery loader is already present');
  return replaceExactlyOnce(html, /<\/body>/i, `${DELIVERY_LOADER_SLOT}\n</body>`, 'body close');
}

export function normalizeTikTokIcon(html: string): string {
  const match = /<img\b(?=[^>]*\bsrc=["']https:\/\/www\.sushiclub\.com\.ar\/iconos\/icons8-tiktok-32\.png["'])([^>]*)>/i.exec(html);
  if (!match || match.index === undefined) return html;

  let attributes = match[1] ?? '';
  if (!/\bwidth=/i.test(attributes)) attributes += ' width="22"';
  if (!/\bheight=/i.test(attributes)) attributes += ' height="22"';
  return html.slice(0, match.index) + `<img${attributes}>` + html.slice(match.index + match[0].length);
}
