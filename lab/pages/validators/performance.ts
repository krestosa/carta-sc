import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, read } from '../lib/core.js';
import {
  VOID_TAGS,
  classSet,
  failList,
  remote,
  scanTags,
  unique,
  urlPath,
  type HtmlAttributes,
} from './shared.js';

type PreloadKind = 'script' | 'module' | 'style' | 'font' | 'image' | string;

interface PreloadResource {
  readonly kind: PreloadKind;
  readonly href: string;
  readonly attrs: HtmlAttributes;
}

interface PerformanceBudget {
  readonly localScripts: string[];
  readonly moduleScripts: string[];
  readonly remoteBlockingScripts: string[];
  readonly localStyles: string[];
  readonly preloads: PreloadResource[];
  readonly productImages: HtmlAttributes[];
  readonly bannerImages: HtmlAttributes[];
}

interface StackEntry {
  readonly name: string;
  readonly classes: Set<string>;
}

const EXPECTED_SCRIPTS = new Set([
  'js/jquery-2.1.0.min.js',
  '_pages/legacy.js',
  '_js_dev/main-legacy.js',
  'override/main.js',
  '_pages/shop.js',
]);
const EXPECTED_STYLES = new Set(['_pages/legacy.css', 'override/main.css']);
const REQUIRED_PRELOADS = [
  ['script', '_js_dev/main-legacy.js'],
  ['style', 'override/main.css'],
  ['module', 'override/main.js'],
  ['font', '_remote-assets/fuentes/AcuminPro-Regular.woff2'],
  ['font', '_remote-assets/fuentes/AcuminPro-Semibold.woff2'],
] as const;

function preloadKind(attrs: HtmlAttributes): PreloadKind {
  const relations = new Set((attrs.rel ?? '').toLowerCase().split(/\s+/));
  if (relations.has('modulepreload')) return 'module';
  return (attrs.as ?? '').toLowerCase();
}

function parentClasses(stack: readonly StackEntry[]): Set<string> {
  const classes = new Set<string>();
  for (const item of stack) {
    for (const className of item.classes) classes.add(className);
  }
  return classes;
}

function closeStack(stack: StackEntry[], tagName: string): void {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    if (stack[index]?.name !== tagName) continue;
    stack.splice(index);
    return;
  }
}

function parseBudget(html: string): PerformanceBudget {
  const budget: PerformanceBudget = {
    localScripts: [],
    moduleScripts: [],
    remoteBlockingScripts: [],
    localStyles: [],
    preloads: [],
    productImages: [],
    bannerImages: [],
  };
  const stack: StackEntry[] = [];

  for (const tag of scanTags(html)) {
    if (tag.closing) {
      closeStack(stack, tag.name);
      continue;
    }

    const attrs = tag.attrs;
    const ancestors = parentClasses(stack);

    if (tag.name === 'script' && attrs.src) {
      if (remote(attrs.src)) {
        const blocking = !Object.hasOwn(attrs, 'async')
          && !Object.hasOwn(attrs, 'defer')
          && attrs.type !== 'module';
        if (blocking) budget.remoteBlockingScripts.push(attrs.src);
      } else {
        const source = urlPath(attrs.src);
        budget.localScripts.push(source);
        if ((attrs.type ?? '').toLowerCase() === 'module') budget.moduleScripts.push(source);
      }
    } else if (tag.name === 'link') {
      const relations = new Set((attrs.rel ?? '').toLowerCase().split(/\s+/));
      if (attrs.href && relations.has('stylesheet') && !remote(attrs.href)) {
        budget.localStyles.push(urlPath(attrs.href));
      }
      if (attrs.href && (relations.has('preload') || relations.has('modulepreload'))) {
        budget.preloads.push({ kind: preloadKind(attrs), href: urlPath(attrs.href), attrs });
      }
    } else if (tag.name === 'img') {
      if (ancestors.has('imgShop')) budget.productImages.push(attrs);
      if (classSet(attrs).has('imgBannerShop')) budget.bannerImages.push(attrs);
    }

    if (!VOID_TAGS.has(tag.name) && !tag.raw.endsWith('/>')) {
      stack.push({ name: tag.name, classes: classSet(attrs) });
    }
  }

  return budget;
}

function sameSet(actual: ReadonlySet<string>, expected: ReadonlySet<string>): boolean {
  return actual.size === expected.size && [...expected].every((value) => actual.has(value));
}

function validateTopology(budget: PerformanceBudget, issues: string[]): void {
  const scripts = new Set(budget.localScripts);
  const styles = new Set(budget.localStyles);

  if (!sameSet(scripts, EXPECTED_SCRIPTS)) {
    issues.push(
      `local script topology changed: expected=${JSON.stringify([...EXPECTED_SCRIPTS].sort())}, actual=${JSON.stringify([...scripts].sort())}`,
    );
  }
  if (budget.localScripts.length !== scripts.size) {
    issues.push(`duplicate local script request(s): ${JSON.stringify(budget.localScripts)}`);
  }
  if (budget.moduleScripts.length !== 1 || budget.moduleScripts[0] !== 'override/main.js') {
    issues.push(`override entrypoint must be the only local ES module: ${JSON.stringify(budget.moduleScripts)}`);
  }

  if (!sameSet(styles, EXPECTED_STYLES)) {
    issues.push(
      `local stylesheet topology changed: expected=${JSON.stringify([...EXPECTED_STYLES].sort())}, actual=${JSON.stringify([...styles].sort())}`,
    );
  }
  if (budget.localStyles.length !== styles.size) {
    issues.push(`duplicate local stylesheet request(s): ${JSON.stringify(budget.localStyles)}`);
  }
  if (budget.remoteBlockingScripts.length > 0) {
    issues.push(`blocking remote scripts detected: ${JSON.stringify(budget.remoteBlockingScripts)}`);
  }
}

function validateProductImages(budget: PerformanceBudget, issues: string[]): void {
  if (budget.productImages.length === 0) {
    issues.push('no product images detected');
    return;
  }

  const invalid: number[] = [];
  budget.productImages.forEach((attrs, index) => {
    const highPriority = (attrs.fetchpriority ?? '').toLowerCase() === 'high';
    if (attrs.loading !== 'lazy' || attrs.decoding !== 'async' || highPriority) invalid.push(index + 1);
  });
  if (invalid.length > 0) {
    issues.push(`product images outside lazy/async budget: ${JSON.stringify(unique(invalid).slice(0, 20))}`);
  }
}

function validateBanner(budget: PerformanceBudget, issues: string[]): void {
  if (budget.bannerImages.length !== 1) {
    issues.push(`expected exactly one catalogue banner, found ${budget.bannerImages.length}`);
    return;
  }

  const banner = budget.bannerImages[0];
  if (!banner) return;
  if (banner.loading !== 'eager' || banner.decoding !== 'async' || banner.fetchpriority !== 'high') {
    issues.push('catalogue banner lost eager/async/high-priority attributes');
  }

  const source = urlPath(banner.src ?? '');
  const imagePreloads = budget.preloads
    .filter((item) => item.kind === 'image')
    .map((item) => item.href);
  if (imagePreloads.filter((value) => value === source).length !== 1) {
    issues.push(`catalogue banner preload mismatch: banner=${source}, image_preloads=${JSON.stringify(imagePreloads)}`);
  }
}

function validatePreloads(budget: PerformanceBudget, issues: string[]): void {
  const actual = new Set(budget.preloads.map((item) => `${item.kind}\0${item.href}`));
  const missing = REQUIRED_PRELOADS.filter(([kind, href]) => !actual.has(`${kind}\0${href}`));
  if (missing.length > 0) issues.push(`missing critical preload(s): ${JSON.stringify(missing)}`);
}

export function validatePerformanceBudget(mode = 'pre'): void {
  assert(mode === 'pre', `Unsupported performance budget mode: ${mode}`);
  const index = path.join(SITE, 'index.html');
  assert(fs.existsSync(index), 'Prepared Pages index is missing');

  const budget = parseBudget(read(index));
  const issues: string[] = [];
  validateTopology(budget, issues);
  validateProductImages(budget, issues);
  validateBanner(budget, issues);
  validatePreloads(budget, issues);

  if (issues.length) failList('Pages performance budget failed', issues);
}
