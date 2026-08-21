import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import { SITE, assert, read } from '../lib/core.js';
import {
  SOCIAL_HOSTS,
  VOID_TAGS,
  classSet,
  decodeHtml,
  failList,
  safeDecode,
  scanTags,
  unique,
  type HtmlAttributes,
  type HtmlTag,
} from './shared.js';

interface FormControl {
  readonly tag: string;
  readonly attrs: HtmlAttributes;
}

interface SocialLink {
  readonly href: string;
  readonly named: boolean;
}

interface OpenElement {
  readonly name: string;
  readonly textStart: number;
  readonly tag: HtmlTag;
  imgAlt: string;
}

function visibleText(html: string, start: number, end: number): string {
  return html.slice(start, end).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function socialHost(href: string): string {
  try {
    return new URL(href, 'https://local.invalid/').hostname.toLowerCase();
  } catch {
    return '';
  }
}

function recordClosedElement(html: string, closingTag: HtmlTag, stack: OpenElement[], social: SocialLink[]): void {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    const item = stack[index];
    if (!item || item.name !== closingTag.name) continue;

    if (item.name === 'a') {
      const href = (item.tag.attrs.href ?? '').trim();
      const host = socialHost(href);
      if (host && SOCIAL_HOSTS.has(host)) {
        const text = visibleText(html, item.textStart, closingTag.index);
        const named = Boolean(
          text
          || (item.tag.attrs['aria-label'] ?? '').trim()
          || (item.tag.attrs.title ?? '').trim()
          || item.imgAlt,
        );
        social.push({ href, named });
      }
    }

    stack.splice(index);
    return;
  }
}

function isNamedControl(control: FormControl, labels: ReadonlySet<string>): boolean {
  const attrs = control.attrs;
  return Boolean(
    (attrs['aria-label'] ?? '').trim()
    || (attrs['aria-labelledby'] ?? '').trim()
    || (attrs.title ?? '').trim()
    || (attrs.id && labels.has(attrs.id)),
  );
}

function collectDocumentFacts(html: string): {
  readonly ids: string[];
  readonly fragments: string[];
  readonly labels: Set<string>;
  readonly controls: FormControl[];
  readonly imageStyles: string[];
  readonly social: SocialLink[];
} {
  const ids: string[] = [];
  const fragments: string[] = [];
  const labels = new Set<string>();
  const controls: FormControl[] = [];
  const imageStyles: string[] = [];
  const social: SocialLink[] = [];
  const stack: OpenElement[] = [];

  for (const tag of scanTags(html)) {
    if (tag.closing) {
      recordClosedElement(html, tag, stack, social);
      continue;
    }

    if (tag.attrs.id) ids.push(tag.attrs.id);
    if (tag.name === 'label' && tag.attrs.for) labels.add(tag.attrs.for);

    if (tag.name === 'a') {
      const href = (tag.attrs.href ?? '').trim();
      if (href.startsWith('#') && href.length > 1) fragments.push(safeDecode(decodeHtml(href.slice(1))));
    }

    if (tag.name === 'div' && classSet(tag.attrs).has('imgShop') && tag.attrs.style !== undefined) {
      imageStyles.push(tag.attrs.style);
    }

    if (['input', 'select', 'textarea'].includes(tag.name)) {
      const inputType = (tag.attrs.type ?? '').toLowerCase();
      const ignoredInput = tag.name === 'input' && ['hidden', 'submit', 'button', 'image', 'reset'].includes(inputType);
      if (!ignoredInput) controls.push({ tag: tag.name, attrs: tag.attrs });
    }

    if (tag.name === 'img' && tag.attrs.alt) {
      for (const item of stack) item.imgAlt = tag.attrs.alt;
    }

    if (!VOID_TAGS.has(tag.name) && !tag.raw.endsWith('/>')) {
      stack.push({ name: tag.name, textStart: tag.index + tag.raw.length, tag, imgAlt: '' });
    }
  }

  return { ids, fragments, labels, controls, imageStyles, social };
}

export function validateHtml(): void {
  const index = path.join(SITE, 'index.html');
  assert(fs.existsSync(index) && fs.statSync(index).isFile(), 'Prepared Pages artifact is missing');

  const html = read(index);
  const issues: string[] = [];
  if (html.includes('\uFFFD')) issues.push('index.html contains Unicode replacement character U+FFFD');

  const facts = collectDocumentFacts(html);
  const idCounts = new Map<string, number>();
  for (const id of facts.ids) idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
  for (const [id, count] of idCounts) {
    if (count > 1) issues.push(`duplicate id '${id}' appears ${count} times`);
  }

  const ids = new Set(facts.ids);
  for (const fragment of unique(facts.fragments).sort()) {
    if (!ids.has(fragment)) issues.push(`fragment target does not exist: #${fragment}`);
  }

  for (const style of facts.imageStyles) {
    const normalized = decodeHtml(style).trim();
    if (normalized.startsWith('uploads_shop/') || normalized.startsWith('url(')) {
      issues.push(`malformed imgShop inline style: ${style.slice(0, 120)}`);
    }
    if (/(^|;)\s*background-(?:image|size|position|repeat)\s*:/i.test(normalized)) {
      issues.push('imgShop retains eager imgLiquid background styles after cleanup');
    }
  }

  for (const control of facts.controls) {
    if (!isNamedControl(control, facts.labels)) {
      issues.push(`form control lacks an accessible name: ${control.tag}[${control.attrs.name || control.attrs.id || '<unnamed>'}]`);
    }
  }
  for (const link of facts.social) {
    if (!link.named) issues.push(`social link lacks an accessible name: ${link.href}`);
  }

  if (issues.length) failList('Pages HTML validation failed', issues);
}
