import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DTCG_TYPES = [
  'color', 'dimension', 'fontFamily', 'fontWeight', 'duration', 'cubicBezier', 'number',
  'strokeStyle', 'border', 'transition', 'shadow', 'gradient', 'typography',
] as const;

type DtcgType = (typeof DTCG_TYPES)[number];
interface TokenNode { $type?: string; $value?: unknown; [key: string]: unknown }
interface FlatToken { readonly path: string; readonly type: DtcgType; readonly value: unknown }
interface DimensionValue { readonly value: number; readonly unit: 'px' | 'rem' }
interface DurationValue { readonly value: number; readonly unit: 'ms' | 's' }
interface ColorValue {
  readonly colorSpace: string;
  readonly components: ReadonlyArray<number | string>;
  readonly alpha?: number;
  readonly hex?: string;
}
interface ShadowValue {
  readonly color: unknown;
  readonly offsetX: unknown;
  readonly offsetY: unknown;
  readonly blur: unknown;
  readonly spread: unknown;
  readonly inset?: boolean;
}
interface TypographyValue {
  readonly fontFamily: unknown;
  readonly fontSize: unknown;
  readonly fontWeight: unknown;
  readonly letterSpacing: unknown;
  readonly lineHeight: unknown;
}

const root = process.cwd();
const sourcePath = resolve(root, 'tokens/design.tokens.json');
const cssPath = resolve(root, 'override/core/tokens.generated.css');
const tsPath = resolve(root, 'override/core/tokens.generated.ts');
const document = JSON.parse(await readFile(sourcePath, 'utf8')) as Record<string, unknown>;
const tokens = new Map<string, FlatToken>();
const typeSet = new Set<string>(DTCG_TYPES);

function isDtcgType(value: string): value is DtcgType {
  return typeSet.has(value);
}

function visit(node: unknown, path: string[], inheritedType?: DtcgType): void {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return;
  const object = node as TokenNode;
  let type = inheritedType;

  if (typeof object.$type === 'string') {
    if (!isDtcgType(object.$type)) {
      throw new Error(`$type DTCG desconocido: ${object.$type} en ${path.join('.') || '<root>'}`);
    }
    type = object.$type;
  }

  if ('$value' in object) {
    if (!type) throw new Error(`Token sin $type resoluble: ${path.join('.')}`);
    const tokenPath = path.join('.');
    if (tokens.has(tokenPath)) throw new Error(`Token duplicado: ${tokenPath}`);
    tokens.set(tokenPath, { path: tokenPath, type, value: object.$value });
    return;
  }

  for (const [key, value] of Object.entries(object)) {
    if (!key.startsWith('$')) visit(value, [...path, key], type);
  }
}
visit(document, []);

function aliasPath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return /^\{([^}]+)\}$/.exec(value)?.[1] ?? null;
}

function resolveValue(value: unknown, stack: string[] = []): unknown {
  const reference = aliasPath(value);
  if (reference) {
    if (stack.includes(reference)) throw new Error(`Ciclo de aliases: ${[...stack, reference].join(' -> ')}`);
    const target = tokens.get(reference);
    if (!target) throw new Error(`Alias a token inexistente: ${reference}`);
    return resolveValue(target.value, [...stack, reference]);
  }
  if (Array.isArray(value)) return value.map((item) => resolveValue(item, stack));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveValue(item, stack)]),
    );
  }
  return value;
}

function token(path: string): FlatToken {
  const found = tokens.get(path);
  if (!found) throw new Error(`Token inexistente: ${path}`);
  return found;
}

function resolved(path: string): unknown {
  return resolveValue(token(path).value, [path]);
}

function formatColor(value: unknown): string {
  const color = value as ColorValue;
  if (!color || !Array.isArray(color.components) || color.components.length < 3) {
    throw new Error('Color DTCG inválido');
  }
  const alpha = color.alpha ?? 1;
  if (alpha === 1 && color.hex) return color.hex;
  if (
    color.colorSpace === 'srgb'
    && color.components.slice(0, 3).every((component) => typeof component === 'number')
  ) {
    const channels = color.components.slice(0, 3)
      .map((component) => Math.round((component as number) * 255));
    return `rgb(${channels.join(' ')} / ${alpha})`;
  }
  return `color(${color.colorSpace} ${color.components.join(' ')}${alpha === 1 ? '' : ` / ${alpha}`})`;
}

function formatDimension(value: unknown): string {
  const dimension = value as DimensionValue;
  if (!dimension || typeof dimension.value !== 'number' || !['px', 'rem'].includes(dimension.unit)) {
    throw new Error(`Dimensión DTCG inválida: ${JSON.stringify(value)}`);
  }
  return `${dimension.value}${dimension.unit}`;
}

function formatDuration(value: unknown): string {
  const duration = value as DurationValue;
  if (!duration || typeof duration.value !== 'number' || !['ms', 's'].includes(duration.unit)) {
    throw new Error(`Duración DTCG inválida: ${JSON.stringify(value)}`);
  }
  return `${duration.value}${duration.unit}`;
}

function formatCubicBezier(value: unknown): string {
  const points = value as number[];
  return `cubic-bezier(${points.join(', ')})`;
}

function formatFontFamily(value: unknown): string {
  const values = Array.isArray(value) ? value as string[] : [String(value)];
  return values
    .map((part) => /\s/.test(part) ? `'${part.replace(/'/g, "\\'")}'` : part)
    .join(', ');
}

function formatStrokeStyle(value: unknown): string {
  if (typeof value === 'string') return value;
  return (value as { dashArray?: unknown[] }).dashArray?.length ? 'dashed' : 'solid';
}

function cssForType(type: DtcgType, value: unknown): string {
  switch (type) {
    case 'color': return formatColor(value);
    case 'dimension': return formatDimension(value);
    case 'fontFamily': return formatFontFamily(value);
    case 'fontWeight': return String(value);
    case 'duration': return formatDuration(value);
    case 'cubicBezier': return formatCubicBezier(value);
    case 'number': return String(value);
    case 'strokeStyle': return formatStrokeStyle(value);
    case 'border': {
      const border = value as { color: unknown; width: unknown; style: unknown };
      return `${formatDimension(border.width)} ${formatStrokeStyle(border.style)} ${formatColor(border.color)}`;
    }
    case 'transition': {
      const transition = value as { duration: unknown; delay: unknown; timingFunction: unknown };
      return `${formatDuration(transition.duration)} ${formatCubicBezier(transition.timingFunction)} ${formatDuration(transition.delay)}`;
    }
    case 'shadow': {
      const values = Array.isArray(value) ? value as ShadowValue[] : [value as ShadowValue];
      return values.map((shadow) => [
        shadow.inset ? 'inset' : '',
        formatDimension(shadow.offsetX),
        formatDimension(shadow.offsetY),
        formatDimension(shadow.blur),
        formatDimension(shadow.spread),
        formatColor(shadow.color),
      ].filter(Boolean).join(' ')).join(', ');
    }
    case 'gradient': {
      return (value as Array<{ color: unknown; position: number }>)
        .map((stop) => `${formatColor(stop.color)} ${stop.position * 100}%`)
        .join(', ');
    }
    case 'typography': {
      const typography = value as TypographyValue;
      return `${String(typography.fontWeight)} ${formatDimension(typography.fontSize)}/${String(typography.lineHeight)} ${formatFontFamily(typography.fontFamily)}`;
    }
  }
}

function cssValue(path: string): string {
  const source = token(path);
  const reference = aliasPath(source.value);
  return cssForType(reference ? token(reference).type : source.type, resolved(path));
}

function dimensionNumber(path: string): number {
  const value = resolved(path) as DimensionValue;
  if (value.unit !== 'px') throw new Error(`Se esperaba dimensión px para ${path}`);
  return value.value;
}

function typographyBlock(path: string, cssRole: string, indent = '  '): string {
  const value = resolved(path) as TypographyValue;
  return [
    `${indent}--sc-typography-${cssRole}-font-family: ${formatFontFamily(value.fontFamily)};`,
    `${indent}--sc-typography-${cssRole}-font-size: ${formatDimension(value.fontSize)};`,
    `${indent}--sc-typography-${cssRole}-font-weight: ${String(value.fontWeight)};`,
    `${indent}--sc-typography-${cssRole}-line-height: ${String(value.lineHeight)};`,
    `${indent}--sc-typography-${cssRole}-letter-spacing: ${formatDimension(value.letterSpacing)};`,
  ].join('\n');
}

const semanticColors = [
  'ink', 'heading', 'copy', 'muted', 'trait', 'surface',
  'surfaceTransparent', 'surfaceRaised', 'border', 'borderStrong',
] as const;

const cssName = (name: string): string =>
  name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

function themeBlock(mode: 'light' | 'dark', indent = '  '): string {
  return [
    ...semanticColors.map(
      (name) => `${indent}--sc-color-${cssName(name)}: ${cssValue(`color.${mode}.${name}`)};`,
    ),
    `${indent}--sc-focus-ring-color: ${cssValue(`color.${mode}.focusRing`)};`,
    `${indent}--sc-border-default: ${cssValue(`border.${mode}.default`)};`,
    `${indent}--sc-border-strong: ${cssValue(`border.${mode}.strong`)};`,
    `${indent}--sc-border-focus: ${cssValue(`border.${mode}.focus`)};`,
  ].join('\n');
}

const tabletMax = cssValue('dimension.breakpointTabletMax');
const phoneMax = cssValue('dimension.breakpointPhone');
const desktopMin = cssValue('dimension.breakpointDesktop');
const narrowMax = cssValue('dimension.breakpointContentNarrow');

const css = `/* GENERATED from tokens/design.tokens.json using DTCG Format Module 2025.10. Do not edit manually. */
:root {
  --sc-font-primary: ${cssValue('fontFamily.primary')};
  --sc-font-weight-regular: ${cssValue('fontWeight.regular')};
  --sc-font-weight-semibold: ${cssValue('fontWeight.semibold')};
  --sc-border-hairline: ${cssValue('dimension.borderHairline')};
  --sc-focus-ring-width: ${cssValue('dimension.focusRingWidth')};
  --sc-focus-ring-width-subtle: ${cssValue('dimension.focusRingWidthSubtle')};
  --sc-focus-ring-offset: ${cssValue('dimension.focusRingOffset')};
  --sc-focus-ring-offset-tight: ${cssValue('dimension.focusRingOffsetTight')};
  --sc-touch-target: ${cssValue('dimension.touchTarget')};
  --sc-content-max-width: ${cssValue('dimension.contentMaxWidth')};
  --sc-layout-grid-gutter: ${cssValue('dimension.layout.gridGutter.desktop')};
  --sc-media-product-aspect-ratio: ${cssValue('number.mediaProductAspectRatio')};
  --sc-layer-raised: ${cssValue('number.layerRaised')};
${typographyBlock('typography.heading1.desktop', 'heading-1')}
${typographyBlock('typography.heading2', 'heading-2')}
${typographyBlock('typography.heading3.desktop', 'heading-3')}
${typographyBlock('typography.heading4', 'heading-4')}
${typographyBlock('typography.body', 'body')}
${typographyBlock('typography.bodySmall', 'body-small')}
}

:root,
html[data-sc-theme-resolved='light'] {
${themeBlock('light')}
}

html[data-sc-theme-resolved='dark'] {
${themeBlock('dark')}
}

@media (prefers-color-scheme: light) {
  html[data-sc-theme='system'] {
${themeBlock('light', '    ')}
  }
}

@media (prefers-color-scheme: dark) {
  html[data-sc-theme='system'] {
${themeBlock('dark', '    ')}
  }
}

@media (min-width: ${desktopMin}) and (max-width: ${narrowMax}) {
  :root {
    --sc-layout-grid-gutter: ${cssValue('dimension.layout.gridGutter.narrow')};
  }
}

@media (min-width: ${dimensionNumber('dimension.breakpointPhone') + 1}px) and (max-width: ${tabletMax}) {
  :root {
    --sc-layout-grid-gutter: ${cssValue('dimension.layout.gridGutter.compact')};
${typographyBlock('typography.heading1.tablet', 'heading-1', '    ')}
${typographyBlock('typography.heading3.tablet', 'heading-3', '    ')}
  }
}

@media (max-width: ${phoneMax}) {
  :root {
    --sc-layout-grid-gutter: ${cssValue('dimension.layout.gridGutter.mobile')};
${typographyBlock('typography.heading1.mobile', 'heading-1', '    ')}
${typographyBlock('typography.heading3.mobile', 'heading-3', '    ')}
  }
}
`;

const compactWideMin = dimensionNumber('dimension.breakpointPhone') + 1;
const ts = `/* GENERATED from tokens/design.tokens.json using DTCG Format Module 2025.10. Do not edit manually. */
export const tokenMedia = Object.freeze({
  phone: '(max-width: ${cssValue('dimension.breakpointPhone')})',
  mobile: '(max-width: ${cssValue('dimension.breakpointMobile')})',
  tablet: '(min-width: ${cssValue('dimension.breakpointTabletMin')}) and (max-width: ${cssValue('dimension.breakpointTabletMax')})',
  compact: '(max-width: ${cssValue('dimension.breakpointTabletMax')})',
  compactWide: '(min-width: ${compactWideMin}px) and (max-width: ${cssValue('dimension.breakpointTabletMax')})',
  desktop: '(min-width: ${cssValue('dimension.breakpointDesktop')})',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  reducedTransparency: '(prefers-reduced-transparency: reduce)',
  moreContrast: '(prefers-contrast: more)',
  forcedColors: '(forced-colors: active)',
} as const);
`;

await Promise.all([
  writeFile(cssPath, css),
  writeFile(tsPath, ts),
]);

const usedTypes = [...new Set([...tokens.values()].map((entry) => entry.type))].sort();
console.log(
  `[design-tokens] ${tokens.size} global tokens; DTCG types used: ${usedTypes.join(', ')} -> CSS + TypeScript media`,
);
