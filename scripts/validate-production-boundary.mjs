import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const overrideRoot = path.join(root, 'override');
const runtimeExtensions = new Set(['.js', '.css', '.html']);
const forbidden = [
  ['GitHub Pages host', /krestosa\.github\.io/i],
  ['Pages environment flag', /\bGITHUB_PAGES\b/],
  ['static Pages runtime branch', /\bSTATIC_PAGES\b/],
  ['Pages staging directory', /\.pages-site/],
  ['Pages runtime marker', /\bsc-pages-/],
  ['critical-media lab path', /_critical-media\//],
  ['first-viewport lab path', /_first-viewport\//],
  ['chrome-media lab path', /_chrome-media\//],
  ['desktop lab source marker', /data-sc-desktop-src/],
  ['first-viewport lab marker', /data-sc-first-viewport/],
  ['static lab shell marker', /data-sc-static-shell/],
  ['lab prepaint state', /\bsc-catalog-prepaint\b/],
  ['lab banner-ready state', /\bsc-banner-media-ready\b/],
  ['lab mobile-logo-ready state', /\bsc-mobile-logo-ready\b/],
  ['lab directory dependency', /(?:^|["'`(\s])lab\/pages\//],
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

if (!fs.existsSync(overrideRoot)) {
  console.error('Production boundary validation failed: override/ is missing');
  process.exit(1);
}

const errors = [];
for (const labOnlyPath of [
  path.join(overrideRoot, 'core', 'prepaint.css'),
  path.join(overrideRoot, 'core', 'performance.css'),
]) {
  if (fs.existsSync(labOnlyPath)) {
    errors.push(`${path.relative(root, labOnlyPath).replaceAll(path.sep, '/')} is lab-only and must stay under lab/pages/assets/`);
  }
}

for (const file of walk(overrideRoot)) {
  if (!runtimeExtensions.has(path.extname(file))) continue;
  const source = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file).replaceAll(path.sep, '/');
  for (const [label, pattern] of forbidden) {
    if (pattern.test(source)) errors.push(`${rel}: contains ${label}`);
  }
}

if (errors.length) {
  console.error(`Production/lab boundary validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Production/lab boundary validation passed: override/ has no Pages-lab runtime dependencies.');
