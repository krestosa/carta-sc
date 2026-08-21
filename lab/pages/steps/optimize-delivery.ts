import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, escapeRegExp, githubSha, read, write } from '../lib/core.js';

const DELIVERY_LOADER_SLOT = '<script type="module" id="sc-pages-delivery-loader"></script>';
const ROBOTO_TIMEOUT_MS = 6_000;

function ensureFontDisplay(css: string): string {
  return css.replace(/@font-face\s*\{([\s\S]*?)\}/gi, (full, body: string) => {
    if (/\bfont-display\s*:/i.test(body)) return full;
    return `@font-face {${body.trimEnd()}\n  font-display: swap;\n}`;
  });
}

function rebaseCss(css: string, sourceRelative: string): string {
  const base = path.posix.dirname(sourceRelative);
  return css.replace(/url\(\s*(["']?)(.*?)\1\s*\)/gi, (full, quote: string, raw: string) => {
    const value = raw.trim();
    if (!value || /^(?:data:|[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(value)) return full;

    const match = /^([^?#]+)([?#].*)?$/.exec(value);
    if (!match?.[1]) return full;
    const rebased = path.posix.normalize(path.posix.join(base, match[1]));
    return `url(${quote}${rebased}${match[2] ?? ''}${quote})`;
  });
}

function replaceExactlyOnce(html: string, pattern: RegExp, replacement: string, label: string): string {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const matches = html.match(new RegExp(pattern.source, flags)) ?? [];
  assert(matches.length === 1, `${label}: expected exactly one match, found ${matches.length}`);
  return html.replace(pattern, replacement);
}

function criticalCssBlock(legacyCss: string, overrideCss: string): string {
  const legacy = ensureFontDisplay(rebaseCss(legacyCss, '_pages/legacy.css')).trimEnd();
  const override = ensureFontDisplay(rebaseCss(overrideCss, 'override/main.css')).trimEnd();
  return `<style id="sc-pages-critical-css">\n${legacy}\n${override}\n</style>`;
}

function inlineLocalStyles(html: string, sha: string, criticalCss: string): string {
  let result = replaceExactlyOnce(
    html,
    new RegExp(
      `<link\\b(?=[^>]*\\brel=["']stylesheet["'])(?=[^>]*\\bhref=["']_pages/legacy\\.css\\?v=${escapeRegExp(sha)}["'])[^>]*>`,
      'i',
    ),
    criticalCss,
    'legacy stylesheet',
  );

  result = replaceExactlyOnce(
    result,
    new RegExp(
      `<link\\b(?=[^>]*\\brel=["']stylesheet["'])(?=[^>]*\\bhref=["']override/main\\.css\\?v=${escapeRegExp(sha)}["'])[^>]*>\\s*`,
      'i',
    ),
    '',
    'override stylesheet',
  );

  return result;
}

function removeSupersededPreloads(html: string, sha: string): string {
  let result = html;
  for (const asset of ['_js_dev/main-legacy.js', 'override/main.js', 'override/main.css']) {
    result = result.replace(
      new RegExp(
        `<link\\b(?=[^>]*\\brel=["'](?:preload|modulepreload)["'])(?=[^>]*\\bhref=["']${escapeRegExp(asset)}\\?v=${escapeRegExp(sha)}["'])[^>]*>\\s*`,
        'i',
      ),
      '',
    );
  }
  return result;
}

async function inlineOrDeferRoboto(html: string): Promise<string> {
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

function removeRemoteBootstraps(html: string): string {
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

function installDeliveryLoaderSlot(html: string): string {
  assert(!html.includes('id="sc-pages-delivery-loader"'), 'Pages delivery loader is already present');
  return replaceExactlyOnce(html, /<\/body>/i, `${DELIVERY_LOADER_SLOT}\n</body>`, 'body close');
}

function normalizeTikTokIcon(html: string): string {
  const match = /<img\b(?=[^>]*\bsrc=["']https:\/\/www\.sushiclub\.com\.ar\/iconos\/icons8-tiktok-32\.png["'])([^>]*)>/i.exec(html);
  if (!match || match.index === undefined) return html;

  let attributes = match[1] ?? '';
  if (!/\bwidth=/i.test(attributes)) attributes += ' width="22"';
  if (!/\bheight=/i.test(attributes)) attributes += ' height="22"';
  return html.slice(0, match.index) + `<img${attributes}>` + html.slice(match.index + match[0].length);
}

export async function optimizeDelivery(): Promise<void> {
  const sha = githubSha();
  const index = path.join(SITE, 'index.html');
  const legacyCssFile = path.join(SITE, '_pages/legacy.css');
  const overrideCssFile = path.join(SITE, 'override/main.css');
  assert(
    fs.existsSync(legacyCssFile) && fs.existsSync(overrideCssFile),
    'Bundled local stylesheets are missing',
  );

  const criticalCss = criticalCssBlock(read(legacyCssFile), read(overrideCssFile));
  let html = inlineLocalStyles(read(index), sha, criticalCss);
  html = removeSupersededPreloads(html, sha);
  html = await inlineOrDeferRoboto(html);
  html = removeRemoteBootstraps(html);
  html = installDeliveryLoaderSlot(normalizeTikTokIcon(html));

  assert(html.includes('id="sc-pages-critical-css"'), 'Critical local CSS was not inlined');
  assert(html.split('id="sc-pages-delivery-loader"').length - 1 === 1, 'Delivery loader slot count is invalid');
  write(index, html);
}
