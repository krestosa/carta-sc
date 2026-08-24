import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DTCG_TYPES = [
  'color',
  'dimension',
  'fontFamily',
  'fontWeight',
  'duration',
  'cubicBezier',
  'number',
  'strokeStyle',
  'border',
  'transition',
  'shadow',
  'gradient',
  'typography',
] as const;

type DtcgType = (typeof DTCG_TYPES)[number];
interface TokenNode {
  $type?: string;
  $value?: unknown;
  [key: string]: unknown;
}
type TokenDocument = Record<string, unknown>;
type FlatToken = { path: string; type: DtcgType; value: unknown };
type DimensionValue = { value: number; unit: 'px' | 'rem' };
type DurationValue = { value: number; unit: 'ms' | 's' };
type ColorValue = { colorSpace: string; components: Array<number | string>; alpha?: number; hex?: string };
type ShadowValue = { color: unknown; offsetX: unknown; offsetY: unknown; blur: unknown; spread: unknown };
type TypographyValue = { fontFamily: unknown; fontSize: unknown; fontWeight: unknown; letterSpacing: unknown; lineHeight: unknown };

const root = process.cwd();
const sourcePaths = [
  resolve(root, 'tokens/design.tokens.json'),
  resolve(root, 'tokens/component.tokens.json'),
] as const;
const cssPath = resolve(root, 'override/core/tokens.generated.css');
const tsPath = resolve(root, 'override/core/tokens.generated.ts');
const documents = await Promise.all(sourcePaths.map(async (path) => JSON.parse(await readFile(path, 'utf8')) as TokenDocument));
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
    if (!isDtcgType(object.$type)) throw new Error(`$type DTCG desconocido: ${object.$type} en ${path.join('.')}`);
    type = object.$type;
  }
  if ('$value' in object) {
    if (!type) throw new Error(`Token sin $type resoluble: ${path.join('.')}`);
    const tokenPath = path.join('.');
    if (tokens.has(tokenPath)) throw new Error(`Token duplicado entre documentos: ${tokenPath}`);
    tokens.set(tokenPath, { path: tokenPath, type, value: object.$value });
    return;
  }
  for (const [key, value] of Object.entries(object)) {
    if (key.startsWith('$')) continue;
    visit(value, [...path, key], type);
  }
}

for (const document of documents) visit(document, []);

function aliasPath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = /^\{([^}]+)\}$/.exec(value);
  return match?.[1] ?? null;
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
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveValue(item, stack)]));
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
  if (!color || !Array.isArray(color.components) || color.components.length < 3) throw new Error('Color DTCG inválido');
  const alpha = color.alpha ?? 1;
  if (alpha === 1 && color.hex) return color.hex;
  if (color.colorSpace === 'srgb' && color.components.slice(0, 3).every((component) => typeof component === 'number')) {
    const channels = color.components.slice(0, 3).map((component) => Math.round((component as number) * 255));
    return `rgb(${channels.join(' ')} / ${alpha})`;
  }
  const components = color.components.join(' ');
  return `color(${color.colorSpace} ${components}${alpha === 1 ? '' : ` / ${alpha}`})`;
}

function formatDimension(value: unknown): string {
  const dimension = value as DimensionValue;
  return `${dimension.value}${dimension.unit}`;
}

function formatDuration(value: unknown): string {
  const duration = value as DurationValue;
  return `${duration.value}${duration.unit}`;
}

function formatCubicBezier(value: unknown): string {
  return `cubic-bezier(${(value as number[]).join(', ')})`;
}

function formatFontFamily(value: unknown): string {
  const values = Array.isArray(value) ? value as string[] : [String(value)];
  return values.map((part) => /\s/.test(part) ? `'${part.replace(/'/g, "\\'")}'` : part).join(', ');
}

function formatStrokeStyle(value: unknown): string {
  if (typeof value === 'string') return value;
  const style = value as { dashArray?: unknown[] };
  return style.dashArray?.length ? 'dashed' : 'solid';
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
        formatDimension(shadow.offsetX),
        formatDimension(shadow.offsetY),
        formatDimension(shadow.blur),
        formatDimension(shadow.spread),
        formatColor(shadow.color),
      ].join(' ')).join(', ');
    }
    case 'gradient': {
      const stops = value as Array<{ color: unknown; position: number }>;
      return stops.map((stop) => `${formatColor(stop.color)} ${stop.position * 100}%`).join(', ');
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
  const type = reference ? token(reference).type : source.type;
  return cssForType(type, resolved(path));
}

function numberValue(path: string): number {
  const source = token(path);
  const value = resolved(path);
  if (source.type === 'number' || source.type === 'fontWeight') return Number(value);
  if (source.type === 'dimension' || source.type === 'duration') return Number((value as { value: number }).value);
  throw new Error(`Token no numérico: ${path}`);
}

function durationMs(path: string): number {
  const value = resolved(path) as DurationValue;
  return value.unit === 's' ? value.value * 1000 : value.value;
}

function dimensionPx(path: string): number {
  const value = resolved(path) as DimensionValue;
  if (value.unit !== 'px') throw new Error(`Token ${path} usa ${value.unit}; no se puede exponer como dimensionPx sin conversión contextual.`);
  return value.value;
}

const cssName = (name: string): string => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
const tokenCssName = (path: string): string => `--sc-token-${path.split('.').map(cssName).join('-')}`;

function typographyVars(path: string, name: string): string[] {
  const value = resolved(path) as TypographyValue;
  return [
    `  --sc-type-${name}-font-family: ${formatFontFamily(value.fontFamily)};`,
    `  --sc-type-${name}-font-size: ${formatDimension(value.fontSize)};`,
    `  --sc-type-${name}-font-weight: ${String(value.fontWeight)};`,
    `  --sc-type-${name}-letter-spacing: ${formatDimension(value.letterSpacing)};`,
    `  --sc-type-${name}-line-height: ${String(value.lineHeight)};`,
  ];
}

const semanticColors = ['ink', 'heading', 'copy', 'muted', 'trait', 'surface', 'surfaceTransparent', 'surfaceRaised', 'border', 'borderStrong'] as const;
const durationNames = ['short1','short2','short3','short4','medium1','medium2','medium3','medium4','long1','long2','long3','long4','extraLong1','extraLong2','extraLong3','extraLong4'] as const;
const typographyNames = ['search', 'filter', 'modalTitle', 'modalBody', 'modalPrice', 'submenu'] as const;

function themeBlock(mode: 'light' | 'dark', indent = '  '): string {
  const borderMode = `border.${mode}`;
  return [
    ...semanticColors.map((name) => `${indent}--sc-color-${cssName(name)}: ${cssValue(`color.${mode}.${name}`)};`),
    `${indent}--sc-border-default: ${cssValue(`${borderMode}.default`)};`,
    `${indent}--sc-border-strong: ${cssValue(`${borderMode}.strong`)};`,
    `${indent}--sc-border-focus: ${cssValue(`${borderMode}.focus`)};`,
  ].join('\n');
}

const canonicalCss = [...tokens.keys()]
  .sort()
  .map((path) => `  ${tokenCssName(path)}: ${cssValue(path)};`)
  .join('\n');
const typographyCss = typographyNames.flatMap((name) => typographyVars(`typography.${name}`, cssName(name))).join('\n');
const css = `/* GENERATED from DTCG 2025.10 documents in tokens/*.tokens.json. Do not edit. */
:root {
${canonicalCss}
}

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
  --sc-z-raised: ${cssValue('number.zRaised')};
  --sc-z-theme-popover: ${cssValue('number.zThemePopover')};
  --sc-z-modal: ${cssValue('number.zModal')};
  --sc-content-max-width: ${cssValue('dimension.contentMaxWidth')};
  --sc-catalog-gutter: ${cssValue('dimension.catalogGutter')};
  --sc-catalog-inline-space: ${cssValue('dimension.catalogInlineSpace')};
  --sc-product-image-ratio: ${cssValue('number.productImageWidth')} / ${cssValue('number.productImageHeight')};
  --sc-overlay-modal: ${cssValue('color.palette.black32')};
  --sc-shadow-modal: ${cssValue('shadow.modal')};
  --sc-shadow-submenu: ${cssValue('shadow.submenu')};
  --sc-gradient-sticky-shadow-stops: ${cssValue('gradient.stickyShadow')};
  --sc-opacity-trait-icon: ${cssValue('number.opacityTraitIcon')};
  --sc-opacity-placeholder: ${cssValue('number.opacityPlaceholder')};
  --sc-opacity-sticky-desktop: ${cssValue('number.opacityStickyDesktop')};
  --sc-opacity-sticky-mobile: ${cssValue('number.opacityStickyMobile')};
  --sc-scale-pressed: ${cssValue('number.scalePressed')};
  --sc-scale-submenu-pressed: ${cssValue('number.scaleSubmenuPressed')};
${durationNames.map((name) => `  --sc-motion-${cssName(name)}: ${cssValue(`motion.duration.${name}`)};`).join('\n')}
  --sc-motion-ease-standard: ${cssValue('motion.easing.standard')};
  --sc-motion-ease-accelerate: ${cssValue('motion.easing.accelerate')};
  --sc-motion-ease-decelerate: ${cssValue('motion.easing.decelerate')};
  --sc-motion-ease-linear: ${cssValue('motion.easing.linear')};
  --sc-transition-fast: ${cssValue('motion.transition.fast')};
  --sc-transition-standard: ${cssValue('motion.transition.standard')};
  --sc-transition-icon: ${cssValue('motion.transition.icon')};
  --sc-transition-theme: ${cssValue('motion.transition.theme')};
${typographyCss}
  --sc-focus-ring-color: var(--sc-color-ink);
  --sc-motion-ease-out: var(--sc-motion-ease-decelerate);
  --sc-motion-fast: var(--sc-motion-short3);
  --sc-motion-theme: var(--sc-motion-long3);
  --sc-motion-icon: var(--sc-motion-short4);
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

const durationObject = Object.fromEntries(durationNames.map((name) => [name, durationMs(`motion.duration.${name}`) / 1000]));
const easingObject = Object.fromEntries(['standard','accelerate','decelerate','linear'].map((name) => [name, cssValue(`motion.easing.${name}`)]));
const spring = (path: string) => ({ stiffness: numberValue(`${path}.stiffness`), damping: numberValue(`${path}.damping`) });
const runtimeDurations = Object.fromEntries([...tokens.values()].filter((entry) => entry.type === 'duration').map((entry) => [entry.path, durationMs(entry.path)]));
const runtimeDimensions = Object.fromEntries([...tokens.values()].filter((entry) => entry.type === 'dimension').map((entry) => [entry.path, dimensionPx(entry.path)]));
const runtimeNumbers = Object.fromEntries([...tokens.values()].filter((entry) => entry.type === 'number' || entry.type === 'fontWeight').map((entry) => [entry.path, numberValue(entry.path)]));
const runtimeColors = Object.fromEntries([...tokens.values()].filter((entry) => entry.type === 'color').map((entry) => [entry.path, cssValue(entry.path)]));
const runtimeEasings = Object.fromEntries([...tokens.values()].filter((entry) => entry.type === 'cubicBezier').map((entry) => [entry.path, cssValue(entry.path)]));

const ts = `/* GENERATED from DTCG 2025.10 documents in tokens/*.tokens.json. Do not edit. */
export const tokenMedia = Object.freeze({
  phone: '(max-width: ${cssValue('dimension.breakpointPhone')})',
  mobile: '(max-width: ${cssValue('dimension.breakpointMobile')})',
  tablet: '(min-width: ${cssValue('dimension.breakpointTabletMin')}) and (max-width: ${cssValue('dimension.breakpointTabletMax')})',
  compact: '(max-width: ${cssValue('dimension.breakpointTabletMax')})',
  compactWide: '(min-width: ${numberValue('dimension.breakpointPhone') + 1}px) and (max-width: ${cssValue('dimension.breakpointTabletMax')})',
  desktop: '(min-width: ${cssValue('dimension.breakpointDesktop')})',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  reducedTransparency: '(prefers-reduced-transparency: reduce)',
  moreContrast: '(prefers-contrast: more)',
  forcedColors: '(forced-colors: active)',
} as const);

export const tokenMotion = Object.freeze({
  geometryRefreshDelay: ${durationMs('motion.duration.geometryRefreshDelay')},
  durations: Object.freeze(${JSON.stringify(durationObject, null, 2)}),
  springs: Object.freeze({
    spatial: Object.freeze({ fast: Object.freeze(${JSON.stringify(spring('motion.spring.spatial.fast'))}), default: Object.freeze(${JSON.stringify(spring('motion.spring.spatial.default'))}), slow: Object.freeze(${JSON.stringify(spring('motion.spring.spatial.slow'))}) }),
    effects: Object.freeze({ fast: Object.freeze(${JSON.stringify(spring('motion.spring.effects.fast'))}), default: Object.freeze(${JSON.stringify(spring('motion.spring.effects.default'))}), slow: Object.freeze(${JSON.stringify(spring('motion.spring.effects.slow'))}) }),
    indicator: Object.freeze({ soft: Object.freeze(${JSON.stringify(spring('motion.spring.indicator.soft'))}), firm: Object.freeze(${JSON.stringify(spring('motion.spring.indicator.firm'))}) }),
    focus: Object.freeze(${JSON.stringify(spring('motion.spring.focus'))}),
  }),
  cssEasings: Object.freeze(${JSON.stringify(easingObject, null, 2)}),
  transitions: Object.freeze({
    fast: ${JSON.stringify(cssValue('motion.transition.fast'))},
    standard: ${JSON.stringify(cssValue('motion.transition.standard'))},
    icon: ${JSON.stringify(cssValue('motion.transition.icon'))},
    theme: ${JSON.stringify(cssValue('motion.transition.theme'))},
  }),
} as const);

export const tokenRuntime = Object.freeze({
  durationMs: Object.freeze(${JSON.stringify(runtimeDurations, null, 2)}),
  dimensionPx: Object.freeze(${JSON.stringify(runtimeDimensions, null, 2)}),
  number: Object.freeze(${JSON.stringify(runtimeNumbers, null, 2)}),
  color: Object.freeze(${JSON.stringify(runtimeColors, null, 2)}),
  easing: Object.freeze(${JSON.stringify(runtimeEasings, null, 2)}),
} as const);

export const tokenTypes = Object.freeze(${JSON.stringify(DTCG_TYPES)} as const);
`;

await Promise.all([writeFile(cssPath, css), writeFile(tsPath, ts)]);
const usedTypes = [...new Set([...tokens.values()].map((entry) => entry.type))].sort();
const missingTypes = DTCG_TYPES.filter((type) => !usedTypes.includes(type));
if (missingTypes.length) throw new Error(`Tipos DTCG no representados: ${missingTypes.join(', ')}`);
console.log(`[design-tokens] ${tokens.size} tokens across ${sourcePaths.length} DTCG documents; DTCG types ${usedTypes.length}/${DTCG_TYPES.length} -> CSS + TypeScript`);
