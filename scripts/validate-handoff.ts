import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { normalizePath, walkFiles } from './lib/files.js';

interface ValidationInputs {
  readonly handoffRoot: string;
  readonly referenceRoot: string | null;
}

const REQUIRED_ROOT_ENTRIES = [
  'build.ps1',
  'build.sh',
  'compiled',
  'serve.ps1',
  'serve.sh',
  'server.mjs',
  'source',
] as const;

const REQUIRED_SOURCE_PATHS = [
  'index.html',
  'package.json',
  'package-lock.json',
  'tsconfig.base.json',
  'tsconfig.browser.json',
  'tsconfig.tooling.json',
  'override',
  'types',
  'lab/pages/build.ts',
  'lab/handoff/staticize.ts',
  'lab/handoff/static-server.ts',
  'scripts/sync-runtime.ts',
  'scripts/lib',
] as const;

const REQUIRED_COMPILED_PATHS = [
  'index.html',
  '_pages/deferred.css',
  '_pages/legacy.js',
  '_pages/php-guard.js',
  '_pages/shop.js',
  '_static/runtime.js',
  '_js_dev/main-legacy.js',
  'js/jquery-2.1.0.min.js',
] as const;

const ALLOWED_SOURCE_TOP_LEVEL = new Set([
  '_css_dev',
  '_js_dev',
  'css',
  'index.html',
  'js',
  'lab',
  'override',
  'package-lock.json',
  'package.json',
  'scripts',
  'tsconfig.base.json',
  'tsconfig.browser.json',
  'tsconfig.tooling.json',
  'types',
]);

class HandoffValidator {
  constructor(private readonly inputs: ValidationInputs) {}

  run(): void {
    this.#requireHandoffShape();
    this.#validateSourceBoundary(path.join(this.inputs.handoffRoot, 'source'));
    this.#validateCompiledBoundary(path.join(this.inputs.handoffRoot, 'compiled'));
    if (this.inputs.referenceRoot) this.#validateCatalogParity(this.inputs.referenceRoot);
    console.log('Handoff validation passed.');
  }

  #requireHandoffShape(): void {
    const actual = fs.readdirSync(this.inputs.handoffRoot).sort();
    const expected = [...REQUIRED_ROOT_ENTRIES].sort();
    if (actual.length !== expected.length || actual.some((entry, index) => entry !== expected[index])) {
      throw new Error(`Unexpected handoff root contents: ${actual.join(', ')}`);
    }

    for (const relativePath of REQUIRED_SOURCE_PATHS) {
      if (!fs.existsSync(path.join(this.inputs.handoffRoot, 'source', relativePath))) {
        throw new Error(`Missing handoff source path: ${relativePath}`);
      }
    }

    for (const relativePath of REQUIRED_COMPILED_PATHS) {
      const file = path.join(this.inputs.handoffRoot, 'compiled', relativePath);
      if (!fs.existsSync(file) || !fs.statSync(file).isFile() || fs.statSync(file).size === 0) {
        throw new Error(`Missing compiled handoff path: ${relativePath}`);
      }
    }

    for (const launcher of ['build.ps1', 'build.sh', 'serve.ps1', 'serve.sh', 'server.mjs']) {
      const file = path.join(this.inputs.handoffRoot, launcher);
      if (!fs.statSync(file).isFile() || fs.statSync(file).size === 0) {
        throw new Error(`Missing handoff launcher: ${launcher}`);
      }
    }
  }

  #validateSourceBoundary(sourceRoot: string): void {
    for (const entry of fs.readdirSync(sourceRoot)) {
      if (!ALLOWED_SOURCE_TOP_LEVEL.has(entry)) {
        throw new Error(`Unrelated top-level source entry leaked into handoff: ${entry}`);
      }
    }

    for (const file of walkFiles(sourceRoot)) {
      const relativePath = normalizePath(path.relative(sourceRoot, file));
      const segments = relativePath.split('/');
      const extension = path.extname(relativePath).toLowerCase();

      if (segments.some((segment) => segment.startsWith('.'))) {
        throw new Error(`Hidden repository file leaked into handoff source: ${relativePath}`);
      }
      if (['.md', '.map', '.mjs', '.py', '.ps1', '.sh'].includes(extension) || /requirements(?:\.txt)?$/i.test(relativePath)) {
        throw new Error(`Non-build source leaked into handoff source: ${relativePath}`);
      }
      if (relativePath.startsWith('lab/')
        && !relativePath.startsWith('lab/pages/')
        && relativePath !== 'lab/handoff/staticize.ts'
        && relativePath !== 'lab/handoff/static-server.ts') {
        throw new Error(`Unrelated lab tooling leaked into handoff source: ${relativePath}`);
      }
      if (relativePath.startsWith('scripts/')
        && relativePath !== 'scripts/sync-runtime.ts'
        && !relativePath.startsWith('scripts/lib/')) {
        throw new Error(`Unrelated build script leaked into handoff source: ${relativePath}`);
      }
      if (extension === '.js' && relativePath.startsWith('override/')) {
        throw new Error(`Generated owned JavaScript leaked into handoff source: ${relativePath}`);
      }
    }
  }

  #validateCompiledBoundary(compiledRoot: string): void {
    const forbiddenDirectories = ['override', '_css_dev', 'css'];
    for (const directory of forbiddenDirectories) {
      if (fs.existsSync(path.join(compiledRoot, directory))) {
        throw new Error(`Unused source/intermediate directory leaked into compiled handoff: ${directory}`);
      }
    }

    for (const file of walkFiles(compiledRoot)) {
      const relativePath = normalizePath(path.relative(compiledRoot, file));
      const segments = relativePath.split('/');
      const extension = path.extname(relativePath).toLowerCase();
      if (segments.some((segment) => segment.startsWith('.'))) {
        throw new Error(`Hidden repository file leaked into compiled handoff: ${relativePath}`);
      }
      if (['.md', '.map', '.ts'].includes(extension)) {
        throw new Error(`Source-only file leaked into compiled handoff: ${relativePath}`);
      }
      if (relativePath.startsWith('lab/') || relativePath.startsWith('scripts/') || relativePath.startsWith('types/')) {
        throw new Error(`Build tooling leaked into compiled handoff: ${relativePath}`);
      }
    }

    const jsDev = path.join(compiledRoot, '_js_dev');
    const js = path.join(compiledRoot, 'js');
    if (fs.readdirSync(jsDev).some((entry) => entry !== 'main-legacy.js')) {
      throw new Error('Unused legacy JavaScript leaked into compiled handoff');
    }
    if (fs.readdirSync(js).some((entry) => entry !== 'jquery-2.1.0.min.js')) {
      throw new Error('Unused JavaScript leaked into compiled handoff');
    }

    const html = fs.readFileSync(path.join(compiledRoot, 'index.html'), 'utf8');
    if (/<script\s+type=["']module["']>/i.test(html) || /kind:\s*["']module["']/i.test(html)) {
      throw new Error('Compiled handoff still depends on ES module loading');
    }
    if (/override\/main\.js/i.test(html)) {
      throw new Error('Compiled handoff still references the module source runtime');
    }
    if (!html.includes("_static/runtime.js?v=' + VERSION")) {
      throw new Error('Compiled handoff does not load the static runtime');
    }
    if ((html.match(/productoShop/g) ?? []).length <= 100) {
      throw new Error('Compiled handoff is missing the product grid');
    }
    if ((html.match(/data-sc-src=/g) ?? []).length <= 100) {
      throw new Error('Compiled handoff is missing product image sources');
    }

    const runtime = fs.readFileSync(path.join(compiledRoot, '_static/runtime.js'), 'utf8');
    if (!runtime.includes('override/runtime-main.js') || runtime.includes('import.meta')) {
      throw new Error('Static runtime bundle is incomplete');
    }
  }

  #validateCatalogParity(referenceRoot: string): void {
    const compiledHtml = fs.readFileSync(path.join(this.inputs.handoffRoot, 'compiled', 'index.html'), 'utf8');
    const referenceHtml = fs.readFileSync(path.join(referenceRoot, 'index.html'), 'utf8');
    const compiledProducts = compiledHtml.match(/class=["'][^"']*productoShop[^"']*["']/g) ?? [];
    const referenceProducts = referenceHtml.match(/class=["'][^"']*productoShop[^"']*["']/g) ?? [];
    if (compiledProducts.length !== referenceProducts.length) {
      throw new Error(`Compiled catalog product count differs from source artifact: ${compiledProducts.length} != ${referenceProducts.length}`);
    }
  }
}

function validationInputs(argv: readonly string[] = process.argv): ValidationInputs {
  return {
    handoffRoot: path.resolve(argv[2] ?? 'handoff'),
    referenceRoot: argv[3] ? path.resolve(argv[3]) : null,
  };
}

export function validateHandoff(inputs: ValidationInputs = validationInputs()): void {
  new HandoffValidator(inputs).run();
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(path.resolve(entry)).href) {
  validateHandoff();
}
