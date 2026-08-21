import { readProjectFile } from './lib/files.js';
import { hasDynamicImportTarget, parseProjectSource, stringLiteralUnionMembers } from './lib/typescript.js';
import { createValidationReporter } from './lib/validation.js';

const validation = createValidationReporter();

function sameValues(actual: ReadonlySet<string>, expected: ReadonlySet<string>): boolean {
  return actual.size === expected.size && [...expected].every((value) => actual.has(value));
}

function validateViewModes(): void {
  const types = parseProjectSource('override/core/types.ts');
  const modes = stringLiteralUnionMembers(types, 'CatalogViewMode');
  const expected = new Set(['compact', 'list']);
  validation.check(
    sameValues(modes, expected),
    `CatalogViewMode must expose compact and list only; found ${JSON.stringify([...modes])}`,
  );

  const view = readProjectFile('override/components/catalog-tools/view.ts');
  validation.check(
    /if\s*\(value\s*===\s*['"]normal['"]\)\s*return\s*['"]compact['"]/.test(view),
    'legacy normal preference must migrate to compact',
  );

  const bootstrap = parseProjectSource('override/main.ts');
  validation.check(
    hasDynamicImportTarget(bootstrap, './runtime-main.js'),
    'main.ts must delegate catalog bootstrap to the ES-module runtime',
  );
}

function validateDensityGrid(): void {
  const tools = readProjectFile('override/components/catalog-tools/catalog-tools.css');
  validation.check(
    !/data-sc-catalog-view=['"]list['"]/.test(tools),
    'catalog-tools.css must not own list geometry',
  );

  for (const [token, label] of [
    ['--sc-compact-columns: 4', 'desktop density must default to 4 columns'],
    ['--sc-compact-columns: 3', 'tablet density must override to 3 columns'],
    ['--sc-compact-columns: 2', 'phone density must override to 2 columns'],
  ] as const) {
    validation.check(tools.includes(token), label);
  }

  const grid = readProjectFile('override/features/catalog/layout.css');
  validation.check(grid.includes('--sc-catalog-base-columns: 4'), 'catalog desktop base must be 4 columns');
}

function validateListGeometry(): void {
  const list = readProjectFile('override/components/catalog-tools/view-stability.css');
  for (const token of [
    '--sc-view-list-image-width: 210px',
    '--sc-view-list-image-width: 160px',
    '--sc-view-list-image-width: 150px',
  ]) {
    validation.check(list.includes(token), `Missing list token ${token}`);
  }

  validation.check(
    list.includes('grid-template-columns: var(--sc-view-list-image-width) minmax(0, 1fr) !important'),
    'shared two-column list anatomy missing',
  );
  validation.check(
    !/@media\s*\(min-width\s*:\s*993px\)/.test(list),
    'list structure must not fork into a desktop-only media block',
  );
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
    validation.check(
      !/@media\s*\(min-width\s*:\s*993px\)/.test(readProjectFile(file)),
      `${file} contains a desktop-only structural fork`,
    );
  }
}

validateViewModes();
validateDensityGrid();
validateListGeometry();
validateNoDesktopStructuralForks();
validation.finish('Responsive contract validation failed', 'Responsive contract validation passed.');
