import { stripQuery } from '../lib/core.js';

export interface HtmlAttributes {
  readonly [name: string]: string | undefined;
}

export type Attrs = HtmlAttributes;

export interface HtmlTag {
  readonly name: string;
  readonly attrs: HtmlAttributes;
  readonly raw: string;
  readonly index: number;
  readonly closing: boolean;
}

export const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

export const SOCIAL_HOSTS = new Set([
  'facebook.com',
  'www.facebook.com',
  'instagram.com',
  'www.instagram.com',
  'tiktok.com',
  'www.tiktok.com',
  'pinterest.com',
  'www.pinterest.com',
]);

export function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function parseAttributes(raw: string): HtmlAttributes {
  const attrs: Record<string, string> = {};
  const body = raw.replace(/^<\/?[a-z0-9:-]+/i, '').replace(/\/?\s*>$/, '');
  const attributePattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

  for (const match of body.matchAll(attributePattern)) {
    const key = (match[1] ?? '').toLowerCase();
    if (!key) continue;
    attrs[key] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? '');
  }

  return attrs;
}

function maskRawText(html: string): string {
  const withoutComments = html.replace(/<!--[\s\S]*?-->/g, (comment) => ' '.repeat(comment.length));
  return withoutComments.replace(
    /(<(?<tag>script|style)\b[^>]*>)(?<body>[\s\S]*?)(<\/\k<tag>\s*>)/gi,
    (_all: string, open: string, _tag: string, _body: string, close: string, ...args: unknown[]) => {
      const groups = args.at(-1) as { body?: string } | undefined;
      return open + ' '.repeat((groups?.body ?? '').length) + close;
    },
  );
}

export function scanTags(html: string): HtmlTag[] {
  const tags: HtmlTag[] = [];
  const masked = maskRawText(html);

  for (const match of masked.matchAll(/<\/?[a-zA-Z][^>]*>/g)) {
    const raw = match[0];
    const name = /^<\/?\s*([a-z0-9:-]+)/i.exec(raw)?.[1]?.toLowerCase();
    if (!name || match.index === undefined) continue;

    tags.push({
      name,
      attrs: parseAttributes(raw),
      raw,
      index: match.index,
      closing: /^<\//.test(raw),
    });
  }

  return tags;
}

export function classSet(attrs: HtmlAttributes): Set<string> {
  return new Set((attrs.class ?? '').trim().split(/\s+/).filter(Boolean));
}

export function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

export function countLiteral(text: string, value: string): number {
  return text.split(value).length - 1;
}

export function urlPath(value: string): string {
  return stripQuery(value).replace(/^\.\//, '').replace(/^\//, '');
}

export function remote(value: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value);
}

export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function localResource(value: string): string | null {
  const decoded = decodeHtml(value.trim());
  if (!decoded || /^(?:#|data:|blob:|javascript:|mailto:|tel:)/i.test(decoded) || remote(decoded)) {
    return null;
  }
  return safeDecode(stripQuery(decoded));
}

export function failList(title: string, issues: readonly string[]): never {
  const deduped = unique(issues);
  throw new Error(`${title} with ${deduped.length} issue(s):\n${deduped.map((item) => `- ${item}`).join('\n')}`);
}
