import path from 'node:path';
import { PAGE_ASSETS, SITE, assert, copyFile, isDir, isFile, read, write } from '../lib/core.js';

const LAB_STYLES = ['prepaint.css', 'performance.css'] as const;
const SHARED_COMPONENT_FILES = [
  'override/components/product-card/content.css',
  'override/components/product-card/image-ratio.css',
  'override/components/product-card/layout.css',
  'override/components/product-card/pricing.css',
  'override/components/section-heading/layout.css',
  'override/components/section-heading/section-heading.css',
] as const;

export function applyLabOverrides(): void {
  const mainCss = path.join(SITE, 'override', 'main.css');
  assert(isDir(SITE) && isFile(mainCss), 'lab Pages staging context is incomplete');

  for (const name of LAB_STYLES) {
    copyFile(path.join(PAGE_ASSETS, name), path.join(SITE, 'override', 'core', name));
  }

  const anchor = '@import "./components/category-nav/controls.css?v=unversioned";\n';
  const labImports = LAB_STYLES
    .map((name) => `@import "./core/${name}?v=unversioned";`)
    .join('\n') + '\n';
  const manifest = read(mainCss);
  assert(!LAB_STYLES.some((name) => manifest.includes(`core/${name}`)), 'lab first-paint CSS already present in staged override manifest');
  assert(manifest.includes(anchor), 'category controls import anchor missing from staged override manifest');
  write(mainCss, manifest.replace(anchor, anchor + labImports));

  for (const relativePath of SHARED_COMPONENT_FILES) {
    const staged = path.join(SITE, relativePath);
    assert(isFile(staged), `staged frontend source missing: ${relativePath}`);
    assert(!read(staged).includes('html.sc-catalog-prepaint'), `lab prepaint alias leaked into shared component source: ${relativePath}`);
  }
}
