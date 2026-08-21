import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const errors: string[] = [];

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function fail(message: string): void {
  errors.push(message);
}

function catalogViewModes(): Set<string> {
  const source = read('override/core/types.ts');
  const definition = /export\s+type\s+CatalogViewMode\s*=\s*([^;]+);/.exec(source)?.[1] ?? '';
  return new Set([...definition.matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]).filter((mode): mode is string => Boolean(mode)));
}

function validateViewModes(): void {
  const modes = catalogViewModes();
  const expected = new Set(['compact', 'list']);
  if (modes.size !== expected.size || [...expected].some((mode) => !modes.has(mode))) {
    fail(`CatalogViewMode must expose density + list only; found ${JSON.stringify([...modes])}`);
  }

  const view = read('override/components/catalog-tools/view.ts');
  if (!/if\s*\(value\s*===\s*['"]normal['"]\)\s*return\s*['"]compact['"]/.test(view)) {
    fail('legacy normal preference must migrate to density');
  }

  const bootstrap = read('override/main.ts');
  if (!bootstrap.includes("import(`./runtime-main.js?v=${encodeURIComponent(assetVersion)}`)")) {
    fail('main.ts must delegate catalog bootstrap to the ES-module runtime');
  }
}

function validateDensityGrid(): void {
  const tools = read('override/components/catalog-tools/catalog-tools.css');
  if (/data-sc-catalog-view=['"]list['"]/.test(tools)) fail('catalog-tools.css must not own list geometry');

  for (const [token, label] of [
    ['--sc-compact-columns: 4', 'desktop density must default to 4 columns'],
    ['--sc-compact-columns: 3', 'tablet density must override to 3 columns'],
    ['--sc-compact-columns: 2', 'phone density must override to 2 columns'],
  ] as const) {
    if (!tools.includes(token)) fail(label);
  }

  const grid = read('override/features/catalog/layout.css');
  if (!grid.includes('--sc-catalog-base-columns: 4')) fail('catalog desktop base must be 4 columns');
}

function validateListGeometry(): void {
  const list = read('override/components/catalog-tools/view-stability.css');
  for (const token of [
    '--sc-view-list-image-width: 210px',
    '--sc-view-list-image-width: 160px',
    '--sc-view-list-image-width: 150px',
  ]) {
    if (!list.includes(token)) fail(`Missing list token ${token}`);
  }

  if (!list.includes('grid-template-columns: var(--sc-view-list-image-width) minmax(0, 1fr) !important')) {
    fail('shared two-column list anatomy missing');
  }
  if (/@media\s*\(min-width\s*:\s*993px\)/.test(list)) {
    fail('list structure must not fork into a desktop-only media block');
  }
}

function validateNoDesktopStructuralForks(): void {
  const sharedFiles = [
    'override/components/product-card/layout.css',
    'override/components/product-card/pricing.css',
    'override/components/product-card/image-ratio.css',
    'override/components/section-heading/layout.css',
    'override/features/content-normalizer/content-normalizer.css',
    'override/components/product-modal/motion.css',
  ] as const;

  for (const file of sharedFiles) {
    if (/@media\s*\(min-width\s*:\s*993px\)/.test(read(file))) {
      fail(`${file} contains a desktop-only structural fork`);
    }
  }
}

validateViewModes();
validateDensityGrid();
validateListGeometry();
validateNoDesktopStructuralForks();

if (errors.length) {
  console.error(`Responsive contract validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Responsive contract validation passed.');
