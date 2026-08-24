import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readProjectFile } from './lib/files.js';
import { hasDynamicImportTarget, parseProjectSource, stringLiteralUnionMembers } from './lib/typescript.js';
import { createValidationReporter, type ValidationReporter } from './lib/validation.js';

function sameValues(actual: ReadonlySet<string>, expected: ReadonlySet<string>): boolean {
  return actual.size === expected.size && [...expected].every((value) => actual.has(value));
}

function cssCustomProperty(source: string, name: string, value: string): boolean {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${escapedName}\\s*:\\s*${escapedValue}(?:\\s*[;}]|$)`).test(source);
}

class ResponsiveContractValidator {
  readonly #validation: ValidationReporter = createValidationReporter();

  run(): void {
    this.#validateViewModes();
    this.#validateDensityGrid();
    this.#validateListGeometry();
    this.#validateNoDesktopStructuralForks();
    this.#validateViewportWidthSafety();
    this.#validation.finish('Responsive contract validation failed', 'Responsive contract validation passed.');
  }

  #validateViewModes(): void {
    const types = parseProjectSource('override/core/types.ts');
    const modes = stringLiteralUnionMembers(types, 'CatalogViewMode');
    const expected = new Set(['compact', 'list']);
    this.#validation.check(
      sameValues(modes, expected),
      `CatalogViewMode must expose compact and list only; found ${JSON.stringify([...modes])}`,
    );

    const viewState = readProjectFile('override/components/catalog-tools/view-state.ts');
    this.#validation.check(
      /if\s*\(value\s*===\s*['"]normal['"]\)\s*return\s*['"]compact['"]/.test(viewState),
      'legacy normal preference must migrate to compact',
    );

    const bootstrap = parseProjectSource('override/main.ts');
    this.#validation.check(
      hasDynamicImportTarget(bootstrap, './runtime-main.js'),
      'main.ts must delegate catalog bootstrap to the ES-module runtime',
    );
  }

  #validateDensityGrid(): void {
    const tools = readProjectFile('override/components/catalog-tools/catalog-tools.css');
    this.#validation.check(
      !/data-sc-catalog-view=['"]list['"]/.test(tools),
      'catalog-tools.css must not own list geometry',
    );

    for (const [value, label] of [
      ['4', 'desktop density must default to 4 columns'],
      ['3', 'tablet density must override to 3 columns'],
      ['2', 'phone density must override to 2 columns'],
    ] as const) {
      this.#validation.check(cssCustomProperty(tools, '--sc-compact-columns', value), label);
    }

    const grid = readProjectFile('override/features/catalog/layout.css');
    this.#validation.check(
      cssCustomProperty(grid, '--sc-catalog-base-columns', '4'),
      'catalog desktop base must be 4 columns',
    );
  }

  #validateListGeometry(): void {
    const list = readProjectFile('override/components/catalog-tools/view-stability.css');
    for (const value of ['210px', '160px', '150px']) {
      this.#validation.check(
        cssCustomProperty(list, '--sc-view-list-image-width', value),
        `Missing list token --sc-view-list-image-width: ${value}`,
      );
    }

    this.#validation.check(
      /grid-template-columns\s*:\s*var\(\s*--sc-view-list-image-width\s*\)\s+minmax\(\s*0\s*,\s*1fr\s*\)\s*!important/.test(list),
      'shared two-column list anatomy missing',
    );
    this.#validation.check(
      !/@media\s*\(min-width\s*:\s*993px\)/.test(list),
      'list structure must not fork into a desktop-only media block',
    );
  }

  #validateNoDesktopStructuralForks(): void {
    const sharedFiles = [
      'override/components/product-card/layout.css',
      'override/components/product-card/pricing.css',
      'override/components/product-card/image-ratio.css',
      'override/components/section-heading/layout.css',
      'override/features/content-normalizer/content-normalizer.css',
      'override/components/product-modal/motion.css',
    ] as const;

    for (const file of sharedFiles) {
      this.#validation.check(
        !/@media\s*\(min-width\s*:\s*993px\)/.test(readProjectFile(file)),
        `${file} contains a desktop-only structural fork`,
      );
    }
  }

  #validateViewportWidthSafety(): void {
    const mainCss = readProjectFile('override/main.css').trimEnd();
    this.#validation.check(
      mainCss.endsWith('@import "./core/viewport-boundary.css?v=unversioned";'),
      'viewport-boundary.css must be the final override stylesheet',
    );

    const viewportBoundFiles = [
      'override/components/category-nav/controls.css',
      'override/components/mobile-header/mobile-header.css',
      'override/components/product-modal/shell.css',
      'override/components/product-modal/responsive.css',
      'lab/pages/steps/system-logo-style.ts',
    ] as const;

    for (const file of viewportBoundFiles) {
      this.#validation.check(
        !readProjectFile(file).includes('100vw'),
        `${file} must resolve inline width from its containing block instead of 100vw`,
      );
    }

    const categoryControls = readProjectFile('override/components/category-nav/controls.css');
    this.#validation.check(
      /inset\s*:\s*-6px\s+0(?:\s*!important)?\s*;/.test(categoryControls),
      'desktop category control hit area must stay vertically expanded by 6px without extending horizontally',
    );

    const boundary = readProjectFile('override/core/viewport-boundary.css');
    for (const selector of [
      '.listadoShop .carritoFixed',
      '.carritoFixedContent .carritoFixed',
      '.noMargMobileRow',
      '.colPart.colPartL',
      '.noMargMobile',
    ]) {
      this.#validation.check(boundary.includes(selector), `viewport boundary must neutralize legacy over-width selector ${selector}`);
    }
    this.#validation.check(
      !/overflow-x\s*:\s*(?:hidden|clip)/.test(boundary),
      'viewport boundary must prevent over-width geometry instead of hiding horizontal overflow',
    );
  }
}

export function validateResponsiveContract(): void {
  new ResponsiveContractValidator().run();
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(path.resolve(entry)).href) {
  validateResponsiveContract();
}
