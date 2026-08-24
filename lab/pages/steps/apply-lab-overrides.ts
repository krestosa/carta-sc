import path from 'node:path';
import { PAGE_ASSETS, ROOT, SITE, assert, isDir, isFile, read, write } from '../lib/core.js';

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

  const manifest = read(mainCss);
  assert(
    !LAB_STYLES.some((name) => manifest.includes(`lab-inline:${name}`)),
    'lab first-paint CSS already present in staged production stylesheet',
  );

  const labCss = LAB_STYLES
    .map((name) => `\n/* lab-inline:${name} */\n${read(path.join(PAGE_ASSETS, name)).trim()}\n`)
    .join('');
  write(mainCss, `${manifest.trimEnd()}\n${labCss}`);

  for (const relativePath of SHARED_COMPONENT_FILES) {
    const source = path.join(ROOT, relativePath);
    assert(isFile(source), `frontend source missing: ${relativePath}`);
    assert(!read(source).includes('html.sc-catalog-prepaint'), `lab prepaint alias leaked into shared component source: ${relativePath}`);
  }
}
