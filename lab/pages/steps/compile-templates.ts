import path from 'node:path';
import { SITE, assert, isDir, isFile, read, write } from '../lib/core.js';

const TEMPLATE_FILES = [
  'components/product-modal/product-modal.html','components/category-nav/category-nav.html','components/product-card/product-card.html','components/catalog-tools/catalog-tools.html'
] as const;
const REQUIRED = new Set(['product-modal','category-toolbar','category-arrow-left','category-arrow-right','category-indicator','product-card-a11y-meta','product-trait-group','catalog-tools']);

export function compileTemplates(): void {
  assert(isDir(SITE), '.pages-site does not exist');
  const registryPath = path.join(SITE, 'override', 'templates', 'registry.js');
  assert(isFile(registryPath), 'Template registry is missing from Pages staging');
  const payload: Record<string,string> = {};
  const pattern = /<template\b[^>]*\bdata-sc-template=["']([^"']+)["'][^>]*>([\s\S]*?)<\/template>/gi;
  for (const relative of TEMPLATE_FILES) {
    const sourcePath = path.join(SITE, 'override', relative);
    assert(isFile(sourcePath), `Missing override template source: ${relative}`);
    const source = read(sourcePath);
    const matches = [...source.matchAll(pattern)];
    assert(matches.length > 0, `No data-sc-template blocks found in ${relative}`);
    const remainder = source.replace(pattern, '').replace(/<!--[\s\S]*?-->/g, '').trim();
    assert(!remainder, `Unexpected non-template markup in ${relative}`);
    for (const match of matches) {
      const name = (match[1] ?? '').trim();
      const body = (match[2] ?? '').trim();
      assert(name && body, `Empty override template in ${relative}`);
      assert(!(name in payload), `Duplicate override template name: ${name}`);
      payload[name] = body;
    }
  }
  const names = new Set(Object.keys(payload));
  const missing = [...REQUIRED].filter((name) => !names.has(name));
  const extra = [...names].filter((name) => !REQUIRED.has(name));
  assert(!missing.length && !extra.length, `Override template manifest mismatch; missing=${missing.join(',')}, extra=${extra.join(',')}`);
  let registry = read(registryPath);
  const marker = /var COMPILED_TEMPLATES\s*=\s*null;\s*\/\*__SC_TEMPLATE_PAYLOAD__\*\//g;
  const markerMatches = [...registry.matchAll(marker)];
  assert(markerMatches.length === 1, 'Template registry compile marker must exist exactly once');
  const serialized = JSON.stringify(payload).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  registry = registry.replace(marker, `var COMPILED_TEMPLATES = ${serialized}; /*__SC_TEMPLATE_PAYLOAD__*/`);
  write(registryPath, registry);
  console.log(`Compiled ${Object.keys(payload).length} override templates.`);
}
