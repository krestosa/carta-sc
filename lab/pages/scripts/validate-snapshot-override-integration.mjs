import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const fail = (message) => errors.push(message);
const read = (file) => fs.readFileSync(file, 'utf8');
const overrideDir = path.join(root, 'override');
const bootstrapPath = path.join(root, '_js_dev', 'main.js');
const indexPath = path.join(root, 'index.html');

for (const required of [overrideDir, bootstrapPath, indexPath]) {
  if (!fs.existsSync(required)) fail(`Missing lab integration input: ${path.relative(root, required)}`);
}

if (!errors.length) {
  const bootstrap = read(bootstrapPath);
  const versions = bootstrap.match(/var version='unversioned';/g) || [];
  if (versions.length !== 1) fail("Snapshot _js_dev/main.js must contain exactly one var version='unversioned'; placeholder");

  const index = read(indexPath);
  const entrypoints = index.match(/_js_dev\/main\.js\?v=[^\"']+/g) || [];
  if (entrypoints.length !== 1) fail('Snapshot index.html must reference _js_dev/main.js exactly once');
  if (/data-sc-template=/.test(index)) fail('Snapshot index.html must not contain override component templates');

  const registryPath = path.join(overrideDir, 'templates', 'registry.js');
  const registry = read(registryPath);
  if (!registry.includes('var COMPILED_TEMPLATES=null;/*__SC_TEMPLATE_PAYLOAD__*/')) {
    fail('Pages lab requires the optional compiled-template injection slot in override/templates/registry.js');
  }
}

if (errors.length) {
  console.error(`Pages lab integration validation failed with ${errors.length} error(s):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Pages lab snapshot/override integration validation passed.');
