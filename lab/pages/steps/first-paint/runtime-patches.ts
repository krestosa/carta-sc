import path from 'node:path';
import { SITE, assert, read, walk, write } from '../../lib/core.js';

const SOURCE_MAP_COMMENT = /^\s*\/\/[#@]\s*sourceMappingURL=.*$/gm;
const SOURCE_MAP_BLOCK = /\/\*# sourceMappingURL=[\s\S]*?\*\//g;

const SHOP_STARTUP = /\$\(function\(\)\s*\{\s*PS_initSearch\(\);\s*makeToolTips\(\);\s*shopCopyMobileNav\(\);\s*(?:if \(window\.moment\)\s*)?moment\.locale\('es'\);\s*shop_JSModales\(\);\s*shop_imgLiquids\(\);\s*shop_normalizeCols\(\);\s*dropdowntogglewOver\(\);\s*scrllAnim\(\);\s*JSgoMenu\(\);\s*JSgroupButtons\(\);\s*JSTopDropDown\(\);\s*\}\);/s;

const SHOP_STARTUP_REPLACEMENT = `$(function() {
\tshopCopyMobileNav();
\tif (window.moment) moment.locale('es');
\tconst jobs = [PS_initSearch, makeToolTips, shop_JSModales, dropdowntogglewOver, scrllAnim, JSgoMenu, JSgroupButtons, JSTopDropDown];
\tjobs.forEach((job, index) => setTimeout(job, index * 18));
});`;

function rewriteShopStartup(source: string): string {
  assert(
    (source.match(new RegExp(SHOP_STARTUP.source, 'gs')) ?? []).length === 1,
    'shop startup callback mismatch',
  );
  return source.replace(SHOP_STARTUP, SHOP_STARTUP_REPLACEMENT);
}

function removeFunction(source: string, name: string): string {
  const pattern = new RegExp(`\\nfunction ${name}\\(\\)\\s*\\{[\\s\\S]*?\\n\\}\\n`);
  assert((source.match(new RegExp(pattern.source, 'g')) ?? []).length === 1, `cannot remove ${name}`);
  return source.replace(pattern, '\n');
}

function patchShopRuntime(): void {
  const file = path.join(SITE, '_pages/shop.js');
  let source = rewriteShopStartup(read(file));
  for (const name of ['shop_imgLiquids', 'shop_normalizeCols']) source = removeFunction(source, name);
  write(file, source);
}

function patchLegacyFile(): void {
  const file = path.join(SITE, '_pages/legacy.js');
  const normalize = /\/\*Knormalize_+\*\/\s*function Knormalize\(obj\)\s*\{[\s\S]*?\n\}\s*/;
  const source = read(file);
  assert((source.match(new RegExp(normalize.source, 'g')) ?? []).length === 1, 'cannot remove Knormalize');
  write(file, source.replace(normalize, ''));
}

function stripSourceMapComments(file: string): void {
  write(file, read(file).replace(SOURCE_MAP_COMMENT, '').replace(SOURCE_MAP_BLOCK, ''));
}

export function patchLegacyRuntime(): void {
  patchShopRuntime();
  patchLegacyFile();
}

export function stripRuntimeSourceMaps(): void {
  const fixedFiles = [
    path.join(SITE, '_pages/legacy.js'),
    path.join(SITE, '_pages/shop.js'),
    path.join(SITE, '_js_dev/main-legacy.js'),
  ];
  const moduleFiles = walk(path.join(SITE, 'override')).filter((file) => file.endsWith('.js'));
  [...fixedFiles, ...moduleFiles].forEach(stripSourceMapComments);
}
