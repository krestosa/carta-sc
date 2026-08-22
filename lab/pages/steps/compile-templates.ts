import path from 'node:path';
import { SITE, assert, isDir, isFile, read, write } from '../lib/core.js';

const TEMPLATE_FILES = [
  'components/product-modal/product-modal.html',
  'components/category-nav/category-nav.html',
  'components/product-card/product-card.html',
  'components/catalog-tools/catalog-tools.html',
] as const;

const REQUIRED_TEMPLATES = new Set([
  'product-modal',
  'category-toolbar',
  'category-arrow-left',
  'category-arrow-right',
  'category-indicator',
  'product-card-a11y-meta',
  'product-trait-group',
  'catalog-tools',
]);

const TEMPLATE_PATTERN = /<template\b[^>]*\bdata-sc-template=["']([^"']+)["'][^>]*>([\s\S]*?)<\/template>/gi;
const COMPILED_SLOT = /const COMPILED_TEMPLATES\s*=\s*null;\s*\/\*__SC_TEMPLATE_PAYLOAD__\*\//g;

function collectTemplates(): Record<string, string> {
  const payload: Record<string, string> = {};

  for (const relative of TEMPLATE_FILES) {
    const sourcePath = path.join(SITE, 'override', relative);
    assert(isFile(sourcePath), `Missing override template source: ${relative}`);
    const source = read(sourcePath);
    const matches = [...source.matchAll(TEMPLATE_PATTERN)];
    assert(matches.length > 0, `No data-sc-template blocks found in ${relative}`);

    const remainder = source.replace(TEMPLATE_PATTERN, '').replace(/<!--[\s\S]*?-->/g, '').trim();
    assert(!remainder, `Unexpected non-template markup in ${relative}`);

    for (const match of matches) {
      const name = (match[1] ?? '').trim();
      const body = (match[2] ?? '').trim();
      assert(name && body, `Empty override template in ${relative}`);
      assert(!(name in payload), `Duplicate override template name: ${name}`);
      payload[name] = body;
    }
  }

  return payload;
}

function validateManifest(payload: Record<string, string>): void {
  const names = new Set(Object.keys(payload));
  const missing = [...REQUIRED_TEMPLATES].filter((name) => !names.has(name));
  const extra = [...names].filter((name) => !REQUIRED_TEMPLATES.has(name));
  assert(
    missing.length === 0 && extra.length === 0,
    `Override template manifest mismatch; missing=${missing.join(',')}, extra=${extra.join(',')}`,
  );
}

export function compileTemplates(): void {
  assert(isDir(SITE), '.pages-site does not exist');
  const registryPath = path.join(SITE, 'override', 'templates', 'registry.js');
  assert(isFile(registryPath), 'Template registry is missing from Pages staging');

  const payload = collectTemplates();
  validateManifest(payload);

  let registry = read(registryPath);
  const markerMatches = [...registry.matchAll(COMPILED_SLOT)];
  assert(markerMatches.length === 1, 'Template registry compile marker must exist exactly once');

  const serialized = JSON.stringify(payload).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  registry = registry.replace(
    COMPILED_SLOT,
    `const COMPILED_TEMPLATES = ${serialized}; /*__SC_TEMPLATE_PAYLOAD__*/`,
  );
  write(registryPath, registry);
  console.log(`Compiled ${Object.keys(payload).length} override templates.`);
}
