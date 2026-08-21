import { assert, escapeRegExp } from '../../lib/core.js';
import type { AssetKind, TagPosition } from './config.js';

export function sourceBlockPattern(source: string): RegExp {
  return new RegExp(
    `/\\* origen: ${escapeRegExp(source)} \\*/\\n.*?(?=\\n\\n/\\* origen:|$)`,
    's',
  );
}

export function scriptPattern(src: string): RegExp {
  return new RegExp(
    `<script\\b(?=[^>]*\\bsrc=["']${escapeRegExp(src)}["'])[^>]*>\\s*</script>`,
    'i',
  );
}

export function linkPattern(href: string): RegExp {
  return new RegExp(`<link\\b(?=[^>]*\\bhref=["']${escapeRegExp(href)}["'])[^>]*>`, 'i');
}

export function removeCommentedAsset(html: string, kind: AssetKind, asset: string): string {
  const attribute = kind === 'script' ? 'src' : 'href';
  const tail = kind === 'script' ? '[^>]*>\\s*</script>' : '[^>]*>';
  const pattern = new RegExp(
    `<!--\\s*<${kind}\\b(?=[^>]*\\b${attribute}=["']${escapeRegExp(asset)}["'])${tail}\\s*-->`,
    'ig',
  );
  return html.replace(pattern, '');
}

export function assertActiveStylesheet(html: string, href: string): void {
  const pattern = linkPattern(href);
  const matches = html.match(new RegExp(pattern.source, 'ig')) ?? [];
  assert(matches.length === 1, `Expected one active stylesheet tag for ${href}, found ${matches.length}`);
  const tag = matches[0] ?? '';
  assert(/\brel=["']stylesheet["']/i.test(tag), `Non-stylesheet link matched for ${href}`);
  const media = tag.match(/\bmedia=["']([^"']+)["']/i)?.[1];
  assert(!media || media.trim().toLowerCase() === 'all', `Cannot bundle ${href} with media=${media}`);
}

export function assertActiveScript(html: string, src: string): void {
  const pattern = scriptPattern(src);
  const matches = html.match(new RegExp(pattern.source, 'ig')) ?? [];
  assert(matches.length === 1, `Expected one active script for ${src}, found ${matches.length}`);
  const tag = matches[0] ?? '';
  assert(!/\b(?:async|defer)\b/i.test(tag), `Cannot bundle async/defer script ${src}`);
  const type = tag.match(/\btype=["']([^"']+)["']/i)?.[1]?.trim().toLowerCase();
  assert(
    !type || type === 'text/javascript' || type === 'application/javascript',
    `Unsupported script type for ${src}`,
  );
}

export function scriptPositions(html: string, sources: readonly string[]): TagPosition[] {
  return sources.map((src) => {
    const match = scriptPattern(src).exec(html);
    assert(match, `Missing shop script ${src}`);
    return { start: match.index, end: match.index + match[0].length };
  });
}
