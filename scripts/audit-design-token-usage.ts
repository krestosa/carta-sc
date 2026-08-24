import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

interface Finding {
  readonly category: string;
  readonly file: string;
  readonly line: number;
  readonly property: string;
  readonly value: string;
}

const root = process.cwd();
const scanRoot = resolve(root, 'override');
const strict = process.argv.includes('--strict');
const findings: Finding[] = [];
const generated = new Set([
  'override/core/tokens.generated.css',
  'override/core/tokens.generated.ts',
]);

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  }));
  return nested.flat();
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '));
}

function add(category: string, file: string, line: number, property: string, value: string): void {
  findings.push({ category, file, line, property, value: value.trim().replace(/\s+/g, ' ') });
}

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split('\n').length;
}

function hasRawDimension(value: string): boolean {
  return /(^|[^\w-])-?\d*\.?\d+(?:px|rem)\b/i.test(value);
}

function auditCss(file: string, source: string): void {
  const cleaned = stripComments(source);
  const declaration = /(^|[;{\n])\s*([\w-]+)\s*:\s*([^;{}]+)(?=;|})/g;
  for (const match of cleaned.matchAll(declaration)) {
    const property = match[2] ?? '';
    const value = match[3] ?? '';
    const index = match.index ?? 0;
    const line = lineOf(cleaned, index);
    const tokenized = /var\(--sc-(?:token-|type-|color-|motion-|transition-|border-|shadow-|gradient-|opacity-|scale-|font-|focus-|touch-|z-|content-|catalog-|product-)/.test(value);
    const resetOnly = /^(?:0|0%|none|normal|auto|inherit|initial|unset|transparent|currentColor)(?:\s*!important)?$/i.test(value.trim());

    if (/(?:#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|lab|lch|oklab|oklch|color)\()/i.test(value) && !tokenized) add('color', file, line, property, value);
    if (/\b\d*\.?\d+(?:ms|s)\b/i.test(value) && !tokenized) add('duration', file, line, property, value);
    if (/cubic-bezier\(/i.test(value) && !tokenized) add('cubicBezier', file, line, property, value);
    if (/gradient\(/i.test(value) && !/var\(--sc-(?:token-gradient|gradient-)/.test(value)) add('gradient', file, line, property, value);
    if (/^(?:box-shadow|text-shadow)$/i.test(property) && !resetOnly && !/var\(--sc-(?:token-shadow|shadow-)/.test(value)) add('shadow', file, line, property, value);
    if (property === 'font-family' && !tokenized) add('fontFamily', file, line, property, value);
    if (property === 'font-weight' && /^\s*\d+/.test(value) && !tokenized) add('fontWeight', file, line, property, value);
    if (/^(?:font-size|letter-spacing)$/i.test(property) && hasRawDimension(value) && !tokenized) add('typography', file, line, property, value);
    if (/^border(?:-(?:top|right|bottom|left))?$/i.test(property) && !resetOnly && !tokenized) add('border', file, line, property, value);
    if (/^border-style$/i.test(property) && /\b(?:solid|dashed|dotted|double|groove|ridge|inset|outset)\b/.test(value) && !tokenized) add('strokeStyle', file, line, property, value);
    if (/^transition(?:-\w+)?$/i.test(property) && !resetOnly && !tokenized && (/\b\d*\.?\d+(?:ms|s)\b/.test(value) || /cubic-bezier\(/.test(value))) add('transition', file, line, property, value);
    if (/^(?:opacity|z-index|line-height)$/i.test(property) && /^\s*-?\d*\.?\d+/.test(value) && !resetOnly && !tokenized) add('number', file, line, property, value);
    if (hasRawDimension(value) && !tokenized && !resetOnly) add('dimension', file, line, property, value);
  }
}

function auditTs(file: string, source: string): void {
  const cleaned = stripComments(source);
  const literals: Array<[string, RegExp]> = [
    ['color', /['"](?:#[0-9a-f]{3,8}|rgba?\(|hsla?\()[^'"]*['"]/gi],
    ['duration', /\b(?:duration|delay|debounce|throttle|timeout|interval)\w*\s*[:=]\s*\d+(?:\.\d+)?\b/gi],
    ['cubicBezier', /['"]cubic-bezier\([^'"]+['"]/gi],
    ['dimension', /['"]-?\d*\.?\d+(?:px|rem)['"]/gi],
  ];
  for (const [category, pattern] of literals) {
    for (const match of cleaned.matchAll(pattern)) {
      const value = match[0] ?? '';
      if (/token(?:Media|Motion|Types)|var\(--sc-token-/.test(value)) continue;
      add(`${category}:ts`, file, lineOf(cleaned, match.index ?? 0), 'typescript-literal', value);
    }
  }
}

for (const absolute of await walk(scanRoot)) {
  const extension = extname(absolute);
  if (extension !== '.css' && extension !== '.ts') continue;
  const file = relative(root, absolute).replace(/\\/g, '/');
  if (generated.has(file)) continue;
  const source = await readFile(absolute, 'utf8');
  if (extension === '.css') auditCss(file, source);
  else auditTs(file, source);
}

const counts = new Map<string, number>();
for (const finding of findings) counts.set(finding.category, (counts.get(finding.category) ?? 0) + 1);
const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
console.log(`[design-token-audit] ${findings.length} raw supported-design-value occurrences`);
for (const [category, count] of ordered) console.log(`  ${category}: ${count}`);

for (const [category] of ordered) {
  const sample = findings.filter((finding) => finding.category === category).slice(0, 8);
  if (!sample.length) continue;
  console.log(`\n[${category}] examples:`);
  for (const finding of sample) console.log(`  ${finding.file}:${finding.line} ${finding.property}: ${finding.value}`);
}

if (strict && findings.length) {
  console.error(`\n[design-token-audit] strict mode failed with ${findings.length} findings.`);
  process.exitCode = 1;
}
