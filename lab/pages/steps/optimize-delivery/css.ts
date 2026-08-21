import path from 'node:path';
import { assert, escapeRegExp } from '../../lib/core.js';

export function ensureFontDisplay(css: string): string {
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

export function criticalCssBlock(legacyCss: string, overrideCss: string): string {
  const legacy = ensureFontDisplay(rebaseCss(legacyCss, '_pages/legacy.css')).trimEnd();
  const override = ensureFontDisplay(rebaseCss(overrideCss, 'override/main.css')).trimEnd();
  return `<style id="sc-pages-critical-css">\n${legacy}\n${override}\n</style>`;
}

function replaceExactlyOnce(html: string, pattern: RegExp, replacement: string, label: string): string {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const matches = html.match(new RegExp(pattern.source, flags)) ?? [];
  assert(matches.length === 1, `${label}: expected exactly one match, found ${matches.length}`);
  return html.replace(pattern, replacement);
}

export function inlineLocalStyles(html: string, sha: string, criticalCss: string): string {
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

export function removeSupersededPreloads(html: string, sha: string): string {
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
