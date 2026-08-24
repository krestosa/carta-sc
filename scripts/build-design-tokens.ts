import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DTCG_TYPES = [
  'color', 'dimension', 'fontFamily', 'fontWeight', 'duration', 'cubicBezier', 'number',
  'strokeStyle', 'border', 'transition', 'shadow', 'gradient', 'typography',
] as const;
type DtcgType = (typeof DTCG_TYPES)[number];
interface TokenNode { $type?: string; $value?: unknown; [key: string]: unknown }
type FlatToken = { path: string; type: DtcgType; value: unknown };
type DimensionValue = { value: number; unit: 'px' | 'rem' };
type DurationValue = { value: number; unit: 'ms' | 's' };
type ColorValue = { colorSpace: string; components: Array<number | string>; alpha?: number; hex?: string };
type ShadowValue = { color: unknown; offsetX: unknown; offsetY: unknown; blur: unknown; spread: unknown };
type TypographyValue = { fontFamily: unknown; fontSize: unknown; fontWeight: unknown; letterSpacing: unknown; lineHeight: unknown };

const root = process.cwd();
const sourcePath = resolve(root, 'tokens/design.tokens.json');
const cssPath = resolve(root, 'override/core/tokens.generated.css');
const tsPath = resolve(root, 'override/core/tokens.generated.ts');
const document = JSON.parse(await readFile(sourcePath, 'utf8')) as Record<string, unknown>;
const tokens = new Map<string, FlatToken>();
const typeSet = new Set<string>(DTCG_TYPES);

function isDtcgType(value: string): value is DtcgType { return typeSet.has(value); }
function visit(node: unknown, path: string[], inheritedType?: DtcgType): void {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return;
  const object = node as TokenNode;
  let type = inheritedType;
  if (typeof object.$type === 'string') {
    if (!isDtcgType(object.$type)) throw new Error(`$type DTCG desconocido: ${object.$type} en ${path.join('.')}`);
    type = object.$type;
  }
  if ('$value' in object) {
    if (!type) throw new Error(`Token sin $type resoluble: ${path.join('.')}`);
    const tokenPath = path.join('.');
    if (tokens.has(tokenPath)) throw new Error(`Token duplicado: ${tokenPath}`);
    tokens.set(tokenPath, { path: tokenPath, type, value: object.$value });
    return;
  }
  for (const [key, value] of Object.entries(object)) if (!key.startsWith('$')) visit(value, [...path, key], type);
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
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveValue(item, stack)]));
  return value;
}
function token(path: string): FlatToken {
  const found = tokens.get(path);
  if (!found) throw new Error(`Token inexistente: ${path}`);
  return found;
}
function resolved(path: string): unknown { return resolveValue(token(path).value, [path]); }

function formatColor(value: unknown): string {
  const color = value as ColorValue;
  if (!color || !Array.isArray(color.components) || color.components.length < 3) throw new Error('Color DTCG inválido');
  const alpha = color.alpha ?? 1;
  if (alpha === 1 && color.hex) return color.hex;
  if (color.colorSpace === 'srgb' && color.components.slice(0, 3).every((component) => typeof component === 'number')) {
    const channels = color.components.slice(0, 3).map((component) => Math.round((component as number) * 255));
    return `rgb(${channels.join(' ')} / ${alpha})`;
  }
  return `color(${color.colorSpace} ${color.components.join(' ')}${alpha === 1 ? '' : ` / ${alpha}`})`;
}
function formatDimension(value: unknown): string { const v = value as DimensionValue; return `${v.value}${v.unit}`; }
function formatDuration(value: unknown): string { const v = value as DurationValue; return `${v.value}${v.unit}`; }
function formatCubicBezier(value: unknown): string { return `cubic-bezier(${(value as number[]).join(', ')})`; }
function formatFontFamily(value: unknown): string {
  const values = Array.isArray(value) ? value as string[] : [String(value)];
  return values.map((part) => /\s/.test(part) ? `'${part.replace(/'/g, "\\'")}'` : part).join(', ');
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
      const v = value as { color: unknown; width: unknown; style: unknown };
      return `${formatDimension(v.width)} ${formatStrokeStyle(v.style)} ${formatColor(v.color)}`;
    }
    case 'transition': {
      const v = value as { duration: unknown; delay: unknown; timingFunction: unknown };
      return `${formatDuration(v.duration)} ${formatCubicBezier(v.timingFunction)} ${formatDuration(v.delay)}`;
    }
    case 'shadow': {
      const values = Array.isArray(value) ? value as ShadowValue[] : [value as ShadowValue];
      return values.map((v) => [formatDimension(v.offsetX), formatDimension(v.offsetY), formatDimension(v.blur), formatDimension(v.spread), formatColor(v.color)].join(' ')).join(', ');
    }
    case 'gradient': return (value as Array<{ color: unknown; position: number }>).map((stop) => `${formatColor(stop.color)} ${stop.position * 100}%`).join(', ');
    case 'typography': {
      const v = value as TypographyValue;
      return `${String(v.fontWeight)} ${formatDimension(v.fontSize)}/${String(v.lineHeight)} ${formatFontFamily(v.fontFamily)}`;
    }
  }
}
function cssValue(path: string): string {
  const source = token(path);
  const reference = aliasPath(source.value);
  return cssForType(reference ? token(reference).type : source.type, resolved(path));
}
function durationSeconds(path: string): number {
  const value = resolved(path) as DurationValue;
  return (value.unit === 's' ? value.value * 1000 : value.value) / 1000;
}
function dimensionNumber(path: string): number {
  const value = resolved(path) as DimensionValue;
  if (value.unit !== 'px') throw new Error(`Se esperaba dimensión px para ${path}`);
  return value.value;
}

const cssName = (name: string): string => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
const semanticColors = ['ink', 'heading', 'copy', 'muted', 'trait', 'surface', 'surfaceTransparent', 'surfaceRaised', 'border', 'borderStrong'] as const;
const durationNames = ['short1','short2','short3','short4','medium1','medium2','medium3','medium4','long1','long2','long3','long4','extraLong1','extraLong2','extraLong3','extraLong4'] as const;
const easingNames = ['standard','accelerate','decelerate','linear'] as const;
const transitionNames = ['fast','standard','icon','theme'] as const;

function themeBlock(mode: 'light' | 'dark', indent = '  '): string {
  return [
    ...semanticColors.map((name) => `${indent}--sc-color-${cssName(name)}: ${cssValue(`color.${mode}.${name}`)};`),
    `${indent}--sc-focus-ring-color: ${cssValue(`color.${mode}.focusRing`)};`,
    `${indent}--sc-border-default: ${cssValue(`border.${mode}.default`)};`,
    `${indent}--sc-border-strong: ${cssValue(`border.${mode}.strong`)};`,
    `${indent}--sc-border-focus: ${cssValue(`border.${mode}.focus`)};`,
  ].join('\n');
}

const css = `/* GENERATED from the global DTCG 2025.10 source tokens/design.tokens.json. Do not edit manually. */
:root,
html[data-sc-theme-resolved='light'] {
${themeBlock('light')}
  --sc-font-primary: ${cssValue('font.family.primary')};
  --sc-font-weight-regular: ${cssValue('font.weight.regular')};
  --sc-font-weight-semibold: ${cssValue('font.weight.semibold')};
  --sc-border-hairline: ${cssValue('dimension.borderHairline')};
  --sc-focus-ring-width: ${cssValue('dimension.focusRingWidth')};
  --sc-focus-ring-width-subtle: ${cssValue('dimension.focusRingWidthSubtle')};
  --sc-focus-ring-offset: ${cssValue('dimension.focusRingOffset')};
  --sc-focus-ring-offset-tight: ${cssValue('dimension.focusRingOffsetTight')};
  --sc-touch-target: ${cssValue('dimension.touchTarget')};
  --sc-content-max-width: ${cssValue('dimension.contentMaxWidth')};
${durationNames.map((name) => `  --sc-motion-${cssName(name)}: ${cssValue(`motion.duration.${name}`)};`).join('\n')}
${easingNames.map((name) => `  --sc-motion-ease-${cssName(name)}: ${cssValue(`motion.easing.${name}`)};`).join('\n')}
${transitionNames.map((name) => `  --sc-transition-${cssName(name)}: ${cssValue(`motion.transition.${name}`)};`).join('\n')}
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
`;

const durationObject = Object.fromEntries(durationNames.map((name) => [name, durationSeconds(`motion.duration.${name}`)]));
const easingCssObject = Object.fromEntries(easingNames.map((name) => [name, cssValue(`motion.easing.${name}`)]));
const easingCurveObject = Object.fromEntries(easingNames.map((name) => [name, resolved(`motion.easing.${name}`)]));
const transitionObject = Object.fromEntries(transitionNames.map((name) => [name, cssValue(`motion.transition.${name}`)]));
const compactWideMin = dimensionNumber('dimension.breakpointPhone') + 1;
const ts = `/* GENERATED from the global DTCG 2025.10 source tokens/design.tokens.json. Do not edit manually. */
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

export const tokenMotion = Object.freeze({
  durations: Object.freeze(${JSON.stringify(durationObject, null, 2)}),
  cssEasings: Object.freeze(${JSON.stringify(easingCssObject, null, 2)}),
  curves: Object.freeze(${JSON.stringify(easingCurveObject, null, 2)}),
  transitions: Object.freeze(${JSON.stringify(transitionObject, null, 2)}),
} as const);
`;

await Promise.all([writeFile(cssPath, css), writeFile(tsPath, ts)]);
const usedTypes = [...new Set([...tokens.values()].map((entry) => entry.type))].sort();
console.log(`[design-tokens] ${tokens.size} global tokens; standard DTCG types used: ${usedTypes.join(', ')} -> CSS + TypeScript`);
