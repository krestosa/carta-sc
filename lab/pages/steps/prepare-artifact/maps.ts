import path from 'node:path';
import { SITE, assert, read, walk } from '../../lib/core.js';

const MAP_HELPERS = new Set([
  path.resolve(SITE, '_js_dev/mapKrc.js'),
  path.resolve(SITE, 'js/main_shop_maps__q_9fc895e1.js'),
]);

const MAP_USAGE = /\b(?:shop_init_mapear|shop_krc_geoCode|shop_krc_mapear|krc_geoCode|krc_mapear)\s*\(/i;
const MAP_MARKUP = /(?:\bid=["'][^"']*map[^"']*["']|\bclass=["'][^"']*\bmapParent\b[^"']*["'])/i;

const REMOVABLE_MAP_SCRIPTS = [
  /<script\b[^>]*\bsrc=["']https:\/\/maps\.googleapis\.com\/maps\/api\/js\?[^"']*["'][^>]*><\/script>/i,
  /<script\b[^>]*\bsrc=["']_js_dev\/mapKrc\.js["'][^>]*><\/script>/i,
  /<script\b[^>]*\bsrc=["']js\/main_shop_maps__q_9fc895e1\.js["'][^>]*><\/script>/i,
] as const;

function assertMapHelpersUnused(): void {
  for (const file of walk(SITE).filter((item) => item.endsWith('.js'))) {
    if (MAP_HELPERS.has(path.resolve(file))) continue;
    if (MAP_USAGE.test(read(file))) {
      throw new Error(`Map helper usage detected in ${file}; refusing to remove Google Maps`);
    }
  }
}

export function pruneUnusedMaps(html: string): string {
  assert(!MAP_MARKUP.test(html), 'Map markup detected; refusing to remove Google Maps from Pages');
  assertMapHelpersUnused();

  let result = html;
  for (const pattern of REMOVABLE_MAP_SCRIPTS) {
    const matches = result.match(new RegExp(pattern.source, 'gi')) ?? [];
    assert(matches.length === 1, `Expected exactly one removable map script for pattern: ${pattern.source}`);
    result = result.replace(pattern, '');
  }
  return result;
}
