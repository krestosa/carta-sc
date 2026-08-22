import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as ts from 'typescript';
import {
  assert,
  copyTree,
  ensureDir,
  nodeCheck,
  read,
  remove,
  replaceRegexOnce,
  walk,
  write,
} from '../pages/lib/core.js';

const RUNTIME_ENTRY = 'override/runtime-main.js';
const RUNTIME_OUTPUT = '_static/runtime.js';
const DELIVERY_LOADER_ID = 'sc-pages-delivery-loader';

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

const KEEP_JS_DEV = new Set(['main-legacy.js']);
const KEEP_JS = new Set(['jquery-2.1.0.min.js']);

function normalized(file: string): string {
  return file.replaceAll(path.sep, '/');
}

function moduleId(root: string, file: string): string {
  return normalized(path.relative(root, file));
}

function transpileModule(file: string): string {
  const source = read(file).replaceAll('import.meta.url', 'location.href');
  const result = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      allowJs: true,
      checkJs: false,
      target: ts.ScriptTarget.ES2018,
      module: ts.ModuleKind.CommonJS,
      sourceMap: false,
      removeComments: false,
    },
  });

  const errors = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  if (errors.length) {
    const detail = errors
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
      .join('; ');
    throw new Error(`Could not bundle ${file}: ${detail}`);
  }
  return result.outputText;
}

function runtimeBundle(siteRoot: string): string {
  const overrideRoot = path.join(siteRoot, 'override');
  const files = walk(overrideRoot)
    .filter((file) => file.endsWith('.js'))
    .filter((file) => moduleId(siteRoot, file) !== 'override/main.js')
    .sort((left, right) => left.localeCompare(right));

  const ids = new Set(files.map((file) => moduleId(siteRoot, file)));
  assert(ids.has(RUNTIME_ENTRY), `Missing handoff runtime entry: ${RUNTIME_ENTRY}`);

  const factories = files.map((file) => {
    const id = moduleId(siteRoot, file);
    return `${JSON.stringify(id)}: function(require, module, exports) {\n${transpileModule(file)}\n}`;
  });

  return `(function () {\n` +
    `'use strict';\n` +
    `const modules = {\n${factories.join(',\n')}\n};\n` +
    `const cache = Object.create(null);\n` +
    `function normalizeParts(parts) {\n` +
    `  const output = [];\n` +
    `  for (const part of parts) {\n` +
    `    if (!part || part === '.') continue;\n` +
    `    if (part === '..') output.pop();\n` +
    `    else output.push(part);\n` +
    `  }\n` +
    `  return output.join('/');\n` +
    `}\n` +
    `function resolve(parent, request) {\n` +
    `  const bare = request.split(/[?#]/, 1)[0];\n` +
    `  if (!bare.startsWith('.')) throw new Error('Unsupported bundled module: ' + request);\n` +
    `  const base = parent.split('/');\n` +
    `  base.pop();\n` +
    `  return normalizeParts(base.concat(bare.split('/')));\n` +
    `}\n` +
    `function load(id) {\n` +
    `  id = id.split(/[?#]/, 1)[0];\n` +
    `  const cached = cache[id];\n` +
    `  if (cached) return cached.exports;\n` +
    `  const factory = modules[id];\n` +
    `  if (!factory) throw new Error('Missing bundled module: ' + id);\n` +
    `  const module = { exports: {} };\n` +
    `  cache[id] = module;\n` +
    `  factory((request) => load(resolve(id, request)), module, module.exports);\n` +
    `  return module.exports;\n` +
    `}\n` +
    `try {\n` +
    `  load(${JSON.stringify(RUNTIME_ENTRY)});\n` +
    `} catch (error) {\n` +
    `  document.documentElement.setAttribute('data-sc-catalog-reveal-ready', 'true');\n` +
    `  document.documentElement.classList.remove('sc-catalog-reveal-prepaint');\n` +
    `  console.error('[SushiClub override] Runtime loader failed', error);\n` +
    `}\n` +
    `})();\n`;
}

function patchIndex(compiledRoot: string): void {
  const indexFile = path.join(compiledRoot, 'index.html');
  let html = read(indexFile);

  html = replaceRegexOnce(
    html,
    /\{\s*src:\s*'override\/main\.js\?v='\s*\+\s*VERSION,\s*kind:\s*'module'\s*\},/,
    `{ src: '${RUNTIME_OUTPUT}?v=' + VERSION, kind: 'classic' },`,
    'Expected exactly one owned runtime descriptor in compiled index',
  );

  write(indexFile, html);
}

function pruneDirectory(directory: string, keep: ReadonlySet<string>): void {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !keep.has(entry.name)) remove(path.join(directory, entry.name));
  }
}

function removeEmptyDirectories(directory: string, root = directory): void {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) removeEmptyDirectories(path.join(directory, entry.name), root);
  }
  if (directory !== root && fs.readdirSync(directory).length === 0) remove(directory);
}

function pruneCompiled(compiledRoot: string): void {
  remove(path.join(compiledRoot, 'override'));
  remove(path.join(compiledRoot, '_css_dev'));
  remove(path.join(compiledRoot, 'css'));
  remove(path.join(compiledRoot, '_pages', 'legacy.css'));

  pruneDirectory(path.join(compiledRoot, '_js_dev'), KEEP_JS_DEV);
  pruneDirectory(path.join(compiledRoot, 'js'), KEEP_JS);

  for (const file of walk(compiledRoot)) {
    const relative = normalized(path.relative(compiledRoot, file));
    const segments = relative.split('/');
    const extension = path.extname(relative).toLowerCase();
    if (segments.some((segment) => segment.startsWith('.'))) {
      remove(file);
      continue;
    }
    if (['.md', '.map', '.ts'].includes(extension)) remove(file);
  }

  removeEmptyDirectories(compiledRoot);
}

function validateCompiledShape(compiledRoot: string): void {
  for (const relative of REQUIRED_COMPILED_PATHS) {
    const file = path.join(compiledRoot, relative);
    assert(fs.existsSync(file) && fs.statSync(file).isFile() && fs.statSync(file).size > 0, `Missing compiled handoff file: ${relative}`);
  }

  const html = read(path.join(compiledRoot, 'index.html'));
  const deliveryLoader = new RegExp(
    `<script\\b(?=[^>]*\\bid=["']${DELIVERY_LOADER_ID}["'])(?=[^>]*\\btype=["']module["'])[^>]*>`,
    'i',
  );
  assert(deliveryLoader.test(html), 'Compiled handoff delivery loader must remain an HTTP-served module');
  assert(!/kind:\s*["']module["']/i.test(html), 'Compiled handoff still contains a module runtime descriptor');
  assert(!/override\/main\.js/i.test(html), 'Compiled handoff still references the source module runtime');
  assert(html.includes("_static/runtime.js?v=' + VERSION"), 'Compiled handoff does not reference the static runtime');
  assert((html.match(/productoShop/g) ?? []).length > 100, 'Compiled handoff is missing the product grid');
  assert((html.match(/data-sc-src=/g) ?? []).length > 100, 'Compiled handoff is missing deferred product image sources');

  const runtimeFile = path.join(compiledRoot, RUNTIME_OUTPUT);
  const runtime = read(runtimeFile);
  assert(runtime.includes(JSON.stringify(RUNTIME_ENTRY)), 'Static runtime does not contain the application entry');
  assert(!runtime.includes('import.meta'), 'Static runtime still contains import.meta');
  nodeCheck(runtimeFile, 'classic');
}

export function staticizeCompiled(sourceRoot: string, targetRoot: string): void {
  remove(targetRoot);
  ensureDir(targetRoot);
  copyTree(sourceRoot, targetRoot, (relative, absolute) => {
    if (fs.statSync(absolute).isDirectory()) return true;
    const normalizedPath = normalized(relative);
    const segments = normalizedPath.split('/');
    const extension = path.extname(normalizedPath).toLowerCase();
    if (segments.some((segment) => segment.startsWith('.'))) return false;
    return !['.md', '.map', '.ts'].includes(extension);
  });

  const runtimeFile = path.join(targetRoot, RUNTIME_OUTPUT);
  write(runtimeFile, runtimeBundle(targetRoot));
  patchIndex(targetRoot);
  pruneCompiled(targetRoot);
  validateCompiledShape(targetRoot);
}

function isDirectExecution(): boolean {
  const entry = process.argv[1];
  return Boolean(entry && import.meta.url === pathToFileURL(path.resolve(entry)).href);
}

if (isDirectExecution()) {
  const sourceRoot = path.resolve(process.argv[2] ?? '.pages-site');
  const targetRoot = path.resolve(process.argv[3] ?? path.join('handoff', 'compiled'));
  staticizeCompiled(sourceRoot, targetRoot);
}
