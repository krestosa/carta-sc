import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

interface Finding {
  readonly category: string;
  readonly file: string;
  readonly line: number;
  readonly value: string;
}

interface TokenNode {
  readonly $type?: unknown;
  readonly $value?: unknown;
  readonly [key: string]: unknown;
}

interface FlatToken {
  readonly path: string;
  readonly type: string;
  readonly value: unknown;
}

interface VariableSite {
  readonly name: string;
  readonly file: string;
  readonly line: number;
  readonly owner: string;
}

const DTCG_TYPES = new Set([
  'color', 'dimension', 'fontFamily', 'fontWeight', 'duration', 'cubicBezier', 'number',
  'strokeStyle', 'border', 'transition', 'shadow', 'gradient', 'typography',
]);

const PROJECT_TOKEN_ROOTS = new Set([
  'color', 'dimension', 'fontFamily', 'fontWeight', 'number', 'typography', 'border',
]);

const TYPES_OWNED_BY_TYPESCRIPT = new Set(['duration', 'cubicBezier', 'transition']);

const COMPONENT_TOKEN_TERMS =
  /(?:^|\.)(?:component|modal|submenu|search|filter|preloader|card|button|sticky|catalog|product|spring)(?:\.|$)/i;

const GENERATED = new Set([
  'override/core/tokens.generated.css',
  'override/core/tokens.generated.ts',
]);

const SCAN_EXCLUDED = new Set([
  'scripts/audit-design-token-usage.ts',
  'scripts/build-design-tokens.ts',
  ...GENERATED,
]);

const GENERATED_IMPORT_OWNERS = new Set([
  'override/core/variables.ts',
]);

const LEGACY_REFERENCES: ReadonlyArray<readonly [string, RegExp]> = [
  ['direct-token-css-api', /--sc-token-[\w-]+/g],
  ['component-token-path', /\bcomponent\.(?:color|dimension|number|duration|shadow)\.[A-Za-z0-9_.]+/g],
  ['token-runtime', /\btokenRuntime\b/g],
  ['token-types-runtime', /\btokenTypes\b/g],
  ['legacy-motion-tokens', /\bmotionTokens\b/g],
  ['legacy-token-motion', /\btokenMotion\b/g],
  ['legacy-type-alias', /--sc-type-[\w-]+/g],
  ['legacy-z-alias', /--sc-z-(?:raised|theme-popover|modal)\b/g],
  ['legacy-effect-alias', /--sc-(?:overlay-modal|shadow-modal|shadow-submenu|gradient-sticky-shadow-stops)\b/g],
  ['legacy-opacity-alias', /--sc-opacity-(?:trait-icon|placeholder|sticky-desktop|sticky-mobile)\b/g],
  ['legacy-scale-alias', /--sc-scale-(?:pressed|submenu-pressed)\b/g],
  ['legacy-layout-alias', /--sc-(?:catalog-gutter|catalog-inline-space|product-image-ratio)\b/g],
  ['legacy-variables-css', /(?:core\/variables\.css|variables\.css\?v=)/g],
];

const GLOBAL_COLOR_LITERALS =
  /#(?:0a0a0a|303030|5f5f5f|767676|989898|f5f5f5|fbfbfa|e3e3de|d1d1cb|ffffff|f3f3f0|c8c8c2|9c9c95|6f6f6f|121210|2d2d29|44443e)\b/gi;

const root = process.cwd();
const strict = process.argv.includes('--strict');
const findings: Finding[] = [];
const flatTokens = new Map<string, FlatToken>();
const tokenDependencies = new Map<string, Set<string>>();
const localDefinitions: VariableSite[] = [];
const localUsages: VariableSite[] = [];

function add(category: string, file: string, line: number, value: string): void {
  findings.push({
    category,
    file,
    line,
    value: value.trim().replace(/\s+/g, ' '),
  });
}

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split('\n').length;
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function walk(directory: string): Promise<string[]> {
  if (!(await exists(directory))) return [];
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  }));
  return nested.flat();
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
  if (Array.isArray(value)) {
    for (const item of value) collectAliasReferences(item, output);
    return output;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectAliasReferences(item, output);
  }
  return output;
}

function flattenTokens(node: unknown, path: string[], inheritedType?: string): void {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return;
  const object = node as TokenNode;
  let type = inheritedType;

  if (typeof object.$type === 'string') {
    type = object.$type;
    if (!DTCG_TYPES.has(type)) {
      add('dtcg-type', 'tokens/design.tokens.json', 1, `${path.join('.') || '<root>'}: ${type}`);
    }
  }

  if ('$value' in object) {
    const tokenPath = path.join('.');
    if (!type) add('dtcg-type', 'tokens/design.tokens.json', 1, `${tokenPath}: no resolvable $type`);
    if (type && TYPES_OWNED_BY_TYPESCRIPT.has(type)) {
      add('motion-token-in-dtcg', 'tokens/design.tokens.json', 1, `${tokenPath}: ${type}`);
    }
    if (COMPONENT_TOKEN_TERMS.test(tokenPath)) {
      add('component-token-in-global-source', 'tokens/design.tokens.json', 1, tokenPath);
    }
    flatTokens.set(tokenPath, { path: tokenPath, type: type ?? '', value: object.$value });
    tokenDependencies.set(tokenPath, collectAliasReferences(object.$value));
    return;
  }

  for (const [key, value] of Object.entries(object)) {
    if (!key.startsWith('$')) flattenTokens(value, [...path, key], type);
  }
}

const tokenDir = resolve(root, 'tokens');
const tokenFiles = (await readdir(tokenDir)).filter((name) => name.endsWith('.tokens.json')).sort();

if (tokenFiles.length !== 1 || tokenFiles[0] !== 'design.tokens.json') {
  add('token-source', 'tokens', 1, `expected only design.tokens.json; found ${tokenFiles.join(', ') || 'none'}`);
}

if (await exists(resolve(tokenDir, 'component.tokens.json'))) {
  add('token-source', 'tokens/component.tokens.json', 1, 'component token document must not exist');
}

if (await exists(resolve(root, 'override/core/variables.css'))) {
  add('legacy-file', 'override/core/variables.css', 1, 'obsolete global variables compatibility layer still exists');
}

const tokenPath = resolve(tokenDir, 'design.tokens.json');
const tokenSource = await readFile(tokenPath, 'utf8');
const tokenDocument = JSON.parse(tokenSource) as Record<string, unknown>;

if ('$schema' in tokenDocument) {
  add(
    'non-dtcg-root-property',
    'tokens/design.tokens.json',
    1,
    '$schema is not defined by the DTCG Format Module 2025.10',
  );
}

for (const key of Object.keys(tokenDocument)) {
  if (key.startsWith('$')) continue;
  if (!PROJECT_TOKEN_ROOTS.has(key)) {
    add('token-root', 'tokens/design.tokens.json', 1, `${key}: top-level project groups must use official DTCG type names`);
  }
}

flattenTokens(tokenDocument, []);

for (const [path, dependencies] of tokenDependencies) {
  for (const dependency of dependencies) {
    if (!flatTokens.has(dependency)) add('token-alias', 'tokens/design.tokens.json', 1, `${path} -> ${dependency}`);
  }
}

const scanRoots = [resolve(root, 'override'), resolve(root, 'scripts')];
const sourceFiles = (await Promise.all(scanRoots.map(walk)))
  .flat()
  .filter((path) => ['.css', '.ts'].includes(extname(path)));

const usageCorpus: string[] = [];

for (const absolute of sourceFiles) {
  const file = relative(root, absolute).replace(/\\/g, '/');
  const source = await readFile(absolute, 'utf8');

  if (!SCAN_EXCLUDED.has(file)) {
    for (const [category, pattern] of LEGACY_REFERENCES) {
      pattern.lastIndex = 0;
      for (const match of source.matchAll(pattern)) {
        add(category, file, lineOf(source, match.index ?? 0), match[0] ?? '');
      }
    }
  }

  if (
    source.includes('tokens.generated.js')
    && !GENERATED_IMPORT_OWNERS.has(file)
    && !GENERATED.has(file)
  ) {
    add(
      'direct-generated-ts-api',
      file,
      1,
      'tokens.generated.js may only be adapted by core/variables.ts',
    );
  }

  if (!SCAN_EXCLUDED.has(file)) {
    usageCorpus.push(source);
    GLOBAL_COLOR_LITERALS.lastIndex = 0;
    for (const match of source.matchAll(GLOBAL_COLOR_LITERALS)) {
      add('duplicated-global-color', file, lineOf(source, match.index ?? 0), match[0] ?? '');
    }
  }

  if (!file.startsWith('override/') || GENERATED.has(file)) continue;
  const owner = ownerFor(file);

  if (extname(file) === '.css') {
    for (const match of source.matchAll(/(--sc-[\w-]+)\s*:/g)) {
      localDefinitions.push({
        name: match[1] ?? '',
        file,
        line: lineOf(source, match.index ?? 0),
        owner,
      });
    }
    for (const match of source.matchAll(/var\(\s*(--sc-[\w-]+)/g)) {
      localUsages.push({
        name: match[1] ?? '',
        file,
        line: lineOf(source, match.index ?? 0),
        owner,
      });
    }
    continue;
  }

  const propertyConstants = new Map<string, { variable: string; line: number }>();
  for (const match of source.matchAll(/\bconst\s+([A-Z][A-Z0-9_]*)\s*=\s*['"](--sc-[\w-]+)['"]/g)) {
    const identifier = match[1] ?? '';
    const variable = match[2] ?? '';
    propertyConstants.set(identifier, { variable, line: lineOf(source, match.index ?? 0) });
  }

  for (const { variable, line } of propertyConstants.values()) {
    localDefinitions.push({ name: variable, file, line, owner });
  }

  for (const [identifier, { variable }] of propertyConstants) {
    const occurrences = source.match(new RegExp(`\\b${identifier}\\b`, 'g'))?.length ?? 0;
    if (occurrences > 1) localUsages.push({ name: variable, file, line: 1, owner });
  }

  for (const match of source.matchAll(/\.style\.setProperty\(\s*['"](--sc-[\w-]+)['"]/g)) {
    localDefinitions.push({
      name: match[1] ?? '',
      file,
      line: lineOf(source, match.index ?? 0),
      owner,
    });
  }

  for (const match of source.matchAll(/(?:getPropertyValue|removeProperty)\(\s*['"](--sc-[\w-]+)['"]/g)) {
    localUsages.push({
      name: match[1] ?? '',
      file,
      line: lineOf(source, match.index ?? 0),
      owner,
    });
  }
}

const generatedCss = await readFile(resolve(root, 'override/core/tokens.generated.css'), 'utf8');
const globalVariables = new Set<string>();

for (const match of generatedCss.matchAll(/(--sc-[\w-]+)\s*:/g)) {
  globalVariables.add(match[1] ?? '');
}

for (const variable of globalVariables) {
  if (variable.startsWith('--sc-token-')) {
    add('generated-legacy-api', 'override/core/tokens.generated.css', 1, variable);
  }
}

const motionConfigSource = await readFile(resolve(root, 'override/motion/config.ts'), 'utf8');
for (const match of motionConfigSource.matchAll(/['"](--sc-(?:motion|transition)-[\w-]+)['"]\s*:/g)) {
  globalVariables.add(match[1] ?? '');
}

const definitionMap = new Map<string, VariableSite[]>();
const usageMap = new Map<string, VariableSite[]>();

for (const site of localDefinitions) {
  definitionMap.set(site.name, [...(definitionMap.get(site.name) ?? []), site]);
}
for (const site of localUsages) {
  usageMap.set(site.name, [...(usageMap.get(site.name) ?? []), site]);
}

for (const [name, usages] of usageMap) {
  if (globalVariables.has(name)) continue;
  const definitions = definitionMap.get(name) ?? [];

  if (!definitions.length) {
    for (const usage of usages) add('orphan-css-variable', usage.file, usage.line, name);
    continue;
  }

  const definitionOwners = new Set(definitions.map((site) => site.owner));
  if (definitionOwners.size > 1) {
    add(
      'cross-owner-variable-definition',
      definitions[0]?.file ?? 'override',
      definitions[0]?.line ?? 1,
      `${name}: ${[...definitionOwners].join(', ')}`,
    );
  }

  for (const usage of usages) {
    if (!definitionOwners.has(usage.owner)) {
      add(
        'cross-owner-variable-use',
        usage.file,
        usage.line,
        `${name}: owned by ${[...definitionOwners].join(', ')}, used by ${usage.owner}`,
      );
    }
  }
}

for (const [name, definitions] of definitionMap) {
  if (globalVariables.has(name)) continue;
  if (!(usageMap.get(name)?.length)) {
    for (const definition of definitions) {
      add('unused-css-variable', definition.file, definition.line, name);
    }
  }
}

const corpus = usageCorpus.join('\n');
const liveTokens = new Set<string>();

function mark(path: string): void {
  if (flatTokens.has(path)) liveTokens.add(path);
}

function markPrefix(prefix: string): void {
  for (const path of flatTokens.keys()) {
    if (path === prefix || path.startsWith(`${prefix}.`)) mark(path);
  }
}

const variableBindings: ReadonlyArray<readonly [string, string]> = [
  ['--sc-content-max-width', 'dimension.contentMaxWidth'],
  ['--sc-border-hairline', 'dimension.borderHairline'],
  ['--sc-focus-ring-width', 'dimension.focusRingWidth'],
  ['--sc-focus-ring-width-subtle', 'dimension.focusRingWidthSubtle'],
  ['--sc-focus-ring-offset', 'dimension.focusRingOffset'],
  ['--sc-focus-ring-offset-tight', 'dimension.focusRingOffsetTight'],
  ['--sc-touch-target', 'dimension.touchTarget'],
  ['--sc-layout-grid-gutter', 'dimension.layout.gridGutter'],
  ['--sc-font-primary', 'fontFamily.primary'],
  ['--sc-font-weight-regular', 'fontWeight.regular'],
  ['--sc-font-weight-semibold', 'fontWeight.semibold'],
  ['--sc-media-product-aspect-ratio', 'number.mediaProductAspectRatio'],
  ['--sc-layer-raised', 'number.layerRaised'],
];

for (const [variable, tokenOrPrefix] of variableBindings) {
  if (!corpus.includes(variable)) continue;
  if (flatTokens.has(tokenOrPrefix)) mark(tokenOrPrefix);
  else markPrefix(tokenOrPrefix);
}

for (const role of ['heading-1', 'heading-2', 'heading-3', 'heading-4', 'body', 'body-small']) {
  if (!corpus.includes(`--sc-typography-${role}-`)) continue;
  const path = role === 'heading-1' ? 'typography.heading1'
    : role === 'heading-2' ? 'typography.heading2'
      : role === 'heading-3' ? 'typography.heading3'
        : role === 'heading-4' ? 'typography.heading4'
          : role === 'body-small' ? 'typography.bodySmall'
            : 'typography.body';
  markPrefix(path);
}

for (const name of [
  'ink', 'heading', 'copy', 'muted', 'trait',
  'surface', 'surfaceTransparent', 'surfaceRaised', 'border', 'borderStrong', 'focusRing',
] as const) {
  const variable = name === 'focusRing'
    ? '--sc-focus-ring-color'
    : `--sc-color-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
  if (!corpus.includes(variable)) continue;
  mark(`color.light.${name}`);
  mark(`color.dark.${name}`);
}

for (const kind of ['default', 'strong', 'focus'] as const) {
  if (!corpus.includes(`--sc-border-${kind}`)) continue;
  mark(`border.light.${kind}`);
  mark(`border.dark.${kind}`);
}

const coreVariablesSource = await readFile(resolve(root, 'override/core/variables.ts'), 'utf8');
for (const path of [
  'dimension.breakpointPhone',
  'dimension.breakpointMobile',
  'dimension.breakpointTabletMin',
  'dimension.breakpointTabletMax',
  'dimension.breakpointDesktop',
]) {
  if (coreVariablesSource.includes('tokenMedia')) mark(path);
}
mark('dimension.breakpointContentNarrow');

const queue = [...liveTokens];
while (queue.length) {
  const path = queue.pop();
  if (!path) continue;
  for (const dependency of tokenDependencies.get(path) ?? []) {
    if (liveTokens.has(dependency)) continue;
    liveTokens.add(dependency);
    queue.push(dependency);
  }
}

for (const path of flatTokens.keys()) {
  if (!liveTokens.has(path)) add('unused-global-token', 'tokens/design.tokens.json', 1, path);
}

const counts = new Map<string, number>();
for (const finding of findings) {
  counts.set(finding.category, (counts.get(finding.category) ?? 0) + 1);
}

const ordered = [...counts.entries()]
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

console.log(
  `[design-token-architecture] ${findings.length} violation(s); `
  + `${flatTokens.size} global DTCG token(s), ${liveTokens.size} live`,
);

for (const [category, count] of ordered) console.log(`  ${category}: ${count}`);

for (const [category] of ordered) {
  const categoryFindings = findings.filter((finding) => finding.category === category);
  const output = strict ? categoryFindings : categoryFindings.slice(0, 12);
  if (!output.length) continue;
  console.log(`\n[${category}] ${strict ? 'findings' : 'examples'}:`);
  for (const finding of output) {
    console.log(`  ${finding.file}:${finding.line} ${finding.value}`);
  }
}

if (strict && findings.length) {
  console.error(`\n[design-token-architecture] strict mode failed with ${findings.length} violation(s).`);
  process.exitCode = 1;
}
