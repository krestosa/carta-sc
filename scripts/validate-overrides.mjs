import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const errors = [];
const fail = (message) => errors.push(message);
const read = (file) => fs.readFileSync(file, 'utf8');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function relative(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

const overrideDir = path.join(root, 'override');
const mainJsPath = path.join(overrideDir, 'main.js');
const mainCssPath = path.join(overrideDir, 'main.css');
const bootstrapPath = path.join(root, '_js_dev', 'main.js');
const indexPath = path.join(root, 'index.html');
const contentNormalizerRef = 'features/content-normalizer/content-normalizer.js';
const manualScrollRestorationPath = path.join(overrideDir, 'mutations', 'scroll-restoration.js');

for (const required of [overrideDir, mainJsPath, mainCssPath, bootstrapPath, indexPath]) {
  if (!fs.existsSync(required)) fail(`Missing required path: ${relative(required)}`);
}

if (!errors.length) {
  const overrideJsFiles = walk(overrideDir).filter((file) => file.endsWith('.js'));
  const jsFiles = overrideJsFiles.concat(bootstrapPath);
  for (const file of jsFiles) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) {
      fail(`JavaScript syntax error in ${relative(file)}:\n${(result.stderr || result.stdout || '').trim()}`);
    }
  }

  const overrideJsSource = overrideJsFiles.map(read).join('\n');
  if (/\bscrollRestoration\b/.test(overrideJsSource)) {
    fail('Override code must leave browser scroll restoration native; scrollRestoration writes/references are not allowed');
  }
  if (/\._data\s*\(/.test(overrideJsSource)) {
    fail('Override code must not depend on jQuery private _data internals');
  }
  if (fs.existsSync(manualScrollRestorationPath)) {
    fail('override/mutations/scroll-restoration.js must not be reintroduced');
  }

  const mainJs = read(mainJsPath);
  if (!mainJs.includes("window.__scCatalogAssetVersion||'unversioned'")) {
    fail("override/main.js must use window.__scCatalogAssetVersion with the 'unversioned' source fallback");
  }

  const jsRefs = [];
  for (const match of mainJs.matchAll(/['"]([^'"]+\.js)['"]/g)) jsRefs.push(match[1]);
  const uniqueJsRefs = new Set(jsRefs);
  if (uniqueJsRefs.size !== jsRefs.length) {
    const seen = new Set();
    const duplicates = [...new Set(jsRefs.filter((item) => seen.has(item) || !seen.add(item)))];
    fail(`Duplicate JavaScript module paths in override/main.js: ${duplicates.join(', ')}`);
  }
  for (const ref of uniqueJsRefs) {
    const file = path.join(overrideDir, ref);
    if (!fs.existsSync(file)) fail(`Loader references missing JavaScript module: override/${ref}`);
  }
  if (!uniqueJsRefs.has(contentNormalizerRef)) {
    fail(`Required content normalizer is not loaded: override/${contentNormalizerRef}`);
  }

  const idRefs = [];
  for (const match of mainJs.matchAll(/\[\s*['"][^'"]+\.js['"]\s*,\s*['"]([^'"]+)['"]\s*\]/g)) idRefs.push(match[1]);
  for (const match of mainJs.matchAll(/loadScript\(\s*['"][^'"]+\.js['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g)) idRefs.push(match[1]);
  const seenIds = new Set();
  const duplicateIds = [...new Set(idRefs.filter((id) => seenIds.has(id) || !seenIds.add(id)))];
  if (duplicateIds.length) fail(`Duplicate script element ids in override/main.js: ${duplicateIds.join(', ')}`);

  const mainCss = read(mainCssPath);
  const cssRefs = [];
  for (const match of mainCss.matchAll(/@import\s+(?:url\()?['"]([^'"]+)['"]\)?\s*;/g)) cssRefs.push(match[1]);
  if (!cssRefs.length) fail('override/main.css does not contain any imports');

  const cssPaths = [];
  for (const ref of cssRefs) {
    const [assetPath, query = ''] = ref.split('?');
    cssPaths.push(assetPath);
    if (query !== 'v=unversioned') fail(`CSS import must use ?v=unversioned in source: ${ref}`);
    const file = path.resolve(path.dirname(mainCssPath), assetPath);
    if (!fs.existsSync(file)) {
      fail(`CSS manifest references missing file: ${assetPath}`);
      continue;
    }
    if (/@import\b/.test(read(file))) fail(`Nested CSS import found in ${relative(file)}; keep override/main.css flat`);
  }
  const seenCss = new Set();
  const duplicateCss = [...new Set(cssPaths.filter((item) => seenCss.has(item) || !seenCss.add(item)))];
  if (duplicateCss.length) fail(`Duplicate CSS imports in override/main.css: ${duplicateCss.join(', ')}`);

  const bootstrap = read(bootstrapPath);
  const bootstrapVersions = bootstrap.match(/var version='unversioned';/g) || [];
  if (bootstrapVersions.length !== 1) fail("_js_dev/main.js must contain exactly one var version='unversioned'; placeholder");

  const index = read(indexPath);
  const entrypoints = index.match(/_js_dev\/main\.js\?v=[^"']+/g) || [];
  if (entrypoints.length !== 1) fail('index.html must reference the _js_dev/main.js entrypoint exactly once');
}

if (errors.length) {
  console.error(`Override validation failed with ${errors.length} error(s):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const jsCount = walk(overrideDir).filter((file) => file.endsWith('.js')).length + 1;
const cssCount = [...read(mainCssPath).matchAll(/@import\s+(?:url\()?['"]([^'"]+)['"]/g)].length;
console.log(`Override validation passed: ${jsCount} JavaScript files checked, ${cssCount} CSS imports resolved.`);
