// Documenta la tarea validate design system contract utilizada por la compilación, auditoría o comprobación del proyecto.
import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

interface TokenNode { readonly $value?: unknown; readonly [key: string]: unknown }

const root = process.cwd();
const tokenPath = resolve(root, 'tokens/design.tokens.json');
const generatedCssPath = resolve(root, 'override/core/tokens.generated.css');
const generatedTsPath = resolve(root, 'override/core/tokens.generated.ts');
const variablesPath = resolve(root, 'override/core/variables.ts');
const baseCssPath = resolve(root, 'override/components/base/base.css');
const layoutCssPath = resolve(root, 'override/core/layout-primitives.css');
const guidePath = resolve(root, 'DESIGN_SYSTEM.md');
const tokenGuidePath = resolve(root, 'tokens/README.md');
const browserTypesPath = resolve(root, 'types/browser.d.ts');

const document = JSON.parse(await readFile(tokenPath, 'utf8')) as TokenNode;
const errors: string[] = [];

function tokenNode(path: string): TokenNode | null {
  let current: unknown = document;
  for (const part of path.split('.')) {
    if (!current || typeof current !== 'object' || Array.isArray(current) || !(part in current)) return null;
    current = (current as Record<string, unknown>)[part];
  }
  return current && typeof current === 'object' && !Array.isArray(current) ? current as TokenNode : null;
}

function requireToken(path: string): void {
  const node = tokenNode(path);
  if (!node || !('$value' in node)) errors.push(`missing token ${path}`);
}

async function requireFile(path: string): Promise<void> {
  try { await stat(path); } catch { errors.push(`missing file ${relative(root, path)}`); }
}

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  }))).flat();
}

const referenceSpacingValues = [4, 8, 12, 16, 20, 24, 28, 32, 48, 64, 80, 96] as const;
const systemSpacingNames = [
  'extraSmall', 'small', 'medium', 'large', 'extraLarge',
  'doubleExtraLarge', 'tripleExtraLarge', 'quadExtraLarge',
] as const;
const sectionGapNames = ['compact', 'default', 'spacious', 'expanded', 'immersive'] as const;

for (const value of referenceSpacingValues) requireToken(`reference.spacing.space${value}`);
for (const name of systemSpacingNames) requireToken(`system.spacing.${name}`);
for (const name of sectionGapNames) requireToken(`system.layout.sectionGap.${name}`);

const referenceSpacing = tokenNode('reference.spacing');
if (referenceSpacing) {
  const actualNames = Object.keys(referenceSpacing).filter((name) => !name.startsWith('$')).sort();
  const expectedNames = referenceSpacingValues.map((value) => `space${value}`).sort();
  if (actualNames.join('|') !== expectedNames.join('|')) {
    errors.push(`reference.spacing must contain only the curated 4px primitives: ${expectedNames.join(', ')}`);
  }
  for (const value of referenceSpacingValues) {
    const node = referenceSpacing[`space${value}`] as TokenNode | undefined;
    const dimension = node?.$value as { readonly value?: unknown; readonly unit?: unknown } | undefined;
    if (!dimension || dimension.value !== value || dimension.unit !== 'px' || value % 4 !== 0) {
      errors.push(`reference.spacing.space${value} must be the ${value}px 4px-grid primitive`);
    }
  }
}

for (const mode of ['light', 'dark']) {
  for (const path of [
    'brand.primary', 'brand.onPrimary',
    'text.primary', 'text.heading', 'text.secondary', 'text.muted', 'text.subtle', 'text.disabled', 'text.inverse', 'text.link',
    'icon.primary', 'icon.secondary', 'icon.muted', 'icon.subtle', 'icon.inverse',
    'surface.canvas', 'surface.subtle', 'surface.raised', 'surface.overlay', 'surface.inverse', 'surface.transparent',
    'border.subtle', 'border.default', 'border.strong', 'border.focus',
    'action.primary', 'action.onPrimary', 'action.selected', 'action.disabled',
  ]) requireToken(`system.color.${mode}.${path}`);
  for (const kind of ['error', 'success', 'warning', 'info']) {
    for (const part of ['default', 'surface', 'border', 'on']) requireToken(`system.color.${mode}.feedback.${kind}.${part}`);
  }
}

for (const path of [
  'system.layout.container.wide', 'system.layout.container.content', 'system.layout.container.narrow', 'system.layout.container.text',
  'system.layout.breakpoint.narrowMax', 'system.layout.breakpoint.compactMax', 'system.layout.breakpoint.mediumMin',
  'system.layout.breakpoint.mediumMax', 'system.layout.breakpoint.wideMin', 'system.layout.breakpoint.contentNarrowMax',
  'system.layout.pageGutter.wide', 'system.layout.pageGutter.contentNarrow', 'system.layout.pageGutter.medium', 'system.layout.pageGutter.narrow',
  'system.layout.gridGap.wide', 'system.layout.gridGap.contentNarrow', 'system.layout.gridGap.medium', 'system.layout.gridGap.narrow',
  'system.layout.sectionGap.compact', 'system.layout.sectionGap.default', 'system.layout.sectionGap.spacious',
  'system.size.icon.small', 'system.size.icon.medium', 'system.size.icon.large',
  'system.size.control.small', 'system.size.control.medium', 'system.size.control.large',
  'system.layer.base', 'system.layer.sticky', 'system.layer.dropdown', 'system.layer.popover',
  'system.layer.drawer', 'system.layer.toast', 'system.layer.modal', 'system.layer.tooltip',
]) requireToken(path);

await Promise.all([
  requireFile(baseCssPath), requireFile(layoutCssPath), requireFile(guidePath), requireFile(tokenGuidePath),
  requireFile(resolve(root, 'override/components/category-nav/host-integration.css')),
  requireFile(resolve(root, 'override/mutations/host-category-hover.ts')),
]);

const tokenSource = await readFile(tokenPath, 'utf8');
for (const forbidden of ['"compat"', 'gridGutter', 'contentMaxWidth', 'breakpointPhone', 'breakpointMobile', 'breakpointTablet', 'breakpointDesktop']) {
  if (tokenSource.includes(forbidden)) errors.push(`token source contains superseded API ${forbidden}`);
}
for (const oldReference of [
  'reference.spacing.extraSmall', 'reference.spacing.small', 'reference.spacing.medium', 'reference.spacing.large',
  'reference.spacing.extraLarge', 'reference.spacing.doubleExtraLarge', 'reference.spacing.tripleExtraLarge', 'reference.spacing.quadExtraLarge',
]) {
  if (tokenSource.includes(oldReference)) errors.push(`token source contains superseded reference spacing path ${oldReference}`);
}

const generatedCss = await readFile(generatedCssPath, 'utf8');
for (const variable of [
  '--sc-color-text-primary', '--sc-color-text-heading', '--sc-color-icon-subtle', '--sc-color-surface-canvas',
  '--sc-color-action-primary', '--sc-color-feedback-error', '--sc-layout-page-gutter', '--sc-layout-grid-gap',
  '--sc-layout-container-text', '--sc-layout-section-gap-expanded', '--sc-layout-section-gap-immersive',
  '--sc-icon-size-small', '--sc-control-size-large', '--sc-layer-tooltip',
]) if (!generatedCss.includes(`${variable}:`)) errors.push(`generated CSS missing ${variable}`);

const supersededCssVariables = [
  '--sc-color-ink', '--sc-color-heading', '--sc-color-copy', '--sc-color-muted', '--sc-color-trait', '--sc-color-surface', '--sc-color-border',
  '--sc-content-max-width', '--sc-layout-grid-gutter', '--sc-icon-size', '--sc-layer-mobile-menu', '--sc-layer-mobile-panel',
  '--sc-motion-fast', '--sc-motion-icon', '--sc-motion-theme', '--sc-motion-ease-out',
];
for (const variable of supersededCssVariables) {
  const definition = new RegExp(`${variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:`);
  if (definition.test(generatedCss)) errors.push(`generated CSS exposes superseded variable ${variable}`);
}

const generatedTs = await readFile(generatedTsPath, 'utf8');
for (const media of ['layoutNarrow', 'layoutCompact', 'layoutMedium', 'layoutIntermediate', 'layoutBelowWide', 'layoutWide']) {
  if (!generatedTs.includes(`${media}:`)) errors.push(`generated TypeScript missing tokenMedia.${media}`);
}
for (const gap of sectionGapNames) {
  if (!generatedTs.includes(`\"${gap}\":`)) errors.push(`generated TypeScript missing systemTokens.layout.sectionGap.${gap}`);
}
for (const media of ['phone:', 'mobile:', 'tablet:', 'compact:', 'compactWide:', 'desktop:']) {
  if (generatedTs.includes(`  ${media}`)) errors.push(`generated TypeScript exposes superseded media key ${media.slice(0, -1)}`);
}
for (const fragment of ['surfaceSemantic', 'borderSemantic', '"ink":', '"trait":', '"mobileMenu":', '"mobilePanel":']) {
  if (generatedTs.includes(fragment)) errors.push(`generated TypeScript exposes superseded shape ${fragment}`);
}

const variables = await readFile(variablesPath, 'utf8');
if (/(?:#[0-9a-f]{3,8}\b|rgb\(|\b\d+(?:\.\d+)?px\b)/i.test(variables)) {
  errors.push('override/core/variables.ts must not define visual color/dimension literals; use systemTokens');
}

const ownedFiles = (await walk(resolve(root, 'override')))
  .filter((path) => ['.css', '.ts', '.html'].includes(extname(path)));
ownedFiles.push(browserTypesPath);
for (const path of ownedFiles) {
  const source = await readFile(path, 'utf8');
  const file = relative(root, path).replaceAll('\\', '/');
  if (/\blegacy\b|\bCompat\b|\bcompat(?:ibility)?\s+(?:alias|contract|layer|api)\b/i.test(source)) {
    errors.push(`${file} contains superseded integration terminology`);
  }
  if (/scCatalogView:v\d|scCatalogView:(?:desktop|mobile)|scTheme:v\d/.test(source)) errors.push(`${file} contains superseded storage keys`);
  if (/data-sc-catalog-view=['"]normal['"]/.test(source)) errors.push(`${file} contains removed catalog view state normal`);
  for (const variable of supersededCssVariables) {
    if (source.includes(`var(${variable})`) || source.includes(`'${variable}'`) || source.includes(`"${variable}"`)) {
      errors.push(`${file} consumes superseded variable ${variable}`);
    }
  }
}

for (const path of [guidePath, tokenGuidePath]) {
  const source = await readFile(path, 'utf8');
  if (/\blegacy\b|\bcompatibility\b|\bcompat\b/i.test(source)) errors.push(`${relative(root, path)} documents a superseded API`);
}

for (const removedPath of [
  'override/components/category-nav/compatibility.css',
  'override/mutations/legacy-category-hover.ts',
]) {
  try { await stat(resolve(root, removedPath)); errors.push(`superseded file still exists: ${removedPath}`); } catch { /* esperado */ }
}

const baseCss = await readFile(baseCssPath, 'utf8');
for (const className of [
  '.sc-button', '.sc-icon-button', '.sc-field', '.sc-chip', '.sc-badge', '.sc-tabs',
  '.sc-surface', '.sc-divider', '.sc-popover', '.sc-dialog', '.sc-alert', '.sc-empty-state', '.sc-toast',
]) if (!baseCss.includes(className)) errors.push(`base visual contract missing ${className}`);

for (const forbidden of ['.active', '.open', '.selected', '.disabled']) {
  const pattern = new RegExp(`(^|[\\s,>+~])\\${forbidden}(?:[\\s:{.#[]|$)`, 'm');
  if (pattern.test(baseCss)) errors.push(`base visual contract uses generic state class ${forbidden}`);
}

if (errors.length) {
  console.error(`[design-system-contract] ${errors.length} error(s)`);
  for (const error of errors) console.error(`  ${error}`);
  process.exitCode = 1;
} else {
  console.log('[design-system-contract] canonical semantic foundations and base visual contracts verified');
}
