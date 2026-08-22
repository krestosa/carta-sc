import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, readText, relativeTo, walkFiles } from './lib/files.js';
import { createValidationReporter, type ValidationReporter } from './lib/validation.js';

interface BoundaryRule {
  readonly label: string;
  readonly pattern: RegExp;
}

const OVERRIDE_ROOT = path.join(ROOT, 'override');
const RUNTIME_EXTENSIONS = new Set(['.ts', '.css', '.html']);
const RULES: readonly BoundaryRule[] = [
  { label: 'GitHub Pages host', pattern: /krestosa\.github\.io/i },
  { label: 'Pages environment flag', pattern: /\bGITHUB_PAGES\b/ },
  { label: 'static Pages runtime branch', pattern: /\bSTATIC_PAGES\b/ },
  { label: 'Pages staging directory', pattern: /\.pages-site/ },
  { label: 'Pages runtime marker', pattern: /\bsc-pages-/ },
  { label: 'critical-media lab path', pattern: /_critical-media\// },
  { label: 'first-viewport lab path', pattern: /_first-viewport\// },
  { label: 'chrome-media lab path', pattern: /_chrome-media\// },
  { label: 'desktop lab source marker', pattern: /data-sc-desktop-src/ },
  { label: 'first-viewport lab marker', pattern: /data-sc-first-viewport/ },
  { label: 'static lab shell marker', pattern: /data-sc-static-shell/ },
  { label: 'lab prepaint state', pattern: /\bsc-catalog-prepaint\b/ },
  { label: 'lab banner-ready state', pattern: /\bsc-banner-media-ready\b/ },
  { label: 'lab mobile-logo-ready state', pattern: /\bsc-mobile-logo-ready\b/ },
  { label: 'lab directory dependency', pattern: /(?:^|["'`(\s])lab\/pages\// },
];

class ProductionBoundaryValidator {
  readonly #validation: ValidationReporter = createValidationReporter();

  run(): void {
    if (!fs.existsSync(OVERRIDE_ROOT)) this.#validation.fail('override/ is missing');
    else this.#validateFiles();
    this.#validation.finish(
      'Production/lab boundary validation failed',
      'Production/lab boundary validation passed.',
    );
  }

  #validateFiles(): void {
    for (const file of walkFiles(OVERRIDE_ROOT)) {
      const relativePath = relativeTo(ROOT, file);
      if (file.endsWith('.js')) {
        this.#validation.fail(`${relativePath}: project-owned JavaScript source is forbidden`);
      }
      if (!RUNTIME_EXTENSIONS.has(path.extname(file))) continue;

      const source = readText(file);
      for (const rule of RULES) {
        if (rule.pattern.test(source)) this.#validation.fail(`${relativePath}: contains ${rule.label}`);
      }
    }
  }
}

export function validateProductionBoundary(): void {
  new ProductionBoundaryValidator().run();
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(path.resolve(entry)).href) {
  validateProductionBoundary();
}
