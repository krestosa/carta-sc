import path from 'node:path';
import { SITE, assert, escapeRegExp, githubSha, read, write } from '../lib/core.js';

const PREPAINT_SCRIPT = String.raw`{
  const root = document.documentElement;
  const themeModes = ['system', 'light', 'dark'];
  const viewModes = ['compact', 'list'];
  const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  let theme = 'system';
  let view = '';

  try {
    theme = localStorage.getItem('scTheme:v1') || 'system';
  } catch {
    theme = 'system';
  }
  if (!themeModes.includes(theme)) theme = 'system';

  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
  root.setAttribute('data-sc-theme', theme);
  root.setAttribute('data-sc-theme-resolved', resolvedTheme);
  root.style.colorScheme = resolvedTheme;

  const width = window.innerWidth || root.clientWidth || 0;
  const context = width <= 640 ? 'phone' : width <= 992 ? 'tablet' : 'desktop';
  const normalizeLegacyView = (value) => value === 'list' ? 'list' : value ? 'compact' : '';

  try {
    view = localStorage.getItem('scCatalogView:v3') || '';
    if (view === 'normal') view = 'compact';
    if (!viewModes.includes(view)) {
      const legacy = localStorage.getItem('scCatalogView:v2:' + context)
        || localStorage.getItem(context === 'desktop' ? 'scCatalogView:desktop' : 'scCatalogView:mobile')
        || '';
      view = normalizeLegacyView(legacy);
      if (view) {
        try { localStorage.setItem('scCatalogView:v3', view); } catch {}
      }
    }
  } catch {
    view = '';
  }

  if (!viewModes.includes(view)) view = 'compact';
  root.setAttribute('data-sc-catalog-view', view);
  root.classList.add('sc-catalog-prepaint', 'sc-no-loading-state');
}`;

function countMatches(source: string, pattern: RegExp): number {
  return source.match(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`))?.length ?? 0;
}

export function flattenBootstrap(): void {
  const sha = githubSha();
  const file = path.join(SITE, 'index.html');
  let html = read(file);

  const bootstrap = new RegExp(
    `<script\\b(?=[^>]*\\bsrc=["']_js_dev/main\\.js\\?v=${escapeRegExp(sha)}["'])[^>]*>\\s*<\\/script>`,
    'i',
  );
  assert(countMatches(html, bootstrap) === 1, 'Expected exactly one Pages development bootstrap script');

  const replacement = [
    `<script>${PREPAINT_SCRIPT}\nwindow.__scCatalogAssetVersion='${sha}';</script>`,
    `<script src="_js_dev/main-legacy.js?v=${sha}"></script>`,
    `<link rel="stylesheet" href="override/main.css?v=${sha}">`,
    `<script type="module" src="override/main.js?v=${sha}"></script>`,
  ].join('\n');

  html = html.replace(bootstrap, replacement);

  assert(!bootstrap.test(html), 'Development bootstrap script remains in Pages index');
  assert(html.includes('data-sc-catalog-view') && html.includes('scCatalogView:v3'), 'Remembered catalogue view prepaint bootstrap is missing');
  assert(html.includes("view = 'compact'"), 'Catalogue prepaint default must be compact');
  assert(html.includes("const viewModes = ['compact', 'list']"), 'Pages prepaint must expose density and list only');
  assert(html.includes('data-sc-theme-resolved') && html.includes('scTheme:v1'), 'Remembered color theme prepaint bootstrap is missing');

  const legacyRuntime = new RegExp(
    `<script\\b[^>]*\\bsrc=["']_js_dev/main-legacy\\.js\\?v=${escapeRegExp(sha)}["'][^>]*>\\s*<\\/script>`,
    'gi',
  );
  const overrideStyle = new RegExp(
    `<link\\b[^>]*\\bhref=["']override/main\\.css\\?v=${escapeRegExp(sha)}["'][^>]*>`,
    'gi',
  );
  const overrideModule = new RegExp(
    `<script\\b(?=[^>]*\\btype=["']module["'])(?=[^>]*\\bsrc=["']override/main\\.js\\?v=${escapeRegExp(sha)}["'])[^>]*>\\s*<\\/script>`,
    'gi',
  );

  assert(countMatches(html, legacyRuntime) === 1, 'Direct main-legacy script must appear exactly once');
  assert(countMatches(html, overrideStyle) === 2, 'Override CSS must appear once as preload and once as stylesheet');
  assert(countMatches(html, overrideModule) === 1, 'Direct override module entry must appear exactly once');

  write(file, html);
}
