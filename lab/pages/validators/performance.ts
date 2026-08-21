import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, read } from '../lib/core.js';
import { type Attrs, VOID_TAGS, classSet, failList, remote, scanTags, unique, urlPath } from './shared.js';

type PreloadKind = 'script' | 'module' | 'style' | 'font' | 'image' | string;

interface PreloadResource {
  readonly kind: PreloadKind;
  readonly href: string;
  readonly attrs: Attrs;
}

interface PerformanceBudget {
  readonly localScripts: string[];
  readonly moduleScripts: string[];
  readonly remoteBlockingScripts: string[];
  readonly localStyles: string[];
  readonly preloads: PreloadResource[];
  readonly productImages: Attrs[];
  readonly bannerImages: Attrs[];
}

const EXPECTED_SCRIPTS = new Set([
  'js/jquery-2.1.0.min.js',
  '_pages/legacy.js',
  '_js_dev/main-legacy.js',
  'override/main.js',
  '_pages/shop.js',
]);
const EXPECTED_STYLES = new Set(['_pages/legacy.css', 'override/main.css']);

function preloadKind(attrs: Attrs): PreloadKind {
  const rel = new Set((attrs.rel ?? '').toLowerCase().split(/\s+/));
  if (rel.has('modulepreload')) return 'module';
  return (attrs.as ?? '').toLowerCase();
}

function parseBudget(html: string): PerformanceBudget {
  const result: PerformanceBudget = {
    localScripts: [],
    moduleScripts: [],
    remoteBlockingScripts: [],
    localStyles: [],
    preloads: [],
    productImages: [],
    bannerImages: [],
  };
  const stack: Array<{ name: string; classes: Set<string> }> = [];

  for (const tag of scanTags(html)) {
    if (tag.closing) {
      for (let index = stack.length - 1; index >= 0; index -= 1) {
        if (stack[index]?.name !== tag.name) continue;
        stack.splice(index);
        break;
      }
      continue;
    }

    const attrs = tag.attrs;
    const parentClasses = new Set<string>();
    for (const item of stack) for (const className of item.classes) parentClasses.add(className);

    if (tag.name === 'script' && attrs.src) {
      if (remote(attrs.src)) {
        if (!Object.hasOwn(attrs, 'async') && !Object.hasOwn(attrs, 'defer') && attrs.type !== 'module') {
          result.remoteBlockingScripts.push(attrs.src);
        }
      } else {
        const source = urlPath(attrs.src);
        result.localScripts.push(source);
        if ((attrs.type ?? '').toLowerCase() === 'module') result.moduleScripts.push(source);
      }
    } else if (tag.name === 'link') {
      const rel = new Set((attrs.rel ?? '').toLowerCase().split(/\s+/));
      if (attrs.href && rel.has('stylesheet') && !remote(attrs.href)) result.localStyles.push(urlPath(attrs.href));
      if (attrs.href && (rel.has('preload') || rel.has('modulepreload'))) {
        result.preloads.push({ kind: preloadKind(attrs), href: urlPath(attrs.href), attrs });
      }
    } else if (tag.name === 'img') {
      if (parentClasses.has('imgShop')) result.productImages.push(attrs);
      if (classSet(attrs).has('imgBannerShop')) result.bannerImages.push(attrs);
    }

    if (!VOID_TAGS.has(tag.name) && !tag.raw.endsWith('/>')) {
      stack.push({ name: tag.name, classes: classSet(attrs) });
    }
  }
  return result;
}

function sameSet(actual: Set<string>, expected: Set<string>): boolean {
  return actual.size === expected.size && [...expected].every((value) => actual.has(value));
}

export function validatePerformanceBudget(mode = 'pre'): void {
  assert(mode === 'pre', `Unsupported performance budget mode: ${mode}`);
  const index = path.join(SITE, 'index.html');
  assert(fs.existsSync(index), 'Prepared Pages index is missing');

  const budget = parseBudget(read(index));
  const errors: string[] = [];
  const scripts = new Set(budget.localScripts);
  const styles = new Set(budget.localStyles);

  if (!sameSet(scripts, EXPECTED_SCRIPTS)) {
    errors.push(`local script topology changed: expected=${JSON.stringify([...EXPECTED_SCRIPTS].sort())}, actual=${JSON.stringify([...scripts].sort())}`);
  }
  if (budget.localScripts.length !== scripts.size) errors.push(`duplicate local script request(s): ${JSON.stringify(budget.localScripts)}`);
  if (budget.moduleScripts.length !== 1 || budget.moduleScripts[0] !== 'override/main.js') {
    errors.push(`override entrypoint must be the only local ES module: ${JSON.stringify(budget.moduleScripts)}`);
  }

  if (!sameSet(styles, EXPECTED_STYLES)) {
    errors.push(`local stylesheet topology changed: expected=${JSON.stringify([...EXPECTED_STYLES].sort())}, actual=${JSON.stringify([...styles].sort())}`);
  }
  if (budget.localStyles.length !== styles.size) errors.push(`duplicate local stylesheet request(s): ${JSON.stringify(budget.localStyles)}`);
  if (budget.remoteBlockingScripts.length) errors.push(`blocking remote scripts detected: ${JSON.stringify(budget.remoteBlockingScripts)}`);

  if (!budget.productImages.length) {
    errors.push('no product images detected');
  } else {
    const bad: number[] = [];
    budget.productImages.forEach((attrs, index) => {
      if (attrs.loading !== 'lazy' || attrs.decoding !== 'async' || (attrs.fetchpriority ?? '').toLowerCase() === 'high') bad.push(index + 1);
    });
    if (bad.length) errors.push(`product images outside lazy/async budget: ${JSON.stringify(unique(bad).slice(0, 20))}`);
  }

  if (budget.bannerImages.length !== 1) {
    errors.push(`expected exactly one catalogue banner, found ${budget.bannerImages.length}`);
  } else {
    const banner = budget.bannerImages[0]!;
    if (banner.loading !== 'eager' || banner.decoding !== 'async' || banner.fetchpriority !== 'high') {
      errors.push('catalogue banner lost eager/async/high-priority attributes');
    }
    const source = urlPath(banner.src ?? '');
    const imagePreloads = budget.preloads.filter((item) => item.kind === 'image').map((item) => item.href);
    if (imagePreloads.filter((value) => value === source).length !== 1) {
      errors.push(`catalogue banner preload mismatch: banner=${source}, image_preloads=${JSON.stringify(imagePreloads)}`);
    }
  }

  const required = [
    ['script', '_js_dev/main-legacy.js'],
    ['style', 'override/main.css'],
    ['module', 'override/main.js'],
    ['font', '_remote-assets/fuentes/AcuminPro-Regular.woff2'],
    ['font', '_remote-assets/fuentes/AcuminPro-Semibold.woff2'],
  ] as const;
  const actual = new Set(budget.preloads.map((item) => `${item.kind}\0${item.href}`));
  const missing = required.filter(([kind, href]) => !actual.has(`${kind}\0${href}`));
  if (missing.length) errors.push(`missing critical preload(s): ${JSON.stringify(missing)}`);

  if (errors.length) failList('Pages performance budget failed', errors);
}
