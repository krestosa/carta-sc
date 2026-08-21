import path from 'node:path';
import { SITE, assert, escapeRegExp, githubSha, read, write } from '../lib/core.js';

const FONT_HINTS = [
  '<link rel="preload" href="fuentes/AcuminPro-Regular.woff2" as="font" type="font/woff2" crossorigin>',
  '<link rel="preload" href="fuentes/AcuminPro-Semibold.woff2" as="font" type="font/woff2" crossorigin>',
] as const;

function removeExactlyOnce(html: string, pattern: RegExp, label: string): string {
  const matches = html.match(new RegExp(pattern.source, 'gi')) ?? [];
  assert(matches.length === 1, `Expected exactly one ${label}; found ${matches.length}`);
  return html.replace(pattern, '');
}

function normalizeRobotoUrl(html: string): string {
  let count = 0;
  const result = html.replace(
    /https:\/\/fonts\.googleapis\.com\/css\?family=Roboto:300,400,700(?:&amp;|&)display=swap|https:\/\/fonts\.googleapis\.com\/css\?family=Roboto:300,400,700/i,
    () => {
      count += 1;
      return 'https://fonts.googleapis.com/css?family=Roboto:300,400,700&amp;display=swap';
    },
  );
  assert(count === 1, `Expected one Roboto Google Fonts stylesheet URL, found ${count}`);
  return result;
}

function catalogueBannerSource(html: string): string {
  const banner = /<img\b(?=[^>]*\bclass="[^"]*\bimgBannerShop\b[^"]*")(?=[^>]*\bsrc="([^"]+)")[^>]*>/i.exec(html);
  assert(banner?.[1], 'Could not locate the catalogue banner image');
  return banner[1];
}

export function optimizeCriticalPath(): void {
  const sha = githubSha();
  const file = path.join(SITE, 'index.html');
  let html = normalizeRobotoUrl(read(file));
  const bannerSource = catalogueBannerSource(html);

  html = removeExactlyOnce(html, /<link\s+rel="preconnect"\s+href="https:\/\/fonts\.googleapis\.com"\s*>/i, 'Google Fonts API preconnect');
  html = removeExactlyOnce(html, /<link\s+rel="preconnect"\s+href="https:\/\/fonts\.gstatic\.com"\s+crossorigin\s*>/i, 'Google Fonts static preconnect');
  html = removeExactlyOnce(
    html,
    new RegExp(`<link\\s+rel="preload"\\s+as="script"\\s+href="_js_dev/main-legacy\\.js\\?v=${escapeRegExp(sha)}"\\s*>`, 'i'),
    'legacy runtime preload',
  );
  html = removeExactlyOnce(
    html,
    new RegExp(`<link\\s+rel="preload"\\s+as="style"\\s+href="override/main\\.css\\?v=${escapeRegExp(sha)}"\\s*>`, 'i'),
    'override stylesheet preload',
  );
  html = removeExactlyOnce(
    html,
    new RegExp(`<link\\s+rel="modulepreload"\\s+href="override/main\\.js\\?v=${escapeRegExp(sha)}"\\s*>`, 'i'),
    'override modulepreload',
  );

  for (const font of [
    /<link\s+rel="preload"\s+href="fuentes\/AcuminPro-Regular\.woff2"\s+as="font"\s+type="font\/woff2"\s+crossorigin\s*>/i,
    /<link\s+rel="preload"\s+href="fuentes\/AcuminPro-Semibold\.woff2"\s+as="font"\s+type="font\/woff2"\s+crossorigin\s*>/i,
  ]) {
    html = removeExactlyOnce(html, font, 'Acumin font preload');
  }

  const hints = [
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    `<link rel="preload" as="image" href="${bannerSource}" fetchpriority="high">`,
    ...FONT_HINTS,
    `<link rel="preload" as="script" href="_js_dev/main-legacy.js?v=${sha}">`,
    `<link rel="preload" as="style" href="override/main.css?v=${sha}">`,
    `<link rel="modulepreload" href="override/main.js?v=${sha}">`,
  ].join('\n');

  let charsetCount = 0;
  html = html.replace(/<meta\s+charset="utf-8"\s*>/i, (tag) => {
    charsetCount += 1;
    return `${tag}\n${hints}`;
  });
  assert(charsetCount === 1, 'Could not place critical hints immediately after meta charset');
  assert(html.split(`<link rel="preload" as="image" href="${bannerSource}" fetchpriority="high">`).length - 1 === 1, 'Banner preload must appear exactly once');
  assert(html.split('https://fonts.googleapis.com/css?family=Roboto:300,400,700&amp;display=swap').length - 1 === 1, 'Roboto stylesheet must use display=swap exactly once');
  assert(!html.includes('cdn.jsdelivr.net'), 'Obsolete jsDelivr connection hint remains');

  const lower = html.toLowerCase();
  const headStart = lower.indexOf('<head>');
  const headEnd = lower.indexOf('</head>');
  const charsetPosition = lower.indexOf('<meta charset="utf-8"', headStart);
  const bannerPosition = html.indexOf(`<link rel="preload" as="image" href="${bannerSource}"`, headStart);
  const googlePosition = html.indexOf('https://fonts.googleapis.com/css?', headStart);
  assert(headStart >= 0 && headEnd > headStart && charsetPosition > headStart && bannerPosition > charsetPosition, 'Critical hints are not positioned at the start of the document head');
  assert(googlePosition < 0 || bannerPosition < googlePosition, 'Critical resource hints must precede the Google Fonts stylesheet');

  write(file, html);
}
