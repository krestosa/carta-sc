import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

interface TokenNode {
  $type?: string;
  $value?: unknown;
  [key: string]: unknown;
}

type TokenDocument = Record<string, unknown>;
type FlatToken = { path: string; type: string; value: unknown };

const root = process.cwd();
const sourcePath = resolve(root, 'tokens/design.tokens.json');
const cssPath = resolve(root, 'override/core/tokens.generated.css');
const tsPath = resolve(root, 'override/core/tokens.generated.ts');

const document = JSON.parse(await readFile(sourcePath, 'utf8')) as TokenDocument;
const tokens = new Map<string, FlatToken>();

function visit(node: unknown, path: string[], inheritedType?: string): void {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return;
  const object = node as TokenNode;
  const type = typeof object.$type === 'string' ? object.$type : inheritedType;
  if ('$value' in object) {
    if (!type) throw new Error(`Token sin $type resoluble: ${path.join('.')}`);
    tokens.set(path.join('.'), { path: path.join('.'), type, value: object.$value });
    return;
  }
  for (const [key, value] of Object.entries(object)) {
    if (key.startsWith('$')) continue;
    visit(value, [...path, key], type);
  }
}

visit(document, []);

function resolveToken(path: string, stack: string[] = []): FlatToken {
  const token = tokens.get(path);
  if (!token) throw new Error(`Alias a token inexistente: ${path}`);
  if (stack.includes(path)) throw new Error(`Ciclo de aliases: ${[...stack, path].join(' -> ')}`);
  if (typeof token.value === 'string') {
    const match = token.value.match(/^\{([^}]+)\}$/);
    if (match) return resolveToken(match[1], [...stack, path]);
  }
  return token;
}

function cssValue(path: string): string {
  const token = resolveToken(path);
  switch (token.type) {
    case 'color': {
      const value = token.value as { hex?: string };
      if (!value?.hex) throw new Error(`Color sin hex fallback: ${path}`);
      return value.hex;
    }
    case 'dimension':
    case 'duration': {
      const value = token.value as { value: number; unit: string };
      return `${value.value}${value.unit}`;
    }
    case 'number': return String(token.value);
    case 'fontFamily': return (token.value as string[]).map((part) => /\s/.test(part) ? `'${part}'` : part).join(', ');
    case 'cubicBezier': return `cubic-bezier(${(token.value as number[]).join(', ')})`;
    default: throw new Error(`Tipo no soportado para CSS: ${token.type} (${path})`);
  }
}

function numberValue(path: string): number {
  const token = resolveToken(path);
  if (token.type === 'number') return token.value as number;
  if (token.type === 'dimension' || token.type === 'duration') return (token.value as { value: number }).value;
  throw new Error(`Token no numérico: ${path}`);
}

const lightColors = ['ink', 'heading', 'copy', 'muted', 'trait', 'surface', 'surfaceRaised', 'border', 'borderStrong'] as const;
const cssName = (name: string) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

const css = `/* GENERATED from tokens/design.tokens.json (DTCG 2025.10). Do not edit manually. */
:root,
html[data-sc-theme-resolved='light'] {
${lightColors.map((name) => `  --sc-color-${cssName(name)}: ${cssValue(`color.light.${name}`)};`).join('\n')}
  --sc-color-surface-transparent: rgba(245,245,245,0);
  --sc-font-primary: ${cssValue('font.family.primary')};
  --sc-font-weight-regular: ${cssValue('font.weight.regular')};
  --sc-font-weight-semibold: ${cssValue('font.weight.semibold')};
  --sc-border-hairline: ${cssValue('size.borderHairline')};
  --sc-focus-ring-width: ${cssValue('size.focusRing')};
  --sc-focus-ring-width-subtle: ${cssValue('size.focusRingSubtle')};
  --sc-focus-ring-offset: ${cssValue('size.focusOffset')};
  --sc-focus-ring-offset-tight: ${cssValue('size.focusOffsetTight')};
  --sc-touch-target: ${cssValue('size.touchTarget')};
  --sc-z-raised: ${cssValue('zIndex.raised')};
  --sc-z-theme-popover: ${cssValue('zIndex.themePopover')};
  --sc-content-max-width: ${cssValue('size.contentMaxWidth')};
  --sc-catalog-gutter: ${cssValue('size.catalogGutter')};
  --sc-catalog-inline-space: ${cssValue('size.catalogInlineSpace')};
  --sc-product-image-ratio: ${cssValue('ratio.productImageWidth')} / ${cssValue('ratio.productImageHeight')};
${['short1','short2','short3','short4','medium1','medium2','medium3','medium4','long1','long2','long3','long4','extraLong1','extraLong2','extraLong3','extraLong4'].map((name) => `  --sc-motion-${cssName(name)}: ${cssValue(`motion.duration.${name}`)};`).join('\n')}
  --sc-motion-ease-standard: ${cssValue('motion.easing.standard')};
  --sc-motion-ease-accelerate: ${cssValue('motion.easing.accelerate')};
  --sc-motion-ease-decelerate: ${cssValue('motion.easing.decelerate')};
  --sc-motion-ease-linear: ${cssValue('motion.easing.linear')};
  --sc-focus-ring-color: var(--sc-color-ink);
  --sc-motion-ease-out: var(--sc-motion-ease-decelerate);
  --sc-motion-fast: var(--sc-motion-short3);
  --sc-motion-theme: var(--sc-motion-long3);
  --sc-motion-icon: var(--sc-motion-short4);
}

html[data-sc-theme-resolved='dark'] {
${lightColors.map((name) => `  --sc-color-${cssName(name)}: ${cssValue(`color.dark.${name}`)};`).join('\n')}
  --sc-color-surface-transparent: rgba(10,10,10,0);
}

@media (prefers-color-scheme: light) {
  html[data-sc-theme='system'] {
${lightColors.map((name) => `    --sc-color-${cssName(name)}: ${cssValue(`color.light.${name}`)};`).join('\n')}
    --sc-color-surface-transparent: rgba(245,245,245,0);
  }
}

@media (prefers-color-scheme: dark) {
  html[data-sc-theme='system'] {
${lightColors.map((name) => `    --sc-color-${cssName(name)}: ${cssValue(`color.dark.${name}`)};`).join('\n')}
    --sc-color-surface-transparent: rgba(10,10,10,0);
  }
}
`;

const durationNames = ['short1','short2','short3','short4','medium1','medium2','medium3','medium4','long1','long2','long3','long4','extraLong1','extraLong2','extraLong3','extraLong4'] as const;
const durationObject = Object.fromEntries(durationNames.map((name) => [name, numberValue(`motion.duration.${name}`) / 1000]));
const easingObject = Object.fromEntries(['standard','accelerate','decelerate','linear'].map((name) => [name, cssValue(`motion.easing.${name}`)]));
const spring = (path: string) => ({ stiffness: numberValue(`${path}.stiffness`), damping: numberValue(`${path}.damping`) });

const ts = `/* GENERATED from tokens/design.tokens.json (DTCG 2025.10). Do not edit manually. */
export const tokenMedia = Object.freeze({
  phone: '(max-width: ${cssValue('size.breakpointPhone')})',
  mobile: '(max-width: ${cssValue('size.breakpointMobile')})',
  tablet: '(min-width: ${cssValue('size.breakpointTabletMin')}) and (max-width: ${cssValue('size.breakpointTabletMax')})',
  compact: '(max-width: ${cssValue('size.breakpointTabletMax')})',
  compactWide: '(min-width: ${numberValue('size.breakpointPhone') + 1}px) and (max-width: ${cssValue('size.breakpointTabletMax')})',
  desktop: '(min-width: ${cssValue('size.breakpointDesktop')})',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  reducedTransparency: '(prefers-reduced-transparency: reduce)',
  moreContrast: '(prefers-contrast: more)',
  forcedColors: '(forced-colors: active)',
} as const);

export const tokenMotion = Object.freeze({
  geometryRefreshDelay: ${numberValue('motion.duration.geometryRefreshDelay')},
  durations: Object.freeze(${JSON.stringify(durationObject, null, 2)}),
  springs: Object.freeze({
    spatial: Object.freeze({ fast: Object.freeze(${JSON.stringify(spring('motion.spring.spatial.fast'))}), default: Object.freeze(${JSON.stringify(spring('motion.spring.spatial.default'))}), slow: Object.freeze(${JSON.stringify(spring('motion.spring.spatial.slow'))}) }),
    effects: Object.freeze({ fast: Object.freeze(${JSON.stringify(spring('motion.spring.effects.fast'))}), default: Object.freeze(${JSON.stringify(spring('motion.spring.effects.default'))}), slow: Object.freeze(${JSON.stringify(spring('motion.spring.effects.slow'))}) }),
    indicator: Object.freeze({ soft: Object.freeze(${JSON.stringify(spring('motion.spring.indicator.soft'))}), firm: Object.freeze(${JSON.stringify(spring('motion.spring.indicator.firm'))}) }),
    focus: Object.freeze(${JSON.stringify(spring('motion.spring.focus'))}),
  }),
  cssEasings: Object.freeze(${JSON.stringify(easingObject, null, 2)}),
} as const);
`;

await Promise.all([writeFile(cssPath, css), writeFile(tsPath, ts)]);
console.log(`[design-tokens] ${tokens.size} tokens -> ${cssPath}, ${tsPath}`);
