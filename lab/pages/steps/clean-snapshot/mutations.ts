import { assert } from '../../lib/core.js';
import type { AriaRule, MutationResult } from './config.js';

function findMatchingDivClose(html: string, start: number): readonly [start: number, end: number] {
  const tags = /<div\b[^>]*>|<\/div\s*>/gi;
  tags.lastIndex = start;
  let depth = 0;
  let match: RegExpExecArray | null;
  while ((match = tags.exec(html))) {
    if (match[0].toLowerCase().startsWith('<div')) depth += 1;
    else depth -= 1;
    if (depth === 0) return [match.index, match.index + match[0].length];
  }
  throw new Error('Could not find matching </div> in captured snapshot markup');
}

export function emptyDivContents(html: string, marker: string): string {
  const start = html.indexOf(marker);
  assert(start >= 0, `Could not find snapshot div marker: ${marker}`);
  const openEnd = html.indexOf('>', start);
  assert(openEnd >= 0, `Could not find end of opening div: ${marker}`);
  const [closeStart] = findMatchingDivClose(html, start);
  return `${html.slice(0, openEnd + 1)}${html.slice(closeStart)}`;
}

export function removeDivBlock(html: string, marker: string): string {
  const start = html.indexOf(marker);
  assert(start >= 0, `Could not find snapshot div block marker: ${marker}`);
  const [, end] = findMatchingDivClose(html, start);
  return `${html.slice(0, start)}${html.slice(end)}`;
}

export function addAriaLabel(html: string, rule: AriaRule): MutationResult {
  const pattern = new RegExp(`<${rule.tag}\\b(?=[^>]*${rule.lookahead})[^>]*>`, 'gi');
  let count = 0;
  const result = html.replace(pattern, (tag) => {
    if (/\baria-label\s*=/i.test(tag)) return tag;
    count += 1;
    const close = tag.endsWith('/>') ? '/>' : '>';
    return `${tag.slice(0, -close.length).trimEnd()} aria-label="${rule.label}"${close}`;
  });
  return { html: result, count };
}

export function stripInlineProperties(
  html: string,
  className: string,
  properties: ReadonlySet<string>,
): MutationResult {
  const pattern = new RegExp(`<div\\b(?=[^>]*\\bclass=["'][^"']*\\b${className}\\b[^"']*["'])[^>]*>`, 'gi');
  let count = 0;
  const result = html.replace(pattern, (tag) => {
    const style = /\s+style=["']([^"']*)["']/i.exec(tag);
    if (!style?.[1] || style.index === undefined) return tag;
    const kept: string[] = [];
    let removed = false;
    for (const rawDeclaration of style[1].split(';')) {
      const declaration = rawDeclaration.trim();
      if (!declaration) continue;
      const separator = declaration.indexOf(':');
      const property = separator >= 0 ? declaration.slice(0, separator).trim().toLowerCase() : '';
      if (properties.has(property)) removed = true;
      else kept.push(declaration);
    }
    if (!removed) return tag;
    count += 1;
    const replacement = kept.length ? ` style="${kept.join('; ')}"` : '';
    return `${tag.slice(0, style.index)}${replacement}${tag.slice(style.index + style[0].length)}`;
  });
  return { html: result, count };
}

export function ensureImageDimensions(
  html: string,
  lookahead: string,
  width: number,
  height: number,
  force = false,
): MutationResult {
  const pattern = new RegExp(`<img\\b(?=[^>]*${lookahead})[^>]*>`, 'gi');
  let count = 0;
  const result = html.replace(pattern, (tag) => {
    let output = force
      ? tag.replace(/\s+width\s*=\s*["'][^"']*["']/gi, '').replace(/\s+height\s*=\s*["'][^"']*["']/gi, '')
      : tag;
    const close = output.endsWith('/>') ? '/>' : '>';
    let body = output.slice(0, -close.length).trimEnd();
    if (force || !/\bwidth\s*=/i.test(output)) body += ` width="${width}"`;
    if (force || !/\bheight\s*=/i.test(output)) body += ` height="${height}"`;
    output = `${body}${close}`;
    if (output !== tag) count += 1;
    return output;
  });
  return { html: result, count };
}

export function repairAnchorIds(html: string): MutationResult {
  const pattern = /<a\b(?=[^>]*\bname="(anchor[^"]*)")[^>]*>/gi;
  let count = 0;
  const result = html.replace(pattern, (tag, name: string) => {
    const id = /\bid="([^"]*)"/i.exec(tag);
    if (id?.[1] === name) return tag;
    count += 1;
    if (id?.index !== undefined) return `${tag.slice(0, id.index)}id="${name}"${tag.slice(id.index + id[0].length)}`;
    return `${tag.slice(0, -1).trimEnd()} id="${name}">`;
  });
  return { html: result, count };
}

export function removeExactlyOne(html: string, pattern: RegExp, label: string): string {
  let count = 0;
  const result = html.replace(pattern, () => {
    count += 1;
    return '';
  });
  assert(count === 1, `Expected one ${label}, found ${count}`);
  return result;
}

export function restoreRemoteRecaptcha(html: string): string {
  let count = 0;
  const result = html.replace(
    /<script\b[^>]*\bsrc=["']_external\/www\.google\.com\/recaptcha\/api\.js["'][^>]*>\s*<\/script>/i,
    () => {
      count += 1;
      return '<script src="https://www.google.com/recaptcha/api.js" async defer></script>';
    },
  );
  assert(count === 1, `Expected one local captured reCAPTCHA api.js reference, found ${count}`);
  return result;
}
