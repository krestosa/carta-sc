import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as ts from 'typescript';

const ROOT = process.cwd();
const SOURCE_OVERRIDE = path.join(ROOT, 'override');
const BROWSER_OVERRIDE = path.join(ROOT, '.generated', 'browser', 'override');
const PRODUCTION_OVERRIDE = path.join(ROOT, '.generated', 'production', 'override');
const CSS_ENTRY = path.join(SOURCE_OVERRIDE, 'main.css');
const PRODUCTION_CSS = path.join(PRODUCTION_OVERRIDE, 'main.css');
const RUNTIME_ENTRY = path.join(BROWSER_OVERRIDE, 'main.js');

const CONTENT_EXTENSIONS = new Set([
  '.html', '.htm', '.php', '.js', '.json', '.svg',
]);
const IGNORED_DIRECTORIES = new Set([
  '.git', '.build', '.generated', '.migration', '.pages-site', 'handoff', 'lab', 'node_modules',
  'scripts', 'tokens', 'types',
]);

interface UsageIndex {
  readonly tokens: ReadonlySet<string>;
  readonly dynamicPrefixes: readonly string[];
}

interface RuntimeStats {
  readonly sourceFiles: number;
  readonly productionFiles: number;
  readonly removedFiles: number;
  readonly sourceBytes: number;
  readonly productionBytes: number;
}

interface CssStats {
  readonly sourceBytes: number;
  readonly productionBytes: number;
  readonly selectorsRemoved: number;
  readonly customPropertiesRemoved: number;
}

interface CssPruneResult {
  readonly css: string;
  readonly selectorsRemoved: number;
}

interface CustomPropertyPruneResult {
  readonly css: string;
  readonly customPropertiesRemoved: number;
}

function normalize(value: string): string {
  return value.replaceAll(path.sep, '/');
}

function assertInside(base: string, target: string, label: string): void {
  const relative = path.relative(base, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`${label} escaped its runtime root: ${target}`);
  }
}

function ensureCleanDirectory(directory: string): void {
  fs.rmSync(directory, { recursive: true, force: true });
  fs.mkdirSync(directory, { recursive: true });
}

function walkFiles(directory: string, ignored = IGNORED_DIRECTORIES): string[] {
  if (!fs.existsSync(directory)) return [];
  const files: string[] = [];
  const stack = [directory];
  while (stack.length) {
    const current = stack.pop();
    if (!current) continue;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory() && ignored.has(entry.name)) continue;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(absolute);
      else if (entry.isFile()) files.push(absolute);
    }
  }
  return files;
}

function stripQueryAndHash(specifier: string): string {
  return specifier.split(/[?#]/, 1)[0] ?? specifier;
}

function dynamicImportHead(node: ts.Expression): string | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (!ts.isTemplateExpression(node)) return null;
  const head = node.head.text;
  const jsEnd = head.lastIndexOf('.js');
  return jsEnd >= 0 ? head.slice(0, jsEnd + 3) : null;
}

function moduleSpecifiers(source: string, file: string): string[] {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS);
  const found = new Set<string>();

  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      && node.moduleSpecifier
      && ts.isStringLiteral(node.moduleSpecifier)
    ) {
      found.add(node.moduleSpecifier.text);
    }

    if (
      ts.isCallExpression(node)
      && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && node.arguments[0]
    ) {
      const specifier = dynamicImportHead(node.arguments[0]);
      if (specifier) found.add(specifier);
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return [...found];
}

function resolveRuntimeImport(fromFile: string, specifier: string): string | null {
  const clean = stripQueryAndHash(specifier);
  if (!clean.startsWith('.')) return null;
  let target = path.resolve(path.dirname(fromFile), clean);
  if (!path.extname(target)) target += '.js';
  assertInside(BROWSER_OVERRIDE, target, 'Relative runtime import');
  return target;
}

function reachableRuntimeFiles(): Set<string> {
  if (!fs.existsSync(RUNTIME_ENTRY)) {
    throw new Error('Missing generated override/main.js; compile browser TypeScript before optimizing runtime');
  }

  const reachable = new Set<string>();
  const pending = [RUNTIME_ENTRY];

  while (pending.length) {
    const current = pending.pop();
    if (!current || reachable.has(current)) continue;
    if (!fs.existsSync(current)) {
      throw new Error(`Reachable runtime module does not exist: ${normalize(path.relative(ROOT, current))}`);
    }

    reachable.add(current);
    const source = fs.readFileSync(current, 'utf8');
    for (const specifier of moduleSpecifiers(source, current)) {
      const dependency = resolveRuntimeImport(current, specifier);
      if (dependency && !reachable.has(dependency)) pending.push(dependency);
    }
  }

  return reachable;
}

function copyReachableRuntime(): RuntimeStats {
  const sourceFiles = walkFiles(BROWSER_OVERRIDE, new Set()).filter((file) => file.endsWith('.js'));
  const reachable = reachableRuntimeFiles();
  let sourceBytes = 0;
  let productionBytes = 0;

  for (const file of sourceFiles) sourceBytes += fs.statSync(file).size;

  for (const file of [...reachable].sort()) {
    const relative = path.relative(BROWSER_OVERRIDE, file);
    const destination = path.join(PRODUCTION_OVERRIDE, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(file, destination);
    productionBytes += fs.statSync(destination).size;
  }

  return {
    sourceFiles: sourceFiles.length,
    productionFiles: reachable.size,
    removedFiles: sourceFiles.length - reachable.size,
    sourceBytes,
    productionBytes,
  };
}

function splitUrlSuffix(value: string): { pathPart: string; suffix: string } {
  const index = value.search(/[?#]/);
  if (index < 0) return { pathPart: value, suffix: '' };
  return { pathPart: value.slice(0, index), suffix: value.slice(index) };
}

function rewriteRelativeUrls(source: string, sourceFile: string): string {
  return source.replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/gi, (full, quote: string, raw: string) => {
    if (/^(?:data:|https?:|\/\/|#|\/)/i.test(raw)) return full;
    const { pathPart, suffix } = splitUrlSuffix(raw);
    const absoluteAsset = path.resolve(path.dirname(sourceFile), pathPart);
    let relativeAsset = normalize(path.relative(path.dirname(PRODUCTION_CSS), absoluteAsset));
    if (!relativeAsset.startsWith('.')) relativeAsset = `./${relativeAsset}`;
    return `url(${quote}${relativeAsset}${suffix}${quote})`;
  });
}

function inlineCss(file: string, stack: readonly string[] = []): string {
  const absolute = path.resolve(file);
  if (stack.includes(absolute)) {
    throw new Error(`CSS import cycle: ${[...stack, absolute].map((item) => normalize(path.relative(ROOT, item))).join(' -> ')}`);
  }

  let source = fs.readFileSync(absolute, 'utf8');
  source = rewriteRelativeUrls(source, absolute);

  return source.replace(
    /@import\s+(?:url\(\s*)?(['"])([^'"]+)\1\s*\)?\s*([^;]*);/gi,
    (_full, _quote: string, specifier: string, condition: string) => {
      const clean = stripQueryAndHash(specifier);
      if (!clean.startsWith('.')) return _full;
      if (condition.trim()) {
        throw new Error(`Conditional local CSS imports are not supported by the production optimizer: ${specifier}`);
      }
      const imported = path.resolve(path.dirname(absolute), clean);
      assertInside(SOURCE_OVERRIDE, imported, 'CSS import');
      return inlineCss(imported, [...stack, absolute]);
    },
  );
}

function indexUsageSource(source: string, tokens: Set<string>, dynamicPrefixes: Set<string>): void {
  for (const match of source.matchAll(/[-_a-zA-Z][-_a-zA-Z0-9]*/g)) {
    if (match[0]) tokens.add(match[0]);
  }
  for (const match of source.matchAll(/([_a-zA-Z][-_a-zA-Z0-9]*-)\$\{/g)) {
    if (match[1]) dynamicPrefixes.add(match[1]);
  }
  for (const match of source.matchAll(/['"`]([_a-zA-Z][-_a-zA-Z0-9]*-)['"`]\s*\+/g)) {
    if (match[1]) dynamicPrefixes.add(match[1]);
  }
}

function buildUsageIndex(): UsageIndex {
  const tokens = new Set<string>();
  const dynamicPrefixes = new Set<string>();
  const staticFiles = walkFiles(ROOT).filter((file) => CONTENT_EXTENSIONS.has(path.extname(file).toLowerCase()));
  const productionJs = walkFiles(PRODUCTION_OVERRIDE, new Set()).filter((file) => file.endsWith('.js'));

  for (const file of [...staticFiles, ...productionJs]) {
    indexUsageSource(fs.readFileSync(file, 'utf8'), tokens, dynamicPrefixes);
  }

  return { tokens, dynamicPrefixes: [...dynamicPrefixes].sort() };
}

function tokenIsUsed(token: string, usage: UsageIndex): boolean {
  if (usage.tokens.has(token)) return true;
  return usage.dynamicPrefixes.some((prefix) => token.startsWith(prefix));
}

function splitSelectors(selectorList: string): string[] {
  const selectors: string[] = [];
  let start = 0;
  let parens = 0;
  let brackets = 0;
  let quote = '';
  let escaped = false;

  for (let index = 0; index < selectorList.length; index += 1) {
    const char = selectorList[index] ?? '';
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '(') parens += 1;
    else if (char === ')') parens = Math.max(0, parens - 1);
    else if (char === '[') brackets += 1;
    else if (char === ']') brackets = Math.max(0, brackets - 1);
    else if (char === ',' && parens === 0 && brackets === 0) {
      selectors.push(selectorList.slice(start, index).trim());
      start = index + 1;
    }
  }

  selectors.push(selectorList.slice(start).trim());
  return selectors.filter(Boolean);
}

function selectorIsUsed(selector: string, usage: UsageIndex): boolean {
  const candidates = new Set<string>();
  for (const match of selector.matchAll(/(?:^|[^\\])\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/g)) {
    if (match[1]) candidates.add(match[1]);
  }
  for (const match of selector.matchAll(/(?:^|[^\\])#(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/g)) {
    if (match[1]) candidates.add(match[1]);
  }
  if (!candidates.size) return true;
  return [...candidates].some((candidate) => tokenIsUsed(candidate, usage));
}

function scanHeaderEnd(source: string, start: number): { index: number; delimiter: '{' | ';' } | null {
  let quote = '';
  let escaped = false;
  let parens = 0;
  let brackets = 0;
  let comment = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index] ?? '';
    const next = source[index + 1] ?? '';

    if (comment) {
      if (char === '*' && next === '/') { comment = false; index += 1; }
      continue;
    }
    if (!quote && char === '/' && next === '*') { comment = true; index += 1; continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '(') parens += 1;
    else if (char === ')') parens = Math.max(0, parens - 1);
    else if (char === '[') brackets += 1;
    else if (char === ']') brackets = Math.max(0, brackets - 1);
    else if (parens === 0 && brackets === 0 && (char === '{' || char === ';')) {
      return { index, delimiter: char };
    }
  }

  return null;
}

function closingBrace(source: string, open: number): number {
  let depth = 1;
  let quote = '';
  let escaped = false;
  let comment = false;

  for (let index = open + 1; index < source.length; index += 1) {
    const char = source[index] ?? '';
    const next = source[index + 1] ?? '';
    if (comment) {
      if (char === '*' && next === '/') { comment = false; index += 1; }
      continue;
    }
    if (!quote && char === '/' && next === '*') { comment = true; index += 1; continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  throw new Error('Unbalanced CSS block while optimizing production stylesheet');
}

function recursivelyPrunableAtRule(header: string): boolean {
  return /^@(media|supports|container|layer|scope|starting-style)\b/i.test(header.trim());
}

function pruneCss(source: string, usage: UsageIndex): CssPruneResult {
  let cursor = 0;
  let output = '';
  let selectorsRemoved = 0;

  while (cursor < source.length) {
    const boundary = scanHeaderEnd(source, cursor);
    if (!boundary) {
      output += source.slice(cursor);
      break;
    }

    const header = source.slice(cursor, boundary.index);
    if (boundary.delimiter === ';') {
      output += `${header};`;
      cursor = boundary.index + 1;
      continue;
    }

    const close = closingBrace(source, boundary.index);
    const body = source.slice(boundary.index + 1, close);
    const trimmedHeader = header.trim();

    if (trimmedHeader.startsWith('@')) {
      if (recursivelyPrunableAtRule(trimmedHeader)) {
        const nested = pruneCss(body, usage);
        selectorsRemoved += nested.selectorsRemoved;
        if (nested.css.trim()) output += `${header}{${nested.css}}`;
      } else {
        output += `${header}{${body}}`;
      }
    } else {
      const selectors = splitSelectors(header);
      const kept = selectors.filter((selector) => selectorIsUsed(selector, usage));
      selectorsRemoved += selectors.length - kept.length;
      if (kept.length) output += `${kept.join(',')}{${body}}`;
    }

    cursor = close + 1;
  }

  return { css: output, selectorsRemoved };
}

function pruneUnusedCustomProperties(source: string, usage: UsageIndex): CustomPropertyPruneResult {
  const occurrences = new Map<string, number>();
  for (const match of source.matchAll(/--sc-[\w-]+/g)) {
    const name = match[0];
    occurrences.set(name, (occurrences.get(name) ?? 0) + 1);
  }

  const removable = new Set(
    [...occurrences]
      .filter(([name, count]) => count === 1 && !tokenIsUsed(name, usage))
      .map(([name]) => name),
  );
  if (!removable.size) return { css: source, customPropertiesRemoved: 0 };

  let customPropertiesRemoved = 0;
  const css = source.replace(
    /(^|[;{])(\s*)(--sc-[\w-]+)\s*:\s*([^;{}]*);/gm,
    (full, boundary: string, spacing: string, name: string) => {
      if (!removable.has(name)) return full;
      customPropertiesRemoved += 1;
      return `${boundary}${spacing}`;
    },
  );

  return { css, customPropertiesRemoved };
}

function buildProductionCss(): CssStats {
  const source = inlineCss(CSS_ENTRY);
  const usage = buildUsageIndex();
  const pruned = pruneCss(source, usage);
  const customProperties = pruneUnusedCustomProperties(pruned.css, usage);
  const css = `${customProperties.css.trim()}\n`;
  fs.writeFileSync(PRODUCTION_CSS, css);
  return {
    sourceBytes: Buffer.byteLength(source),
    productionBytes: Buffer.byteLength(css),
    selectorsRemoved: pruned.selectorsRemoved,
    customPropertiesRemoved: customProperties.customPropertiesRemoved,
  };
}

function percentage(before: number, after: number): string {
  if (before <= 0) return '0.0%';
  return `${(((before - after) / before) * 100).toFixed(1)}%`;
}

export function optimizeRuntime(): void {
  ensureCleanDirectory(PRODUCTION_OVERRIDE);
  const runtime = copyReachableRuntime();
  const css = buildProductionCss();

  console.log(
    `[production-runtime] JS ${runtime.sourceFiles} -> ${runtime.productionFiles} modules `
    + `(${runtime.removedFiles} unreachable removed, ${percentage(runtime.sourceBytes, runtime.productionBytes)} bytes removed); `
    + `CSS ${css.selectorsRemoved} unused selectors + ${css.customPropertiesRemoved} unused custom properties removed, `
    + `${percentage(css.sourceBytes, css.productionBytes)} bytes removed`,
  );
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(path.resolve(entry)).href) optimizeRuntime();