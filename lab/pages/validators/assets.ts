import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, read } from '../lib/core.js';
import { failList, localResource, scanTags } from './shared.js';

const RESOURCE_ATTRIBUTES = {
  script: ['src'],
  img: ['src', 'srcset'],
  source: ['src', 'srcset'],
  video: ['src', 'poster'],
  audio: ['src'],
  iframe: ['src'],
  link: ['href'],
} as const satisfies Readonly<Record<string, readonly string[]>>;

const CHECKED_LINK_RELS = new Set([
  'stylesheet',
  'preload',
  'prefetch',
  'icon',
  'shortcut',
  'apple-touch-icon',
]);

function checkResource(value: string, base: string, checked: Set<string>, issues: string[]): void {
  const resource = localResource(value);
  if (resource === null) return;

  if (resource.startsWith('/')) {
    issues.push(`root-relative resource is invalid for project Pages: ${value}`);
    return;
  }

  const target = path.resolve(base, resource);
  const relative = path.relative(SITE, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    issues.push(`resource escapes Pages artifact: ${value}`);
    return;
  }

  if (checked.has(target)) return;
  checked.add(target);
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    issues.push(`missing local resource: ${value} -> ${relative.replaceAll(path.sep, '/')}`);
  }
}

function checkSrcset(value: string, base: string, checked: Set<string>, issues: string[]): void {
  for (const candidate of value.split(',')) {
    const url = candidate.trim().split(/\s+/)[0] ?? '';
    if (url) checkResource(url, base, checked, issues);
  }
}

function validateHtmlResources(html: string, checked: Set<string>, issues: string[]): void {
  for (const tag of scanTags(html)) {
    if (tag.closing) continue;
    const attributes = RESOURCE_ATTRIBUTES[tag.name as keyof typeof RESOURCE_ATTRIBUTES];
    if (!attributes) continue;

    if (tag.name === 'link') {
      const rel = new Set((tag.attrs.rel ?? '').toLowerCase().split(/\s+/));
      if (![...rel].some((value) => CHECKED_LINK_RELS.has(value))) continue;
    }

    for (const attribute of attributes) {
      const value = tag.attrs[attribute];
      if (!value) continue;
      if (attribute === 'srcset') checkSrcset(value, SITE, checked, issues);
      else checkResource(value, SITE, checked, issues);
    }
  }
}

function validateCssResources(file: string, checked: Set<string>, issues: string[]): void {
  if (!fs.existsSync(file)) {
    issues.push(`missing active stylesheet: ${path.relative(SITE, file).replaceAll(path.sep, '/')}`);
    return;
  }

  for (const match of read(file).matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) {
    checkResource(match[2] ?? '', path.dirname(file), checked, issues);
  }
}

export function validateLocalAssets(): void {
  const index = path.join(SITE, 'index.html');
  assert(fs.existsSync(index), 'Prepared Pages artifact is missing');

  const issues: string[] = [];
  const checked = new Set<string>();
  validateHtmlResources(read(index), checked, issues);

  for (const css of [
    path.join(SITE, '_pages', 'legacy.css'),
    path.join(SITE, 'override', 'main.css'),
  ]) {
    validateCssResources(css, checked, issues);
  }

  if (issues.length) failList('Pages local asset validation failed', issues);
}
