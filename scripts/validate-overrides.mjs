import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const overrideDir = path.join(root, 'override');
const mainJsPath = path.join(overrideDir, 'main.js');
const mainCssPath = path.join(overrideDir, 'main.css');
const templateRegistryPath = path.join(overrideDir, 'templates', 'registry.js');
const errors = [];
const fail = (message) => errors.push(message);
const read = (file) => fs.readFileSync(file, 'utf8');
const rel = (file) => path.relative(root, file).replaceAll(path.sep, '/');
const relOverride = (file) => path.relative(overrideDir, file).replaceAll(path.sep, '/');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

for (const required of [overrideDir, mainJsPath, mainCssPath, templateRegistryPath]) {
  if (!fs.existsSync(required)) fail(`Missing required production frontend path: ${rel(required)}`);
}

if (!errors.length) {
  const files = walk(overrideDir);
  const jsFiles = files.filter((file) => file.endsWith('.js'));
  const cssFiles = files.filter((file) => file.endsWith('.css'));
  const htmlFiles = files.filter((file) => file.endsWith('.html'));

  for (const file of jsFiles) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) fail(`JavaScript syntax error in ${rel(file)}: ${(result.stderr || result.stdout || '').trim()}`);
  }

  const jsSource = jsFiles.map(read).join('\n');
  if (/\bscrollRestoration\b/.test(jsSource)) fail('Override must leave browser scroll restoration native');
  if (/\._data\s*\(/.test(jsSource)) fail('Override must not depend on private jQuery _data internals');
  if (/\bdocument\.currentScript\b/.test(jsSource)) fail('Override modules must not depend on document.currentScript');
  if (/\bimport\.meta\b/.test(jsSource)) fail('Override modules must remain compatible with the current classic-script runtime');
  if (fs.existsSync(path.join(overrideDir, 'mutations', 'scroll-restoration.js'))) fail('Manual scroll-restoration mutation must not be reintroduced');

  /* Responsive catalogue invariant: there are exactly two user-selectable
     layouts everywhere. Desktop owns the structural contract; smaller
     breakpoints may only adapt responsive values. */
  const viewModulePath = path.join(overrideDir, 'components', 'catalog-tools', 'view.js');
  const viewStabilityPath = path.join(overrideDir, 'components', 'catalog-tools', 'view-stability.css');
  const pricingPath = path.join(overrideDir, 'components', 'product-card', 'pricing.css');
  const cardLayoutPath = path.join(overrideDir, 'components', 'product-card', 'layout.css');
  const imageRatioPath = path.join(overrideDir, 'components', 'product-card', 'image-ratio.css');
  const viewModule = read(viewModulePath);
  const mainSource = read(mainJsPath);
  const viewStability = read(viewStabilityPath);
  if (!viewModule.includes("MODES=['compact','list']")) fail('Catalog view toggle must expose only density and list');
  if (/MODES=\[[^\]]*normal/.test(viewModule)) fail('Low-density normal view must not be reintroduced');
  if (!mainSource.includes("VIEW_MODES=['compact','list']")) fail('Catalog bootstrap must expose only density and list');
  if (!viewStability.includes('--sc-view-list-image-width: 210px')) fail('Desktop list geometry must be the canonical base contract');
  if (!viewStability.includes('grid-template-columns: var(--sc-view-list-image-width) minmax(0, 1fr) !important')) fail('List cards must use the shared two-column anatomy');
  if (/--sc-view-list-desktop-image-width/.test(viewStability)) fail('List geometry must not fork into a desktop-only implementation');
  for (const file of [pricingPath, cardLayoutPath, imageRatioPath]) {
    if (/@media\s*\(min-width\s*:\s*993px\)/.test(read(file))) fail(`${rel(file)} must inherit its structural rules from the shared desktop-first contract`);
  }

  const structuralUiFiles = [
    'components/product-modal/view.js',
    'components/category-nav/layout.js',
    'components/category-nav/rail-controls.js',
    'components/category-nav/indicator.js',
    'components/product-card/data.js',
    'components/product-card/a11y.js',
    'components/catalog-tools/catalog-tools.js',
  ];
  for (const ref of structuralUiFiles) {
    const file = path.join(overrideDir, ref);
    if (!fs.existsSync(file)) { fail(`Missing structural UI module: override/${ref}`); continue; }
    const source = read(file);
    if (/document\.createElement\s*\(/.test(source) || /\.innerHTML\s*=/.test(source)) {
      fail(`Fixed UI markup must come from override HTML templates, not ${rel(file)}`);
    }
  }

  const guardOwners = new Map();
  for (const file of jsFiles) {
    const guards = new Set([...read(file).matchAll(/(?:window|SC)\.(__[A-Za-z0-9_$]*Booted)\b/g)].map((match) => match[1]));
    for (const guard of guards) guardOwners.set(guard, [...(guardOwners.get(guard) || []), rel(file)]);
  }
  for (const [guard, owners] of guardOwners) if (owners.length > 1) fail(`Duplicate override boot guard ${guard}: ${owners.join(', ')}`);

  const mainJs = read(mainJsPath);
  if (!mainJs.includes("window.__scCatalogAssetVersion||'unversioned'")) fail("override/main.js must keep the generic asset-version fallback");
  const jsRefs = [...mainJs.matchAll(/['"]([^'"]+\.js)['"]/g)].map((match) => match[1]);
  const uniqueJs = new Set(jsRefs);
  if (uniqueJs.size !== jsRefs.length) fail('Duplicate JavaScript module paths in override/main.js');
  for (const ref of uniqueJs) if (!fs.existsSync(path.join(overrideDir, ref))) fail(`Loader references missing JavaScript module: override/${ref}`);
  for (const required of ['features/content-normalizer/content-normalizer.js', 'templates/registry.js']) {
    if (!uniqueJs.has(required)) fail(`Required override module is not loaded: override/${required}`);
  }
  const unreferencedJs = jsFiles.filter((file) => file !== mainJsPath).map(relOverride).filter((ref) => !uniqueJs.has(ref));
  if (unreferencedJs.length) fail(`Unreferenced override JavaScript files: ${unreferencedJs.join(', ')}`);

  const ids = [];
  for (const match of mainJs.matchAll(/\[\s*['"][^'"]+\.js['"]\s*,\s*['"]([^'"]+)['"]\s*\]/g)) ids.push(match[1]);
  for (const match of mainJs.matchAll(/loadScript\(\s*['"][^'"]+\.js['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g)) ids.push(match[1]);
  if (new Set(ids).size !== ids.length) fail('Duplicate script element ids in override/main.js');
  for (const file of jsFiles) {
    if (file === mainJsPath) continue;
    const coupled = ids.filter((id) => read(file).includes(id));
    if (coupled.length) fail(`${rel(file)} depends on loader script id(s): ${coupled.join(', ')}`);
  }

  const registry = read(templateRegistryPath);
  const templateRefs = [...registry.matchAll(/['"]([^'"]+\.html)['"]/g)].map((match) => match[1]);
  if (!templateRefs.length) fail('override/templates/registry.js does not declare HTML template sources');
  if (new Set(templateRefs).size !== templateRefs.length) fail('Duplicate HTML template source paths in registry.js');
  for (const ref of templateRefs) if (!fs.existsSync(path.join(overrideDir, ref))) fail(`Template registry references missing source: override/${ref}`);
  const unreferencedHtml = htmlFiles.map(relOverride).filter((ref) => !new Set(templateRefs).has(ref));
  if (unreferencedHtml.length) fail(`Unreferenced override HTML templates: ${unreferencedHtml.join(', ')}`);

  const requiredTemplateNames = new Set(['product-modal','category-toolbar','category-arrow-left','category-arrow-right','category-indicator','product-card-a11y-meta','product-trait-group','catalog-tools']);
  const owners = new Map();
  for (const file of htmlFiles) {
    const names = [...read(file).matchAll(/<template\b[^>]*\bdata-sc-template=['"]([^'"]+)['"][^>]*>/gi)].map((match) => match[1].trim());
    if (!names.length) fail(`No data-sc-template blocks found in ${rel(file)}`);
    for (const name of names) owners.set(name, [...(owners.get(name) || []), rel(file)]);
  }
  for (const [name, paths] of owners) if (paths.length > 1) fail(`Duplicate override template ${name}: ${paths.join(', ')}`);
  const actualNames = new Set(owners.keys());
  const missingNames = [...requiredTemplateNames].filter((name) => !actualNames.has(name));
  const extraNames = [...actualNames].filter((name) => !requiredTemplateNames.has(name));
  if (missingNames.length || extraNames.length) fail(`Override template manifest mismatch; missing=${missingNames.join(', ') || 'none'}, extra=${extraNames.join(', ') || 'none'}`);

  const cssRefs = [...read(mainCssPath).matchAll(/@import\s+(?:url\()?['"]([^'"]+)['"]\)?\s*;/g)].map((match) => match[1]);
  if (!cssRefs.length) fail('override/main.css does not contain imports');
  const cssPaths = [];
  for (const ref of cssRefs) {
    const [assetPath, query = ''] = ref.split('?');
    const normalized = path.posix.normalize(assetPath.replace(/^\.\//, ''));
    cssPaths.push(normalized);
    if (query !== 'v=unversioned') fail(`CSS import must use ?v=unversioned in source: ${ref}`);
    const file = path.resolve(path.dirname(mainCssPath), assetPath);
    if (!fs.existsSync(file)) { fail(`CSS manifest references missing file: ${assetPath}`); continue; }
    if (/@import\b/.test(read(file))) fail(`Nested CSS import found in ${rel(file)}`);
  }
  if (new Set(cssPaths).size !== cssPaths.length) fail('Duplicate CSS imports in override/main.css');
  const referencedCss = new Set(cssPaths);
  const unreferencedCss = cssFiles.filter((file) => file !== mainCssPath).map(relOverride).filter((ref) => !referencedCss.has(ref));
  if (unreferencedCss.length) fail(`Unreferenced override CSS files: ${unreferencedCss.join(', ')}`);
}

if (errors.length) {
  console.error(`Override validation failed with ${errors.length} error(s):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const files = walk(overrideDir);
console.log(`Override validation passed: ${files.filter((f) => f.endsWith('.js')).length} JS, ${files.filter((f) => f.endsWith('.html')).length} HTML templates and ${[...read(mainCssPath).matchAll(/@import\s+(?:url\()?['"]([^'"]+)['"]/g)].length} CSS imports checked without snapshot dependencies.`);
