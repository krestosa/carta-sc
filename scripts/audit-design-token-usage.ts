import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

interface Finding {
  readonly category: string;
  readonly file: string;
  readonly line: number;
  readonly value: string;
}
interface TokenNode { readonly $type?: unknown; readonly $value?: unknown; readonly [key: string]: unknown }
interface FlatToken { readonly path: string; readonly type: string; readonly value: unknown }
interface VariableSite { readonly name: string; readonly file: string; readonly line: number; readonly owner: string }

const DTCG_TYPES = new Set([
  'color', 'dimension', 'fontFamily', 'fontWeight', 'duration', 'cubicBezier', 'number',
  'strokeStyle', 'border', 'transition', 'shadow', 'gradient', 'typography',
]);
const GENERATED = new Set(['override/core/tokens.generated.css', 'override/core/tokens.generated.ts']);
const SCAN_EXCLUDED = new Set(['scripts/audit-design-token-usage.ts', 'scripts/build-design-tokens.ts', ...GENERATED]);
const LEGACY_REFERENCES: ReadonlyArray<readonly [string, RegExp]> = [
  ['direct-token-css-api', /--sc-token-[\w-]+/g],
  ['legacy-token-runtime', /\btokenRuntime\b/g],
  ['legacy-token-types', /\btokenTypes\b/g],
  ['legacy-token-motion', /\b(?:tokenMotion|motionTokens)\b/g],
  ['legacy-component-token-path', /\bcomponent\.(?:color|dimension|number|duration|shadow)\.[A-Za-z0-9_.]+/g],
  ['legacy-z-alias', /--sc-z-(?:raised|theme-popover|modal)\b/g],
  ['legacy-radius-alias', /--sc-radius-(?:control|round)\b/g],
  ['legacy-effect-alias', /--sc-(?:overlay-modal|shadow-modal|shadow-submenu|gradient-sticky-shadow-stops)\b/g],
  ['legacy-opacity-alias', /--sc-opacity-(?:trait-icon|placeholder|sticky-desktop|sticky-mobile)\b/g],
  ['legacy-scale-alias', /--sc-scale-(?:pressed|submenu-pressed)\b/g],
  ['legacy-layout-alias', /--sc-(?:catalog-gutter|product-image-ratio)\b/g],
  ['legacy-variables-css', /(?:core\/variables\.css|variables\.css\?v=)/g],
];
const GLOBAL_COLOR_LITERALS = /(?:#(?:000000|0a0a0a|303030|5f5f5f|767676|989898|f5f5f5|fbfbfa|e3e3de|d1d1cb|ffffff|f3f3f0|c8c8c2|9c9c95|6f6f6f|121210|2d2d29|44443e)\b|rgb\(\s*(?:0\s+0\s+0|10\s+10\s+10|48\s+48\s+48|95\s+95\s+95|118\s+118\s+118|152\s+152\s+152|245\s+245\s+245|251\s+251\s+250|227\s+227\s+222|209\s+209\s+203|255\s+255\s+255|243\s+243\s+240|200\s+200\s+194|156\s+156\s+149|111\s+111\s+111|18\s+18\s+16|45\s+45\s+41|68\s+68\s+62)\s*\))/gi;
const GLOBAL_EASING_LITERALS = /(?:cubic-bezier\(\s*0\.2\s*,\s*0\s*,\s*0\s*,\s*1\s*\)|cubic-bezier\(\s*0\.3\s*,\s*0\s*,\s*1\s*,\s*1\s*\)|\[\s*0\.2\s*,\s*0\s*,\s*0\s*,\s*1\s*\]|\[\s*0\.3\s*,\s*0\s*,\s*1\s*,\s*1\s*\])/gi;
const GLOBAL_SHADOW_LITERALS = /0\s+12px\s+28px\s+(?:0\s+)?rgb\(0\s+0\s+0\s*\/\s*\.?0?(?:8|9)\)|0\s+18px\s+55px\s+(?:0\s+)?rgb\(0\s+0\s+0\s*\/\s*\.?0?22\)/gi;

const root = process.cwd();
const strict = process.argv.includes('--strict');
const findings: Finding[] = [];
const flatTokens = new Map<string, FlatToken>();
const tokenDependencies = new Map<string, Set<string>>();
const localDefinitions: VariableSite[] = [];
const localUsages: VariableSite[] = [];

function add(category: string, file: string, line: number, value: string): void {
  findings.push({ category, file, line, value: value.trim().replace(/\s+/g, ' ') });
}
function lineOf(source: string, index: number): number { return source.slice(0, index).split('\n').length; }
async function exists(path: string): Promise<boolean> { try { await stat(path); return true; } catch { return false; } }
async function walk(directory: string): Promise<string[]> {
  if (!(await exists(directory))) return [];
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  }))).flat();
}
function ownerFor(file: string): string {
  const component = /^override\/components\/([^/]+)/.exec(file)?.[1];
  if (component) return `component:${component}`;
  const feature = /^override\/features\/([^/]+)/.exec(file)?.[1];
  if (feature) return `feature:${feature}`;
  if (file.startsWith('override/motion/')) return 'motion';
  if (file.startsWith('override/core/')) return 'core';
  if (file.startsWith('override/templates/')) return 'templates';
  if (file.startsWith('override/')) return 'override-root';
  return 'tooling';
}
function collectAliasReferences(value: unknown, output = new Set<string>()): Set<string> {
  if (typeof value === 'string') {
    const match = /^\{([^}]+)\}$/.exec(value);
    if (match?.[1]) output.add(match[1]);
    return output;
  }
  if (Array.isArray(value)) for (const item of value) collectAliasReferences(item, output);
  else if (value && typeof value === 'object') for (const item of Object.values(value)) collectAliasReferences(item, output);
  return output;
}
function flattenTokens(node: unknown, path: string[], inheritedType?: string): void {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return;
  const object = node as TokenNode;
  let type = inheritedType;
  if (typeof object.$type === 'string') {
    type = object.$type;
    if (!DTCG_TYPES.has(type)) add('unsupported-token-type', 'tokens/design.tokens.json', 1, `${path.join('.') || '<root>'}: ${type}`);
  }
  if ('$value' in object) {
    const tokenPath = path.join('.');
    if (!type) add('missing-token-type', 'tokens/design.tokens.json', 1, tokenPath);
    flatTokens.set(tokenPath, { path: tokenPath, type: type ?? '', value: object.$value });
    tokenDependencies.set(tokenPath, collectAliasReferences(object.$value));
    return;
  }
  for (const [key, value] of Object.entries(object)) if (!key.startsWith('$')) flattenTokens(value, [...path, key], type);
}

const tokenDir = resolve(root, 'tokens');
const tokenFiles = (await readdir(tokenDir)).filter((name) => name.endsWith('.tokens.json')).sort();
if (tokenFiles.length !== 1 || tokenFiles[0] !== 'design.tokens.json') {
  add('token-source', 'tokens', 1, `expected only design.tokens.json; found ${tokenFiles.join(', ') || 'none'}`);
}
if (await exists(resolve(tokenDir, 'component.tokens.json'))) add('legacy-token-source', 'tokens/component.tokens.json', 1, 'obsolete component token source');
if (await exists(resolve(root, 'override/core/variables.css'))) add('legacy-file', 'override/core/variables.css', 1, 'obsolete global variables layer');

const tokenDocument = JSON.parse(await readFile(resolve(tokenDir, 'design.tokens.json'), 'utf8')) as Record<string, unknown>;
const topLevelGroups = Object.keys(tokenDocument).filter((key) => !key.startsWith('$'));
if (topLevelGroups.length !== 2 || !topLevelGroups.includes('reference') || !topLevelGroups.includes('system')) {
  add('token-layering', 'tokens/design.tokens.json', 1, `expected reference + system; found ${topLevelGroups.join(', ')}`);
}
flattenTokens(tokenDocument, []);

for (const [path, dependencies] of tokenDependencies) {
  for (const dependency of dependencies) {
    if (!flatTokens.has(dependency)) add('broken-token-alias', 'tokens/design.tokens.json', 1, `${path} -> ${dependency}`);
    if (path.startsWith('reference.') && dependency.startsWith('system.')) {
      add('inverted-token-dependency', 'tokens/design.tokens.json', 1, `${path} -> ${dependency}`);
    }
  }
}

const referenced = new Set<string>();
for (const dependencies of tokenDependencies.values()) for (const dependency of dependencies) referenced.add(dependency);
for (const path of flatTokens.keys()) {
  if (path.startsWith('reference.') && !referenced.has(path)) add('unused-reference-token', 'tokens/design.tokens.json', 1, path);
}

const sourceFiles = (await Promise.all([
  walk(resolve(root, 'override')),
  walk(resolve(root, 'scripts')),
])).flat().filter((path) => ['.css', '.ts'].includes(extname(path)));

for (const absolute of sourceFiles) {
  const file = relative(root, absolute).replace(/\\/g, '/');
  const source = await readFile(absolute, 'utf8');
  if (!SCAN_EXCLUDED.has(file)) {
    for (const [category, pattern] of LEGACY_REFERENCES) {
      pattern.lastIndex = 0;
      for (const match of source.matchAll(pattern)) add(category, file, lineOf(source, match.index ?? 0), match[0] ?? '');
    }
    GLOBAL_COLOR_LITERALS.lastIndex = 0;
    for (const match of source.matchAll(GLOBAL_COLOR_LITERALS)) add('duplicated-global-color', file, lineOf(source, match.index ?? 0), match[0] ?? '');
    GLOBAL_EASING_LITERALS.lastIndex = 0;
    for (const match of source.matchAll(GLOBAL_EASING_LITERALS)) add('duplicated-global-easing', file, lineOf(source, match.index ?? 0), match[0] ?? '');
    GLOBAL_SHADOW_LITERALS.lastIndex = 0;
    for (const match of source.matchAll(GLOBAL_SHADOW_LITERALS)) add('duplicated-global-elevation', file, lineOf(source, match.index ?? 0), match[0] ?? '');
  }

  if (!file.startsWith('override/') || GENERATED.has(file)) continue;
  const owner = ownerFor(file);
  if (extname(file) === '.css') {
    for (const match of source.matchAll(/(--sc-[\w-]+)\s*:/g)) {
      localDefinitions.push({ name: match[1] ?? '', file, line: lineOf(source, match.index ?? 0), owner });
    }
    for (const match of source.matchAll(/var\(\s*(--sc-[\w-]+)/g)) {
      localUsages.push({ name: match[1] ?? '', file, line: lineOf(source, match.index ?? 0), owner });
    }
  } else {
    for (const match of source.matchAll(/\.style\.setProperty\(\s*['"](--sc-[\w-]+)['"]/g)) {
      localDefinitions.push({ name: match[1] ?? '', file, line: lineOf(source, match.index ?? 0), owner });
    }
    for (const match of source.matchAll(/(?:getPropertyValue|removeProperty)\(\s*['"](--sc-[\w-]+)['"]/g)) {
      localUsages.push({ name: match[1] ?? '', file, line: lineOf(source, match.index ?? 0), owner });
    }
    for (const match of source.matchAll(/\bconst\s+[A-Z][A-Z0-9_]*\s*=\s*['"](--sc-[\w-]+)['"]/g)) {
      localUsages.push({ name: match[1] ?? '', file, line: lineOf(source, match.index ?? 0), owner });
    }
  }
}

const generatedCss = await readFile(resolve(root, 'override/core/tokens.generated.css'), 'utf8');
const globalVariables = new Set<string>();
for (const match of generatedCss.matchAll(/(--sc-[\w-]+)\s*:/g)) globalVariables.add(match[1] ?? '');
for (const variable of globalVariables) if (variable.startsWith('--sc-token-')) add('generated-legacy-api', 'override/core/tokens.generated.css', 1, variable);

const definitionMap = new Map<string, VariableSite[]>();
const usageMap = new Map<string, VariableSite[]>();
for (const site of localDefinitions) definitionMap.set(site.name, [...(definitionMap.get(site.name) ?? []), site]);
for (const site of localUsages) usageMap.set(site.name, [...(usageMap.get(site.name) ?? []), site]);

for (const [name, usages] of usageMap) {
  if (globalVariables.has(name)) continue;
  const definitions = definitionMap.get(name) ?? [];
  if (!definitions.length) {
    for (const usage of usages) add('orphan-css-variable', usage.file, usage.line, name);
    continue;
  }
  const owners = new Set(definitions.map((site) => site.owner));
  if (owners.size > 1) add('cross-owner-variable-definition', definitions[0]?.file ?? 'override', definitions[0]?.line ?? 1, `${name}: ${[...owners].join(', ')}`);
  for (const usage of usages) if (!owners.has(usage.owner)) add('cross-owner-variable-use', usage.file, usage.line, `${name}: owned by ${[...owners].join(', ')}, used by ${usage.owner}`);
}
for (const [name, definitions] of definitionMap) {
  if (globalVariables.has(name) || (usageMap.get(name)?.length ?? 0) > 0) continue;
  for (const definition of definitions) add('unused-css-variable', definition.file, definition.line, name);
}

const counts = new Map<string, number>();
for (const finding of findings) counts.set(finding.category, (counts.get(finding.category) ?? 0) + 1);
console.log(`[design-token-audit] ${flatTokens.size} tokens; ${globalVariables.size} generated CSS variables; ${findings.length} findings`);
for (const [category, count] of [...counts.entries()].sort(([a], [b]) => a.localeCompare(b))) console.log(`  ${category}: ${count}`);
for (const finding of findings.slice(0, 160)) console.log(`  ${finding.category} ${finding.file}:${finding.line} ${finding.value}`);
if (findings.length > 160) console.log(`  ... ${findings.length - 160} more`);
if (strict && findings.length) process.exitCode = 1;
