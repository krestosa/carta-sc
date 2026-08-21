import path from 'node:path';
import { SITE, assert, read, write } from '../lib/core.js';
import { transpileBrowserRuntime } from '../lib/browser-runtime.js';

const THEME_PREPAINT_RUNTIME_SOURCE = 'lab/pages/steps/theme-prepaint-runtime.ts';
const PREPAINT_STYLE = `<style id="sc-theme-prepaint-css">
.sc-catalog-tools:not([data-sc-theme-prepaint-ready]) .sc-theme-icon {
  visibility: hidden !important;
}
</style>`;

function prepaintScript(): string {
  const runtime = transpileBrowserRuntime(THEME_PREPAINT_RUNTIME_SOURCE, 'classic');
  return `<script id="sc-theme-prepaint">\n${runtime}\n</script>`;
}

function bootstrap(): string {
  return `${PREPAINT_STYLE}\n${prepaintScript()}`;
}

export function seedTheme(): void {
  const file = path.join(SITE, 'index.html');
  let html = read(file);
  assert(!html.includes('id="sc-theme-prepaint"'), 'theme prepaint bootstrap already present');

  const head = /<head\b[^>]*>/i.exec(html);
  assert(head?.index !== undefined, 'head missing for theme prepaint seed');
  const insertion = head.index + head[0].length;
  html = `${html.slice(0, insertion)}\n${bootstrap()}${html.slice(insertion)}`;

  assert(html.split('id="sc-theme-prepaint"').length - 1 === 1, 'theme prepaint bootstrap count invalid');
  assert(!html.includes('__scInitialTheme'), 'legacy theme bootstrap global remains');
  write(file, html);
}
