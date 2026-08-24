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

const removedNumericDimensions = [
  'zero','one','two','three','four','five','six','seven','eight','nine','ten','twelve','thirteen','fourteen','fifteen','sixteen','eighteen','twenty','twenty-two','twenty-four','twenty-six','twenty-eight','thirty','thirty-two','thirty-four','thirty-eight','forty-two','forty-four','forty-eight','fifty-two','fifty-five','sixty','sixty-four','one-seventy','one-eighty-four','one-ninety','two-thirty-eight','three-twenty','five-sixty',
] as const;
const removedNumericDimensionCss = new RegExp(`--sc-token-dimension-(?:${removedNumericDimensions.join('|')})(?![a-z-])`, 'gi');
const removedTypographyPrimitiveCss = /--sc-token-dimension-(?:font-[a-z-]+|tracking-(?:zero|modal-title))\b/gi;
const removedComponentNumericCss = /--sc-token-component-dimension-font-ten-three-quarter\b/gi;
const removedNumberPrimitiveCss = /--sc-token-number-(?:zero|one)\b/gi;
const removedDimensionPath = /\bdimension\.(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|twelve|thirteen|fourteen|fifteen|sixteen|eighteen|twenty|twentyTwo|twentyFour|twentySix|twentyEight|thirty|thirtyTwo|thirtyFour|thirtyEight|fortyTwo|fortyFour|fortyEight|fiftyTwo|fiftyFive|sixty|sixtyFour|oneSeventy|oneEightyFour|oneNinety|twoThirtyEight|threeTwenty|fiveSixty|font[A-Z][A-Za-z]*|trackingZero|trackingModalTitle)\b/g;
const removedNumberPath = /\bnumber\.(?:zero|one)\b/g;
const removedComponentPath = /\bcomponent\.dimension\.fontTenThreeQuarter\b/g;

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  }));
  return nested.flat();
}

function blankPreservingLines(match: string): string {
  return match.replace(/[^\n]/g, ' ');
}

function stripNonComponentCss(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, blankPreservingLines)
    .replace(/@font-face\s*\{[^}]*\}/gi, blankPreservingLines);
}

function add(category: string, file: string, line: number, property: string, value: string): void {
  findings.push({ category, file, line, property, value: value.trim().replace(/\s+/g, ' ') });
}

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split('\n').length;
}

function numericMatches(value: string, units: string): number[] {
  const pattern = new RegExp(`-?\\d*\\.?\\d+(?:${units})\\b`, 'gi');
  return [...value.matchAll(pattern)].map((match) => Number.parseFloat(match[0] ?? '0'));
}

function hasRawDuration(value: string): boolean {
  return numericMatches(value, 'ms|s').some((number) => number !== 0);
}

function auditForbiddenReferences(file: string, source: string): void {
  const patterns: Array<[string, RegExp]> = [
    ['numericDimensionToken', removedNumericDimensionCss],
    ['numericTypographyPrimitive', removedTypographyPrimitiveCss],
    ['numericComponentPrimitive', removedComponentNumericCss],
    ['numericNumberPrimitive', removedNumberPrimitiveCss],
    ['numericDimensionPath', removedDimensionPath],
    ['numericNumberPath', removedNumberPath],
    ['numericComponentPath', removedComponentPath],
  ];

  for (const [category, pattern] of patterns) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      add(category, file, lineOf(source, match.index ?? 0), 'removed-token-reference', match[0] ?? '');
    }
  }
}

function auditCss(file: string, source: string): void {
  auditForbiddenReferences(file, source);
  const cleaned = stripNonComponentCss(source);
  const declaration = /(^|[;{\n])\s*([\w-]+)\s*:\s*([^;{}]+)(?=;|})/g;
  for (const match of cleaned.matchAll(declaration)) {
    const property = match[2] ?? '';
    const value = match[3] ?? '';
    const index = match.index ?? 0;
    const line = lineOf(cleaned, index);
    const tokenized = /var\(--sc-(?:token-|type-|color-|motion-|transition-|border-|shadow-|gradient-|opacity-|scale-|font-|focus-|touch-|z-|content-|catalog-|product-)/.test(value);
    const normalized = value.trim().replace(/\s*!important\s*$/i, '');
    const resetOnly = /^(?:0|0%|0px|0rem|0ms|0s|none|normal|auto|inherit|initial|unset|transparent|currentColor)$/i.test(normalized);

    if (/(?:#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|lab|lch|oklab|oklch|color)\()/i.test(value) && !tokenized) add('color', file, line, property, value);
    if (hasRawDuration(value) && !tokenized) add('duration', file, line, property, value);
    if (/cubic-bezier\(/i.test(value) && !tokenized) add('cubicBezier', file, line, property, value);
    if (/^(?:box-shadow|text-shadow)$/i.test(property) && !resetOnly && !tokenized) add('shadow', file, line, property, value);
    if (property === 'font-family' && !resetOnly && !tokenized) add('fontFamily', file, line, property, value);
    if (property === 'font-weight' && /^\s*\d+/.test(value) && !tokenized) add('fontWeight', file, line, property, value);
    if (/^border(?:-(?:top|right|bottom|left))?$/i.test(property) && !resetOnly && !tokenized) add('border', file, line, property, value);
    if (/^border-style$/i.test(property) && /\b(?:solid|dashed|dotted|double|groove|ridge|inset|outset)\b/.test(value) && !tokenized) add('strokeStyle', file, line, property, value);
    if (/^transition(?:-\w+)?$/i.test(property) && !resetOnly && !tokenized && (hasRawDuration(value) || /cubic-bezier\(/.test(value))) add('transition', file, line, property, value);
  }
}

function auditTs(file: string, source: string): void {
  auditForbiddenReferences(file, source);
  const cleaned = source.replace(/\/\*[\s\S]*?\*\//g, blankPreservingLines);
  const literals: Array<[string, RegExp]> = [
    ['color', /['"](?:#[0-9a-f]{3,8}|rgba?\(|hsla?\()[^'"]*['"]/gi],
    ['duration', /\b(?:duration|delay|debounce|throttle|timeout|interval)\w*\s*[:=]\s*(?!0\b)\d+(?:\.\d+)?\b/gi],
    ['cubicBezier', /['"]cubic-bezier\([^'"]+['"]/gi],
  ];
  for (const [category, pattern] of literals) {
    for (const match of cleaned.matchAll(pattern)) {
      const value = match[0] ?? '';
      if (/token(?:Media|Motion|Runtime|Types)|var\(--sc-token-/.test(value)) continue;
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
console.log(`[design-token-audit] ${findings.length} semantic token-policy violations`);
for (const [category, count] of ordered) console.log(`  ${category}: ${count}`);

for (const [category] of ordered) {
  const categoryFindings = findings.filter((finding) => finding.category === category);
  const output = strict ? categoryFindings : categoryFindings.slice(0, 8);
  if (!output.length) continue;
  console.log(`\n[${category}] ${strict ? 'findings' : 'examples'}:`);
  for (const finding of output) console.log(`  ${finding.file}:${finding.line} ${finding.property}: ${finding.value}`);
}

if (strict && findings.length) {
  console.error(`\n[design-token-audit] strict mode failed with ${findings.length} findings.`);
  process.exitCode = 1;
}
