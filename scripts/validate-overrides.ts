import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { ROOT, readProjectFile, readText, relativeTo, walkFiles } from './lib/files.js';
import { hasDynamicImportTarget, parseProjectSource, stringLiteralUnionMembers } from './lib/typescript.js';
import { createValidationReporter, type ValidationReporter } from './lib/validation.js';

const OVERRIDE_DIR = path.join(ROOT, 'override');
const GENERATED_DIR = path.join(ROOT, '.generated', 'browser', 'override');

interface OverrideInventory {
  readonly typeScriptFiles: readonly string[];
  readonly cssFiles: readonly string[];
  readonly htmlFiles: readonly string[];
  readonly sourceJavaScript: readonly string[];
  readonly generatedJavaScript: readonly string[];
}

class OverrideValidator {
  readonly #validation: ValidationReporter = createValidationReporter();

  run(): void {
    this.#requirePaths([
      OVERRIDE_DIR,
      path.join(OVERRIDE_DIR, 'main.ts'),
      path.join(OVERRIDE_DIR, 'main.css'),
      path.join(OVERRIDE_DIR, 'core', 'types.ts'),
      path.join(OVERRIDE_DIR, 'templates', 'registry.ts'),
      GENERATED_DIR,
    ]);

    if (this.#validation.errors.length === 0) {
      const inventory = this.#inventory();
      this.#validateGeneratedJavaScript(inventory.generatedJavaScript);
      this.#validateSourceBoundaries(inventory.typeScriptFiles, inventory.sourceJavaScript);
      this.#validateCatalogViewContract();
      this.#validateSharedResponsiveStructure();
      this.#validateTemplateSources();
      this.#validateCssManifest(inventory.cssFiles);

      if (this.#validation.errors.length === 0) {
        console.log(
          `Override validation checked ${inventory.typeScriptFiles.length} TypeScript files, ${inventory.htmlFiles.length} templates, ${inventory.cssFiles.length} CSS files and ${inventory.generatedJavaScript.length} generated JS files.`,
        );
      }
    }

    this.#validation.finish('Override validation failed', 'Override validation passed.');
  }

  #relativeOverride(file: string): string {
    return relativeTo(OVERRIDE_DIR, file);
  }

  #requirePaths(paths: readonly string[]): void {
    for (const required of paths) {
      this.#validation.check(
        fs.existsSync(required),
        `Missing required frontend path: ${relativeTo(ROOT, required)}`,
      );
    }
  }

  #inventory(): OverrideInventory {
    const files = walkFiles(OVERRIDE_DIR);
    return {
      typeScriptFiles: files.filter((file) => file.endsWith('.ts')),
      cssFiles: files.filter((file) => file.endsWith('.css')),
      htmlFiles: files.filter((file) => file.endsWith('.html')),
      sourceJavaScript: files.filter((file) => file.endsWith('.js')),
      generatedJavaScript: walkFiles(GENERATED_DIR).filter((file) => file.endsWith('.js')),
    };
  }

  #validateGeneratedJavaScript(files: readonly string[]): void {
    for (const file of files) {
      const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
      if (result.status !== 0) {
        this.#validation.fail(
          `Generated JS syntax error in ${relativeTo(ROOT, file)}: ${(result.stderr || result.stdout || '').trim()}`,
        );
      }
    }
  }

  #validateSourceBoundaries(typeScriptFiles: readonly string[], sourceJavaScript: readonly string[]): void {
    if (sourceJavaScript.length > 0) {
      this.#validation.fail(
        `Project-owned JS remains in override/: ${sourceJavaScript.map((file) => this.#relativeOverride(file)).join(', ')}`,
      );
    }

    const source = typeScriptFiles.map(readText).join('\n');
    this.#validation.check(!/\bscrollRestoration\b/.test(source), 'Override must leave browser scroll restoration native');
    this.#validation.check(!/\._data\s*\(/.test(source), 'Override must not depend on private jQuery _data internals');
    this.#validation.check(!/\bdocument\.currentScript\b/.test(source), 'Override modules must not depend on document.currentScript');
    this.#validation.check(
      !fs.existsSync(path.join(OVERRIDE_DIR, 'mutations', 'scroll-restoration.ts')),
      'Manual scroll-restoration mutation must not be reintroduced',
    );
  }

  #validateCatalogViewContract(): void {
    const modes = stringLiteralUnionMembers(parseProjectSource('override/core/types.ts'), 'CatalogViewMode');
    const expected = new Set(['compact', 'list']);
    this.#validation.check(
      modes.size === expected.size && [...expected].every((mode) => modes.has(mode)),
      `CatalogViewMode must expose only compact and list; found ${JSON.stringify([...modes])}`,
    );

    const viewState = readProjectFile('override/components/catalog-tools/view-state.ts');
    const runtime = readProjectFile('override/runtime-main.ts');
    const stability = readProjectFile('override/components/catalog-tools/view-stability.css');
    this.#validation.check(
      /if\s*\(value\s*===\s*['"]normal['"]\)\s*return\s*['"]compact['"]/.test(viewState),
      'Catalog view migration must normalize the legacy normal value to compact',
    );
    this.#validation.check(
      runtime.includes("stored === 'compact' || stored === 'normal'"),
      'Runtime bootstrap must preserve legacy normal-to-compact migration',
    );
    this.#validation.check(
      hasDynamicImportTarget(parseProjectSource('override/main.ts'), './runtime-main.js'),
      'Catalog bootstrap must load the TypeScript runtime through the ES-module entrypoint',
    );
    this.#validation.check(
      stability.includes('--sc-view-list-image-width: 210px'),
      'Desktop list geometry must remain canonical',
    );
  }

  #validateSharedResponsiveStructure(): void {
    for (const relativePath of [
      'components/product-card/pricing.css',
      'components/product-card/layout.css',
      'components/product-card/image-ratio.css',
    ]) {
      this.#validation.check(
        !/@media\s*\(min-width\s*:\s*993px\)/.test(readText(path.join(OVERRIDE_DIR, relativePath))),
        `${relativePath} must inherit shared desktop-first structure`,
      );
    }
  }

  #validateTemplateSources(): void {
    const registry = readProjectFile('override/templates/registry.ts');
    const references = [...registry.matchAll(/['"]([^'"]+\.html)['"]/g)]
      .map((match) => match[1])
      .filter((reference): reference is string => Boolean(reference));

    for (const reference of references) {
      this.#validation.check(
        fs.existsSync(path.join(OVERRIDE_DIR, reference)),
        `Template registry references missing source: override/${reference}`,
      );
    }
  }

  #validateCssManifest(cssFiles: readonly string[]): void {
    const manifest = readProjectFile('override/main.css');
    const references = [...manifest.matchAll(/@import\s+(?:url\()?['"]([^'"]+)['"]\)?\s*;/g)]
      .map((match) => match[1])
      .filter((reference): reference is string => Boolean(reference));
    const imported = new Set<string>();

    this.#validation.check(
      new Set(references).size === references.length,
      'CSS manifest must not contain duplicate imports',
    );

    for (const reference of references) {
      const [assetPath = '', query = ''] = reference.split('?');
      const normalized = assetPath.replace(/^\.\//, '').replaceAll('\\', '/');
      imported.add(normalized);
      this.#validation.check(query === 'v=unversioned', `CSS import must use ?v=unversioned: ${reference}`);
      this.#validation.check(
        fs.existsSync(path.resolve(OVERRIDE_DIR, assetPath)),
        `Missing CSS import target: ${assetPath}`,
      );
    }

    const expected = new Set(
      cssFiles
        .filter((file) => file !== path.join(OVERRIDE_DIR, 'main.css'))
        .map((file) => this.#relativeOverride(file)),
    );
    const missing = [...expected].filter((file) => !imported.has(file)).sort();
    const unexpected = [...imported].filter((file) => !expected.has(file)).sort();
    this.#validation.check(
      missing.length === 0 && unexpected.length === 0,
      `CSS manifest must cover every override stylesheet exactly once; missing=${missing.join(',') || 'none'}, unexpected=${unexpected.join(',') || 'none'}`,
    );
  }
}

export function validateOverrides(): void {
  new OverrideValidator().run();
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(path.resolve(entry)).href) {
  validateOverrides();
}
