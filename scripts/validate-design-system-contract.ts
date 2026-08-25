import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

interface TokenNode { readonly $value?: unknown; readonly [key: string]: unknown }

const root = process.cwd();
const tokenPath = resolve(root, 'tokens/design.tokens.json');
const generatedCssPath = resolve(root, 'override/core/tokens.generated.css');
const generatedTsPath = resolve(root, 'override/core/tokens.generated.ts');
const variablesPath = resolve(root, 'override/core/variables.ts');
const baseCssPath = resolve(root, 'override/components/base/base.css');
const layoutCssPath = resolve(root, 'override/core/layout-primitives.css');
const guidePath = resolve(root, 'DESIGN_SYSTEM.md');

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
  try { await stat(path); } catch { errors.push(`missing file ${path.replace(`${root}/`, '')}`); }
}

for (const mode of ['light', 'dark']) {
  for (const path of [
    'brand.primary', 'brand.onPrimary',
    'text.primary', 'text.secondary', 'text.muted', 'text.disabled', 'text.inverse', 'text.link',
    'icon.primary', 'icon.secondary', 'icon.muted', 'icon.inverse',
    'surface.canvas', 'surface.subtle', 'surface.raised', 'surface.overlay', 'surface.inverse',
    'border.subtle', 'border.default', 'border.strong', 'border.focus',
    'action.primary', 'action.onPrimary', 'action.selected', 'action.disabled',
  ]) requireToken(`system.color.${mode}.${path}`);
  for (const kind of ['error', 'success', 'warning', 'info']) {
    for (const part of ['default', 'surface', 'border', 'on']) requireToken(`system.color.${mode}.feedback.${kind}.${part}`);
  }
}

for (const path of [
  'system.layout.container.wide', 'system.layout.container.content', 'system.layout.container.narrow', 'system.layout.container.text',
  'system.layout.pageGutter.desktop', 'system.layout.pageGutter.compact', 'system.layout.pageGutter.mobile',
  'system.layout.gridGap.desktop', 'system.layout.gridGap.compact', 'system.layout.gridGap.mobile',
  'system.layout.sectionGap.compact', 'system.layout.sectionGap.default', 'system.layout.sectionGap.spacious',
  'system.size.iconScale.small', 'system.size.iconScale.medium', 'system.size.iconScale.large',
  'system.size.control.small', 'system.size.control.medium', 'system.size.control.large',
  'system.layer.base', 'system.layer.sticky', 'system.layer.dropdown', 'system.layer.popover',
  'system.layer.drawer', 'system.layer.toast', 'system.layer.modal', 'system.layer.tooltip',
]) requireToken(path);

await Promise.all([requireFile(baseCssPath), requireFile(layoutCssPath), requireFile(guidePath)]);

const generatedCss = await readFile(generatedCssPath, 'utf8');
for (const variable of [
  '--sc-color-text-primary', '--sc-color-action-primary', '--sc-color-feedback-error',
  '--sc-layout-page-gutter', '--sc-layout-grid-gap', '--sc-layout-container-text',
  '--sc-icon-size-small', '--sc-control-size-large', '--sc-layer-tooltip',
]) if (!generatedCss.includes(`${variable}:`)) errors.push(`generated CSS missing ${variable}`);

const generatedTs = await readFile(generatedTsPath, 'utf8');
for (const media of ['layoutNarrow', 'layoutCompact', 'layoutWide']) {
  if (!generatedTs.includes(`${media}:`)) errors.push(`generated TypeScript missing tokenMedia.${media}`);
}

const variables = await readFile(variablesPath, 'utf8');
if (/(?:#[0-9a-f]{3,8}\b|rgb\(|\b\d+(?:\.\d+)?px\b)/i.test(variables)) {
  errors.push('override/core/variables.ts must not define visual color/dimension literals; use systemTokens');
}

const baseCss = await readFile(baseCssPath, 'utf8');
for (const className of [
  '.sc-button', '.sc-icon-button', '.sc-field', '.sc-chip', '.sc-badge', '.sc-tabs',
  '.sc-surface', '.sc-divider', '.sc-popover', '.sc-dialog', '.sc-alert', '.sc-empty-state', '.sc-toast',
]) if (!baseCss.includes(className)) errors.push(`base visual contract missing ${className}`);

for (const forbidden of ['.active', '.open', '.selected', '.disabled']) {
  const pattern = new RegExp(`(^|[\\s,>+~])\\\\${forbidden}(?:[\\s:{.#[]|$)`, 'm');
  if (pattern.test(baseCss)) errors.push(`base visual contract uses generic state class ${forbidden}`);
}

if (errors.length) {
  console.error(`[design-system-contract] ${errors.length} error(s)`);
  for (const error of errors) console.error(`  ${error}`);
  process.exitCode = 1;
} else {
  console.log('[design-system-contract] semantic foundations, responsive aliases and base visual contracts verified');
}
