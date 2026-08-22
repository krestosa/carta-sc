import { assert } from '../lib/core.js';
import { SYSTEM_LOGO_SIZE, SYSTEM_LOGO_STYLE_ID } from './system-logo-config.js';

type LogoSourceAttribute = 'src' | 'data-sc-desktop-src';

const BLOCKED_INLINE_PROPERTIES = new Set([
  'margin-left',
  'width',
  'height',
  'max-width',
  'max-height',
  'transform',
]);

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

export function normalizeSystemLogoTag(
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
  const dimensions = ` width="${SYSTEM_LOGO_SIZE.width}" height="${SYSTEM_LOGO_SIZE.height}"`;
  return `${tag.slice(0, -close.length).trimEnd()}${dimensions}${close}`;
}

export function replaceSingleHtmlTag(
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

export function injectSystemLogoCss(html: string, css: string): string {
  assert(!html.includes(`id="${SYSTEM_LOGO_STYLE_ID}"`), 'system logo critical CSS already exists');
  const headClose = /<\/head\s*>/i.exec(html);
  assert(headClose?.index !== undefined, 'document head closing tag missing');
  return `${html.slice(0, headClose.index)}${css}\n${html.slice(headClose.index)}`;
}
