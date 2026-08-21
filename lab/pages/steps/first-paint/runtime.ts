import path from 'node:path';
import { SITE, assert, escapeRegExp, read, walk, write } from '../../lib/core.js';

const RUNTIME_SCRIPTS = [
  'js/jquery-2.1.0.min.js',
  '_pages/legacy.js',
  '_js_dev/main-legacy.js',
  'override/main.js',
  '_pages/shop.js',
] as const;

const INLINE_RUNTIME_MARKERS = [
  /function\s+isValidEmailAddress\s*\(\s*emailAddress\s*\)/,
  /keepSessionAlive\s*=\s*function\s*\(/,
] as const;

const SOURCE_MAP_COMMENT = /^\s*\/\/[#@]\s*sourceMappingURL=.*$/gm;
const SOURCE_MAP_BLOCK = /\/\*# sourceMappingURL=[\s\S]*?\*\//g;

function runtimeScriptPattern(relativePath: string, sha: string): RegExp {
  const version = relativePath.startsWith('js/jquery') ? '' : `\\?v=${escapeRegExp(sha)}`;
  return new RegExp(
    `<script\\b(?=[^>]*src=["']${escapeRegExp(relativePath)}${version}["'])[^>]*>\\s*<\\/script>\\s*`,
    'i',
  );
}

export function removeRuntime(html: string, sha: string): string {
  let result = html;
  for (const relativePath of RUNTIME_SCRIPTS) {
    const pattern = runtimeScriptPattern(relativePath, sha);
    const matches = result.match(new RegExp(pattern.source, 'gi')) ?? [];
    assert(matches.length === 1, `runtime tag mismatch: ${relativePath}=${matches.length}`);
    result = result.replace(pattern, '');
  }
  return result;
}

interface InlineScriptMatch {
  readonly index: number;
  readonly source: string;
  readonly body: string;
}

function inlineScripts(html: string): InlineScriptMatch[] {
  return [...html.matchAll(/<script(?<attrs>[^>]*)>(?<body>[\s\S]*?)<\/script>/gi)].flatMap((match) => {
    if (match.index === undefined) return [];
    return [{
      index: match.index,
      source: match[0],
      body: match.groups?.body ?? '',
    } satisfies InlineScriptMatch];
  });
}

function unwrapDomReady(body: string): string {
  const wrapper = /^\s*document\.addEventListener\('DOMContentLoaded',function\(\)\{\s*(?<inner>[\s\S]*?)\s*\},\{once:true\}\);\s*$/.exec(body);
  return wrapper?.groups?.inner ?? body;
}

function runtimeReadyScript(body: string): string {
  return `<script>window.addEventListener('sc:runtime-ready', () => {\n${body}\n}, { once: true });</script>`;
}

export function deferInlineRuntime(html: string): string {
  let result = html;
  for (const marker of INLINE_RUNTIME_MARKERS) {
    const match = inlineScripts(result).find((script) => marker.test(script.body));
    assert(match, `inline runtime marker missing: ${marker.source}`);
    const replacement = runtimeReadyScript(unwrapDomReady(match.body));
    result = result.slice(0, match.index) + replacement + result.slice(match.index + match.source.length);
  }
  return result;
}

function rewriteShopStartup(source: string): string {
  const startup = /\$\(function\(\)\s*\{\s*PS_initSearch\(\);\s*makeToolTips\(\);\s*shopCopyMobileNav\(\);\s*(?:if \(window\.moment\)\s*)?moment\.locale\('es'\);\s*shop_JSModales\(\);\s*shop_imgLiquids\(\);\s*shop_normalizeCols\(\);\s*dropdowntogglewOver\(\);\s*scrllAnim\(\);\s*JSgoMenu\(\);\s*JSgroupButtons\(\);\s*JSTopDropDown\(\);\s*\}\);/s;
  assert((source.match(new RegExp(startup.source, 'gs')) ?? []).length === 1, 'shop startup callback mismatch');

  const replacement = `$(function() {
\tshopCopyMobileNav();
\tif (window.moment) moment.locale('es');
\tconst jobs = [PS_initSearch, makeToolTips, shop_JSModales, dropdowntogglewOver, scrllAnim, JSgoMenu, JSgroupButtons, JSTopDropDown];
\tjobs.forEach((job, index) => setTimeout(job, index * 18));
});`;
  return source.replace(startup, replacement);
}

function removeFunction(source: string, name: string): string {
  const pattern = new RegExp(`\\nfunction ${name}\\(\\)\\s*\\{[\\s\\S]*?\\n\\}\\n`);
  assert((source.match(new RegExp(pattern.source, 'g')) ?? []).length === 1, `cannot remove ${name}`);
  return source.replace(pattern, '\n');
}

export function patchRuntime(): void {
  const shopFile = path.join(SITE, '_pages/shop.js');
  const legacyFile = path.join(SITE, '_pages/legacy.js');

  let shop = rewriteShopStartup(read(shopFile));
  for (const name of ['shop_imgLiquids', 'shop_normalizeCols']) shop = removeFunction(shop, name);
  write(shopFile, shop);

  let legacy = read(legacyFile);
  const normalize = /\/\*Knormalize_+\*\/\s*function Knormalize\(obj\)\s*\{[\s\S]*?\n\}\s*/;
  assert((legacy.match(new RegExp(normalize.source, 'g')) ?? []).length === 1, 'cannot remove Knormalize');
  legacy = legacy.replace(normalize, '');
  write(legacyFile, legacy);
}

function stripSourceMapComments(file: string): void {
  write(file, read(file).replace(SOURCE_MAP_COMMENT, '').replace(SOURCE_MAP_BLOCK, ''));
}

export function stripMaps(): void {
  const fixedFiles = [
    path.join(SITE, '_pages/legacy.js'),
    path.join(SITE, '_pages/shop.js'),
    path.join(SITE, '_js_dev/main-legacy.js'),
  ];
  const moduleFiles = walk(path.join(SITE, 'override')).filter((file) => file.endsWith('.js'));
  [...fixedFiles, ...moduleFiles].forEach(stripSourceMapComments);
}
