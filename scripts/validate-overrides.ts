import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const OVERRIDE_DIR = path.join(ROOT, 'override');
const GENERATED_DIR = path.join(ROOT, '.generated', 'browser', 'override');
const errors: string[] = [];

function fail(message: string): void {
  errors.push(message);
}

function read(file: string): string {
  return fs.readFileSync(file, 'utf8');
}

function relative(file: string): string {
  return path.relative(ROOT, file).replaceAll(path.sep, '/');
}

function relativeOverride(file: string): string {
  return path.relative(OVERRIDE_DIR, file).replaceAll(path.sep, '/');
}

function walk(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function requirePaths(paths: readonly string[]): void {
  for (const required of paths) {
    if (!fs.existsSync(required)) fail(`Missing required frontend path: ${relative(required)}`);
  }
}

function validateGeneratedJavaScript(files: readonly string[]): void {
  for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status === 0) continue;
    fail(`Generated JS syntax error in ${relative(file)}: ${(result.stderr || result.stdout || '').trim()}`);
  }
}

function validateSourceBoundaries(tsFiles: readonly string[], sourceJs: readonly string[]): void {
  if (sourceJs.length) {
    fail(`Project-owned JS remains in override/: ${sourceJs.map(relativeOverride).join(', ')}`);
  }

  const source = tsFiles.map(read).join('\n');
  if (/\bscrollRestoration\b/.test(source)) fail('Override must leave browser scroll restoration native');
  if (/\._data\s*\(/.test(source)) fail('Override must not depend on private jQuery _data internals');
  if (/\bdocument\.currentScript\b/.test(source)) fail('Override modules must not depend on document.currentScript');
  if (fs.existsSync(path.join(OVERRIDE_DIR, 'mutations', 'scroll-restoration.ts'))) {
    fail('Manual scroll-restoration mutation must not be reintroduced');
  }
}

function validateCatalogViewContract(): void {
  const types = read(path.join(OVERRIDE_DIR, 'core', 'types.ts'));
  const view = read(path.join(OVERRIDE_DIR, 'components', 'catalog-tools', 'view.ts'));
  const runtime = read(path.join(OVERRIDE_DIR, 'runtime-main.ts'));
  const bootstrap = read(path.join(OVERRIDE_DIR, 'main.ts'));
  const stability = read(path.join(OVERRIDE_DIR, 'components', 'catalog-tools', 'view-stability.css'));

  const viewType = /export\s+type\s+CatalogViewMode\s*=\s*([^;]+);/.exec(types)?.[1] ?? '';
  const modes = new Set([...viewType.matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]));
  const expected = new Set(['compact', 'list']);
  if (modes.size !== expected.size || [...expected].some((mode) => !modes.has(mode))) {
    fail(`CatalogViewMode must expose only compact and list; found ${JSON.stringify([...modes])}`);
  }

  if (!/if\s*\(value\s*===\s*['"]normal['"]\)\s*return\s*['"]compact['"]/.test(view)) {
    fail('Catalog view migration must normalize the legacy normal value to compact');
  }
  if (!runtime.includes("stored === 'compact' || stored === 'normal'")) {
    fail('Runtime bootstrap must preserve legacy normal-to-compact migration');
  }
  if (!bootstrap.includes("import(`./runtime-main.js?v=${encodeURIComponent(assetVersion)}`)")) {
    fail('Catalog bootstrap must load the TypeScript runtime through the ES-module entrypoint');
  }
  if (!stability.includes('--sc-view-list-image-width: 210px')) {
    fail('Desktop list geometry must remain canonical');
  }
}

function validateSharedResponsiveStructure(): void {
  for (const relativePath of [
    'components/product-card/pricing.css',
    'components/product-card/layout.css',
    'components/product-card/image-ratio.css',
  ]) {
    const source = read(path.join(OVERRIDE_DIR, relativePath));
    if (/@media\s*\(min-width\s*:\s*993px\)/.test(source)) {
      fail(`${relativePath} must inherit shared desktop-first structure`);
    }
  }
}

function validateTemplateSources(): void {
  const registry = read(path.join(OVERRIDE_DIR, 'templates', 'registry.ts'));
  const references = [...registry.matchAll(/['"]([^'"]+\.html)['"]/g)]
    .map((match) => match[1])
    .filter((reference): reference is string => Boolean(reference));

  for (const reference of references) {
    if (!fs.existsSync(path.join(OVERRIDE_DIR, reference))) {
      fail(`Template registry references missing source: override/${reference}`);
    }
  }
}

function validateCssManifest(): void {
  const manifest = read(path.join(OVERRIDE_DIR, 'main.css'));
  const references = [...manifest.matchAll(/@import\s+(?:url\()?['"]([^'"]+)['"]\)?\s*;/g)]
    .map((match) => match[1])
    .filter((reference): reference is string => Boolean(reference));

  for (const reference of references) {
    const [assetPath = '', query = ''] = reference.split('?');
    if (query !== 'v=unversioned') fail(`CSS import must use ?v=unversioned: ${reference}`);
    if (!fs.existsSync(path.resolve(OVERRIDE_DIR, assetPath))) fail(`Missing CSS import target: ${assetPath}`);
  }
}

requirePaths([
  OVERRIDE_DIR,
  path.join(OVERRIDE_DIR, 'main.ts'),
  path.join(OVERRIDE_DIR, 'main.css'),
  path.join(OVERRIDE_DIR, 'core', 'types.ts'),
  path.join(OVERRIDE_DIR, 'templates', 'registry.ts'),
  GENERATED_DIR,
]);

if (!errors.length) {
  const files = walk(OVERRIDE_DIR);
  const tsFiles = files.filter((file) => file.endsWith('.ts'));
  const cssFiles = files.filter((file) => file.endsWith('.css'));
  const htmlFiles = files.filter((file) => file.endsWith('.html'));
  const sourceJs = files.filter((file) => file.endsWith('.js'));
  const generatedJs = walk(GENERATED_DIR).filter((file) => file.endsWith('.js'));

  validateGeneratedJavaScript(generatedJs);
  validateSourceBoundaries(tsFiles, sourceJs);
  validateCatalogViewContract();
  validateSharedResponsiveStructure();
  validateTemplateSources();
  validateCssManifest();

  console.log(
    `Override validation checked ${tsFiles.length} TypeScript files, ${htmlFiles.length} templates, ${cssFiles.length} CSS files and ${generatedJs.length} generated JS files.`,
  );
}

if (errors.length) {
  console.error(`Override validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
