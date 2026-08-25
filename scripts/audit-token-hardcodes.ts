// Documenta la tarea audit token hardcodes utilizada por la compilación, auditoría o comprobación del proyecto.
import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

interface TokenValue {
  readonly name: string;
  readonly value: string;
}

interface Finding {
  readonly file: string;
  readonly line: number;
  readonly property: string;
  readonly value: string;
  readonly token: string;
}

const root = process.cwd();
const GENERATED_CSS = resolve(root, 'override/core/tokens.generated.css');
const GENERATED_FILES = new Set(['override/core/tokens.generated.css']);
const findings: Finding[] = [];

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
  return (await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  }))).flat();
}

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split('\n').length;
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
}

function generatedValues(source: string, prefix: string): Map<string, TokenValue[]> {
  const values = new Map<string, TokenValue[]>();
  const pattern = new RegExp(`(--sc-${prefix}[\\w-]*)\\s*:\\s*([^;]+);`, 'g');
  for (const match of source.matchAll(pattern)) {
    const name = match[1] ?? '';
    const value = normalize(match[2] ?? '');
    if (!name || !value || value.includes('var(')) continue;
    const entries = values.get(value) ?? [];
    if (!entries.some((entry) => entry.name === name)) entries.push({ name, value });
    values.set(value, entries);
  }
  return values;
}

function preferredToken(entries: readonly TokenValue[]): string {
  return entries[0]?.name ?? '';
}

function isSpacingProperty(property: string): boolean {
  return /^(?:gap|row-gap|column-gap|margin(?:-(?:top|right|bottom|left|inline(?:-start|-end)?|block(?:-start|-end)?))?|padding(?:-(?:top|right|bottom|left|inline(?:-start|-end)?|block(?:-start|-end)?))?|scroll-(?:margin|padding)(?:-[\w-]+)?)$/.test(property)
    || (property.startsWith('--sc-') && /(?:^|-)(?:gap|margin|padding|space)(?:-|$)/.test(property));
}

function isShapeProperty(property: string): boolean {
  return /^(?:border-radius|border-(?:start|end)-(?:start|end)-radius|border-(?:top|bottom)-(?:left|right)-radius)$/.test(property)
    || (property.startsWith('--sc-') && /(?:^|-)(?:radius|shape)(?:-|$)/.test(property));
}

function isMotionProperty(property: string): boolean {
  return /^(?:animation(?:-duration)?|transition(?:-duration)?)$/.test(property)
    || (property.startsWith('--sc-') && /(?:^|-)(?:duration|delay|cycle)(?:-|$)/.test(property));
}

function add(file: string, source: string, index: number, property: string, value: string, token: string): void {
  if (!token) return;
  const finding: Finding = {
    file,
    line: lineOf(source, index),
    property,
    value: normalize(value),
    token,
  };
  if (!findings.some((candidate) => candidate.file === finding.file
    && candidate.line === finding.line
    && candidate.property === finding.property
    && candidate.value === finding.value
    && candidate.token === finding.token)) findings.push(finding);
}

const generatedCss = await readFile(GENERATED_CSS, 'utf8');
const spacingValues = generatedValues(generatedCss, 'space-');
const shapeValues = generatedValues(generatedCss, 'shape-');
const motionValues = generatedValues(generatedCss, 'motion-');
const elevationValues = generatedValues(generatedCss, 'elevation-');
const borderValues = generatedValues(generatedCss, 'border-');

const cssFiles = (await walk(resolve(root, 'override')))
  .filter((path) => extname(path) === '.css')
  .map((absolute) => ({
    absolute,
    file: relative(root, absolute).replace(/\\/g, '/'),
  }))
  .filter(({ file }) => !GENERATED_FILES.has(file));

for (const { absolute, file } of cssFiles) {
  const source = await readFile(absolute, 'utf8');
  const scanSource = withoutComments(source);

  for (const declaration of scanSource.matchAll(/(^|[;{])\s*([\w-]+)\s*:\s*([^;{}]+);/gm)) {
    const property = (declaration[2] ?? '').toLowerCase();
    const value = declaration[3] ?? '';
    const declarationIndex = (declaration.index ?? 0) + (declaration[1]?.length ?? 0);
    if (!property || !value) continue;

    if (isSpacingProperty(property)) {
      for (const literal of value.matchAll(/-?(?:\d*\.)?\d+px\b/g)) {
        const raw = literal[0] ?? '';
        const magnitude = raw.startsWith('-') ? raw.slice(1) : raw;
        const token = preferredToken(spacingValues.get(magnitude) ?? []);
        if (token) add(file, source, declarationIndex, property, raw, token);
      }
    }

    if (isShapeProperty(property)) {
      const normalized = normalize(value);
      const token = preferredToken(shapeValues.get(normalized) ?? []);
      if (token) add(file, source, declarationIndex, property, normalized, token);
      else {
        const pill = /^(\d+(?:\.\d+)?)px$/.exec(normalized);
        if (pill && Number(pill[1]) >= 999) add(file, source, declarationIndex, property, normalized, '--sc-shape-full');
      }
    }

    if (isMotionProperty(property)) {
      for (const literal of value.matchAll(/(?:\d*\.)?\d+ms\b/g)) {
        const raw = literal[0] ?? '';
        const token = preferredToken(motionValues.get(raw) ?? []);
        if (token) add(file, source, declarationIndex, property, raw, token);
      }
    }

    if (property === 'box-shadow') {
      const token = preferredToken(elevationValues.get(normalize(value)) ?? []);
      if (token) add(file, source, declarationIndex, property, value, token);
    }

    if (/^border(?:-(?:top|right|bottom|left))?$/.test(property)) {
      const token = preferredToken(borderValues.get(normalize(value)) ?? []);
      if (token) add(file, source, declarationIndex, property, value, token);
    }
  }
}

findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.property.localeCompare(b.property));
console.log(`[token-hardcode-audit] checked ${cssFiles.length} owned CSS files; ${findings.length} tokenizable hardcode warning(s)`);
for (const finding of findings) {
  console.log(`  warning tokenizable-hardcode ${finding.file}:${finding.line} ${finding.property}: ${finding.value} -> var(${finding.token})`);
}
