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
      throw new Error(`Unsupported token type: ${object.$type} at ${path.join('.') || '<root>'}`);
    }
    type = object.$type;
  }
  if ('$value' in object) {
    if (!type) throw new Error(`Token without a resolvable type: ${path.join('.')}`);
    const tokenPath = path.join('.');
    if (tokens.has(tokenPath)) throw new Error(`Duplicate token: ${tokenPath}`);
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
    if (stack.includes(reference)) throw new Error(`Alias cycle: ${[...stack, reference].join(' -> ')}`);
    const target = tokens.get(reference);
    if (!target) throw new Error(`Alias points to a missing token: ${reference}`);
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
  if (!found) throw new Error(`Missing token: ${path}`);
  return found;
}

function resolved(path: string): unknown {
  return resolveValue(token(path).value, [path]);
}

function formatColor(value: unknown): string {
  const color = value as ColorValue;
  if (!color || !Array.isArray(color.components) || color.components.length < 3) {
    throw new Error(`Invalid color token: ${JSON.stringify(value)}`);
  }
  const alpha = color.alpha ?? 1;
  if (color.colorSpace === 'srgb' && color.components.slice(0, 3).every((component) => typeof component === 'number')) {
    const channels = color.components.slice(0, 3).map((component) => Math.round((component as number) * 255));
    return alpha === 1 ? `rgb(${channels.join(' ')})` : `rgb(${channels.join(' ')} / ${alpha})`;
  }
  return `color(${color.colorSpace} ${color.components.join(' ')}${alpha === 1 ? '' : ` / ${alpha}`})`;
}

function formatDimension(value: unknown): string {
  const dimension = value as DimensionValue;
  if (!dimension || typeof dimension.value !== 'number' || !['px', 'rem'].includes(dimension.unit)) {
    throw new Error(`Invalid dimension token: ${JSON.stringify(value)}`);
  }
  return `${dimension.value}${dimension.unit}`;
}

function formatDuration(value: unknown): string {
  const duration = value as DurationValue;
  if (!duration || typeof duration.value !== 'number' || !['ms', 's'].includes(duration.unit)) {
    throw new Error(`Invalid duration token: ${JSON.stringify(value)}`);
  }
  return `${duration.value}${duration.unit}`;
}

function durationMilliseconds(path: string): number {
  const duration = resolved(path) as DurationValue;
  return duration.unit === 's' ? duration.value * 1000 : duration.value;
}

function formatCubicBezier(value: unknown): string {
  const points = value as number[];
  if (!Array.isArray(points) || points.length !== 4) throw new Error(`Invalid cubicBezier token: ${JSON.stringify(value)}`);
  return `cubic-bezier(${points.join(', ')})`;
}

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
      return (value as Array<{ color: unknown; position: number }>).map(
        (stop) => `${formatColor(stop.color)} ${stop.position * 100}%`,
      ).join(', ');
    }
    case 'typography': {
      const typography = value as TypographyValue;
      return `${String(typography.fontWeight)} ${formatDimension(typography.fontSize)}/${String(typography.lineHeight)} ${formatFontFamily(typography.fontFamily)}`;
    }
  }
}

function cssValue(path: string): string {
  return cssForType(token(path).type, resolved(path));
}

function numberValue(path: string): number {
  const value = resolved(path);
  if (typeof value !== 'number') throw new Error(`Expected number token at ${path}`);
  return value;
}

function dimensionNumber(path: string): number {
  const value = resolved(path) as DimensionValue;
  if (value.unit !== 'px') throw new Error(`Expected px dimension at ${path}`);
  return value.value;
}

function typographyProperties(path: string): Record<string, string | number> {
  const value = resolved(path) as TypographyValue;
  return {
    fontFamily: formatFontFamily(value.fontFamily),
    fontSize: formatDimension(value.fontSize),
    fontWeight: Number(value.fontWeight),
    lineHeight: Number(value.lineHeight),
    letterSpacing: formatDimension(value.letterSpacing),
  };
}

function typographyBlock(path: string, cssRole: string, indent = '  '): string {
  const value = typographyProperties(path);
  return [
    `${indent}--sc-typography-${cssRole}-font-family: ${value.fontFamily};`,
    `${indent}--sc-typography-${cssRole}-font-size: ${value.fontSize};`,
    `${indent}--sc-typography-${cssRole}-font-weight: ${value.fontWeight};`,
    `${indent}--sc-typography-${cssRole}-line-height: ${value.lineHeight};`,
    `${indent}--sc-typography-${cssRole}-letter-spacing: ${value.letterSpacing};`,
  ].join('\n');
}

const semanticColors = [
  'ink', 'heading', 'copy', 'muted', 'trait', 'surface',
  'surfaceTransparent', 'surfaceRaised', 'border', 'borderStrong',
] as const;
const durationNames = [
  'short1', 'short2', 'short3', 'short4', 'medium1', 'medium2', 'medium3', 'medium4',
  'long1', 'long2', 'long3', 'long4', 'extraLong1', 'extraLong2', 'extraLong3', 'extraLong4',
] as const;
const easingNames = ['standard', 'accelerate', 'decelerate', 'linear'] as const;
const transitionNames = ['fast', 'standard', 'icon', 'theme'] as const;
const shapeNames = ['none', 'extraSmall', 'menu', 'control', 'card', 'dialog', 'button', 'full'] as const;
const spacingNames = [
  'extraSmall', 'small', 'medium', 'large', 'extraLarge', 'doubleExtraLarge', 'tripleExtraLarge', 'quadExtraLarge',
] as const;
const typographyEntries = [
  ['heading1.desktop', 'heading-1'], ['heading2', 'heading-2'], ['heading3.desktop', 'heading-3'],
  ['heading4', 'heading-4'], ['bodyLarge', 'body-large'], ['body', 'body'], ['bodySmall', 'body-small'],
  ['label', 'label'], ['labelStrong', 'label-strong'], ['price', 'price'], ['priceLarge', 'price-large'],
] as const;

const cssName = (name: string): string => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

function themeBlock(mode: 'light' | 'dark', indent = '  '): string {
  return [
    ...semanticColors.map((name) => `${indent}--sc-color-${cssName(name)}: ${cssValue(`system.color.${mode}.${name}`)};`),
    `${indent}--sc-focus-ring-color: ${cssValue(`system.color.${mode}.focusRing`)};`,
    `${indent}--sc-border-default: ${cssValue(`system.border.${mode}.default`)};`,
    `${indent}--sc-border-strong: ${cssValue(`system.border.${mode}.strong`)};`,
    `${indent}--sc-border-focus: ${cssValue(`system.border.${mode}.focus`)};`,
  ].join('\n');
}

const tabletMax = cssValue('system.layout.breakpointTabletMax');
const phoneMax = cssValue('system.layout.breakpointPhone');
const desktopMin = cssValue('system.layout.breakpointDesktop');
const narrowMax = cssValue('system.layout.breakpointContentNarrow');

const css = `/* GENERATED from tokens/design.tokens.json. Do not edit manually. */
:root {
  --sc-font-primary: ${cssValue('system.fontFamily.primary')};
  --sc-font-weight-regular: ${cssValue('system.fontWeight.regular')};
  --sc-font-weight-semibold: ${cssValue('system.fontWeight.semibold')};
  --sc-color-scrim: ${cssValue('system.color.scrim')};
  --sc-border-hairline: ${cssValue('system.stroke.hairline')};
  --sc-focus-ring-width: ${cssValue('system.stroke.focus')};
  --sc-focus-ring-width-subtle: ${cssValue('system.stroke.focusSubtle')};
  --sc-focus-ring-offset: ${cssValue('system.stroke.focusOffset')};
  --sc-focus-ring-offset-tight: ${cssValue('system.stroke.focusOffsetTight')};
  --sc-touch-target: ${cssValue('system.size.touchTarget')};
  --sc-icon-size: ${cssValue('system.size.icon')};
  --sc-content-max-width: ${cssValue('system.layout.contentMaxWidth')};
  --sc-layout-grid-gutter: ${cssValue('system.layout.gridGutter.desktop')};
  --sc-media-product-aspect-ratio: ${cssValue('system.media.aspectRatio.product')};
  --sc-layer-raised: ${cssValue('system.layer.raised')};
  --sc-layer-sticky: ${cssValue('system.layer.sticky')};
  --sc-layer-popover: ${cssValue('system.layer.popover')};
  --sc-layer-mobile-menu: ${cssValue('system.layer.mobileMenu')};
  --sc-layer-mobile-panel: ${cssValue('system.layer.mobilePanel')};
  --sc-layer-modal: ${cssValue('system.layer.modal')};
  --sc-state-opacity-disabled: ${cssValue('system.state.opacity.disabled')};
  --sc-state-opacity-muted: ${cssValue('system.state.opacity.muted')};
  --sc-state-opacity-placeholder: ${cssValue('system.state.opacity.placeholder')};
  --sc-elevation-menu: ${cssValue('system.elevation.menu')};
  --sc-elevation-popover: ${cssValue('system.elevation.popover')};
  --sc-elevation-dialog: ${cssValue('system.elevation.dialog')};
${shapeNames.map((name) => `  --sc-shape-${cssName(name)}: ${cssValue(`system.shape.${name}`)};`).join('\n')}
${spacingNames.map((name) => `  --sc-space-${cssName(name)}: ${cssValue(`system.spacing.${name}`)};`).join('\n')}
${durationNames.map((name) => `  --sc-motion-${cssName(name)}: ${cssValue(`system.motion.duration.${name}`)};`).join('\n')}
${easingNames.map((name) => `  --sc-motion-ease-${cssName(name)}: ${cssValue(`system.motion.easing.${name}`)};`).join('\n')}
${transitionNames.map((name) => `  --sc-transition-${cssName(name)}: ${cssValue(`system.motion.transition.${name}`)};`).join('\n')}
  --sc-motion-fast: var(--sc-motion-short3);
  --sc-motion-icon: var(--sc-motion-short4);
  --sc-motion-theme: var(--sc-motion-long3);
  --sc-motion-ease-out: var(--sc-motion-ease-decelerate);
${typographyEntries.map(([path, role]) => typographyBlock(`system.typography.${path}`, role)).join('\n')}
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
  :root { --sc-layout-grid-gutter: ${cssValue('system.layout.gridGutter.narrow')}; }
}

@media (min-width: ${dimensionNumber('system.layout.breakpointPhone') + 1}px) and (max-width: ${tabletMax}) {
  :root {
    --sc-layout-grid-gutter: ${cssValue('system.layout.gridGutter.compact')};
${typographyBlock('system.typography.heading1.tablet', 'heading-1', '    ')}
${typographyBlock('system.typography.heading3.tablet', 'heading-3', '    ')}
  }
}

@media (max-width: ${phoneMax}) {
  :root {
    --sc-layout-grid-gutter: ${cssValue('system.layout.gridGutter.mobile')};
${typographyBlock('system.typography.heading1.mobile', 'heading-1', '    ')}
${typographyBlock('system.typography.heading3.mobile', 'heading-3', '    ')}
  }
}
`;

const compactWideMin = dimensionNumber('system.layout.breakpointPhone') + 1;
const durationMs = Object.fromEntries(durationNames.map((name) => [name, durationMilliseconds(`system.motion.duration.${name}`)]));
const durations = Object.fromEntries(Object.entries(durationMs).map(([name, milliseconds]) => [name, milliseconds / 1000]));
const curves = Object.fromEntries(easingNames.map((name) => [name, resolved(`system.motion.easing.${name}`)]));
const cssEasings = Object.fromEntries(easingNames.map((name) => [name, cssValue(`system.motion.easing.${name}`)]));
const transitions = Object.fromEntries(transitionNames.map((name) => [name, cssValue(`system.motion.transition.${name}`)]));
const springs = {
  spatial: {
    fast: { stiffness: numberValue('system.motion.spring.spatial.fast.stiffness'), damping: numberValue('system.motion.spring.spatial.fast.damping') },
    default: { stiffness: numberValue('system.motion.spring.spatial.default.stiffness'), damping: numberValue('system.motion.spring.spatial.default.damping') },
    slow: { stiffness: numberValue('system.motion.spring.spatial.slow.stiffness'), damping: numberValue('system.motion.spring.spatial.slow.damping') },
  },
  effects: {
    fast: { stiffness: numberValue('system.motion.spring.effects.fast.stiffness'), damping: numberValue('system.motion.spring.effects.fast.damping') },
    default: { stiffness: numberValue('system.motion.spring.effects.default.stiffness'), damping: numberValue('system.motion.spring.effects.default.damping') },
    slow: { stiffness: numberValue('system.motion.spring.effects.slow.stiffness'), damping: numberValue('system.motion.spring.effects.slow.damping') },
  },
  indicator: {
    soft: { stiffness: numberValue('system.motion.spring.indicator.soft.stiffness'), damping: numberValue('system.motion.spring.indicator.soft.damping') },
    firm: { stiffness: numberValue('system.motion.spring.indicator.firm.stiffness'), damping: numberValue('system.motion.spring.indicator.firm.damping') },
  },
  focus: { stiffness: numberValue('system.motion.spring.focus.stiffness'), damping: numberValue('system.motion.spring.focus.damping') },
};

const typographyObject = Object.fromEntries([
  ['heading1Desktop', typographyProperties('system.typography.heading1.desktop')],
  ['heading1Tablet', typographyProperties('system.typography.heading1.tablet')],
  ['heading1Mobile', typographyProperties('system.typography.heading1.mobile')],
  ['heading2', typographyProperties('system.typography.heading2')],
  ['heading3Desktop', typographyProperties('system.typography.heading3.desktop')],
  ['heading3Tablet', typographyProperties('system.typography.heading3.tablet')],
  ['heading3Mobile', typographyProperties('system.typography.heading3.mobile')],
  ['heading4', typographyProperties('system.typography.heading4')],
  ['bodyLarge', typographyProperties('system.typography.bodyLarge')],
  ['body', typographyProperties('system.typography.body')],
  ['bodySmall', typographyProperties('system.typography.bodySmall')],
  ['label', typographyProperties('system.typography.label')],
  ['labelStrong', typographyProperties('system.typography.labelStrong')],
  ['price', typographyProperties('system.typography.price')],
  ['priceLarge', typographyProperties('system.typography.priceLarge')],
]);

const systemTokenObject = {
  color: {
    light: Object.fromEntries([...semanticColors, 'focusRing'].map((name) => [name, cssValue(`system.color.light.${name}`)])),
    dark: Object.fromEntries([...semanticColors, 'focusRing'].map((name) => [name, cssValue(`system.color.dark.${name}`)])),
    scrim: cssValue('system.color.scrim'),
  },
  typography: typographyObject,
  shape: Object.fromEntries(shapeNames.map((name) => [name, cssValue(`system.shape.${name}`)])),
  spacing: Object.fromEntries(spacingNames.map((name) => [name, cssValue(`system.spacing.${name}`)])),
  state: { opacity: {
    disabled: numberValue('system.state.opacity.disabled'),
    muted: numberValue('system.state.opacity.muted'),
    placeholder: numberValue('system.state.opacity.placeholder'),
  } },
  layer: {
    raised: numberValue('system.layer.raised'), sticky: numberValue('system.layer.sticky'),
    popover: numberValue('system.layer.popover'), mobileMenu: numberValue('system.layer.mobileMenu'),
    mobilePanel: numberValue('system.layer.mobilePanel'), modal: numberValue('system.layer.modal'),
  },
  media: { productAspectRatio: numberValue('system.media.aspectRatio.product') },
  motion: { durationMs, durations, curves, cssEasings, transitions, springs },
};

const ts = `/* GENERATED from tokens/design.tokens.json. Do not edit manually. */
export const tokenMedia = Object.freeze({
  phone: '(max-width: ${cssValue('system.layout.breakpointPhone')})',
  mobile: '(max-width: ${cssValue('system.layout.breakpointMobile')})',
  tablet: '(min-width: ${cssValue('system.layout.breakpointTabletMin')}) and (max-width: ${cssValue('system.layout.breakpointTabletMax')})',
  compact: '(max-width: ${cssValue('system.layout.breakpointTabletMax')})',
  compactWide: '(min-width: ${compactWideMin}px) and (max-width: ${cssValue('system.layout.breakpointTabletMax')})',
  desktop: '(min-width: ${cssValue('system.layout.breakpointDesktop')})',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  reducedTransparency: '(prefers-reduced-transparency: reduce)',
  moreContrast: '(prefers-contrast: more)',
  forcedColors: '(forced-colors: active)',
} as const);

export const systemTokens = Object.freeze(${JSON.stringify(systemTokenObject, null, 2)} as const);
`;

await Promise.all([writeFile(cssPath, css), writeFile(tsPath, ts)]);
const usedTypes = [...new Set([...tokens.values()].map((entry) => entry.type))].sort();
console.log(`[design-tokens] ${tokens.size} tokens; types: ${usedTypes.join(', ')}; generated CSS + TypeScript system API`);
