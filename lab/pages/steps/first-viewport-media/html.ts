import { escapeRegExp } from '../../lib/core.js';
import type { ImageSize } from './config.js';

export interface HtmlMutationResult {
  readonly html: string;
  readonly count: number;
}

function closingToken(tag: string): '/>' | '>' {
  return tag.endsWith('/>') ? '/>' : '>';
}

function withDimensions(tag: string, size: ImageSize): string {
  const close = closingToken(tag);
  const normalized = tag.replace(/\s+(?:width|height)\s*=\s*["'][^"']*["']/gi, '');
  return `${normalized.slice(0, -close.length).trimEnd()} width="${size[0]}" height="${size[1]}"${close}`;
}

export function replaceImageSource(
  html: string,
  oldUrl: string,
  newUrl: string,
  size: ImageSize,
): HtmlMutationResult {
  const pattern = new RegExp(`<img\\b(?=[^>]*\\bsrc=["']${escapeRegExp(oldUrl)}["'])[^>]*>`, 'gi');
  let count = 0;
  const next = html.replace(pattern, (tag) => {
    count += 1;
    return withDimensions(tag.replace(/\bsrc=["'][^"']+["']/i, `src="${newUrl}"`), size);
  });
  return { html: next, count };
}

export function ensureRemoteImageDimensions(html: string, url: string, size: ImageSize): HtmlMutationResult {
  const pattern = new RegExp(`<img\\b(?=[^>]*\\bsrc=["']${escapeRegExp(url)}["'])[^>]*>`, 'gi');
  let count = 0;
  const next = html.replace(pattern, (tag) => {
    count += 1;
    return withDimensions(tag, size);
  });
  return { html: next, count };
}

export function normalizeCountryLink(html: string, localUrl: string, label: string): HtmlMutationResult {
  const source = escapeRegExp(localUrl);
  const pattern = new RegExp(
    `<a\\b(?<attrs>[^>]*)>(?<body>(?:(?!<a\\b|<\\/a>).)*?<img\\b(?=[^>]*\\bsrc=["']${source}["'])[^>]*>(?:(?!<a\\b|<\\/a>).)*?)<\\/a>`,
    'gis',
  );
  let count = 0;

  const next = html.replace(pattern, (_match, ...args: unknown[]) => {
    const groups = args.at(-1) as { attrs?: string; body?: string } | undefined;
    count += 1;

    const currentAttributes = groups?.attrs ?? '';
    const attributes = /\saria-label=["'][^"']*["']/i.test(currentAttributes)
      ? currentAttributes.replace(/\saria-label=["'][^"']*["']/i, ` aria-label="${label}"`)
      : `${currentAttributes.trimEnd()} aria-label="${label}"`;
    const body = (groups?.body ?? '').replace(
      new RegExp(`(<img\\b(?=[^>]*\\bsrc=["']${source}["'])[^>]*?)\\s+alt=["'][^"']*["']`, 'i'),
      '$1 alt=""',
    );
    return `<a${attributes}>${body}</a>`;
  });

  return { html: next, count };
}
