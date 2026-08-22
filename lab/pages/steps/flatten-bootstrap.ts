import path from 'node:path';
import { SITE, assert, escapeRegExp, githubSha, read, write } from '../lib/core.js';
import { transpileBrowserRuntime } from '../lib/browser-runtime.js';

const PREPAINT_RUNTIME_SOURCE = 'lab/pages/steps/prepaint-runtime.ts';

interface BootstrapAssets {
  readonly legacyRuntime: string;
  readonly overrideStyle: string;
  readonly overrideModule: string;
}

function countMatches(source: string, pattern: RegExp): number {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  return source.match(new RegExp(pattern.source, flags))?.length ?? 0;
}

function assets(sha: string): BootstrapAssets {
  return {
    legacyRuntime: `_js_dev/main-legacy.js?v=${sha}`,
    overrideStyle: `override/main.css?v=${sha}`,
    overrideModule: `override/main.js?v=${sha}`,
  };
}

function prepaintScript(): string {
  return transpileBrowserRuntime(PREPAINT_RUNTIME_SOURCE, 'classic');
}

function replacementFor(bundle: BootstrapAssets): string {
  return [
    `<script>${prepaintScript()}</script>`,
    `<script src="${bundle.legacyRuntime}"></script>`,
    `<link rel="stylesheet" href="${bundle.overrideStyle}">`,
    `<script type="module" src="${bundle.overrideModule}"></script>`,
  ].join('\n');
}

function assertGeneratedContract(html: string, bundle: BootstrapAssets): void {
  assert(
    html.includes('data-sc-catalog-view')
      && html.includes('scCatalogView:v3')
      && html.includes('scCatalogView:v2:'),
    'Remembered catalogue view prepaint bootstrap is missing',
  );
  assert(
    html.includes('data-sc-theme-resolved') && html.includes('scTheme:v1'),
    'Remembered color theme prepaint bootstrap is missing',
  );
  assert(!html.includes('__scCatalogAssetVersion'), 'Legacy asset-version global remains in Pages bootstrap');

  const legacyRuntime = new RegExp(
    `<script\\b[^>]*\\bsrc=["']${escapeRegExp(bundle.legacyRuntime)}["'][^>]*>\\s*<\\/script>`,
    'gi',
  );
  const overrideStyle = new RegExp(
    `<link\\b[^>]*\\bhref=["']${escapeRegExp(bundle.overrideStyle)}["'][^>]*>`,
    'gi',
  );
  const overrideModule = new RegExp(
    `<script\\b(?=[^>]*\\btype=["']module["'])(?=[^>]*\\bsrc=["']${escapeRegExp(bundle.overrideModule)}["'])[^>]*>\\s*<\\/script>`,
    'gi',
  );

  assert(countMatches(html, legacyRuntime) === 1, 'Direct main-legacy script must appear exactly once');
  assert(countMatches(html, overrideStyle) === 2, 'Override CSS must appear once as preload and once as stylesheet');
  assert(countMatches(html, overrideModule) === 1, 'Direct override module entry must appear exactly once');
}

export function flattenBootstrap(): void {
  const sha = githubSha();
  const file = path.join(SITE, 'index.html');
  const bundle = assets(sha);
  let html = read(file);

  const developmentBootstrap = new RegExp(
    `<script\\b(?=[^>]*\\bsrc=["']_js_dev/main\\.js\\?v=${escapeRegExp(sha)}["'])[^>]*>\\s*<\\/script>`,
    'i',
  );
  assert(
    countMatches(html, developmentBootstrap) === 1,
    'Expected exactly one Pages development bootstrap script',
  );

  html = html.replace(developmentBootstrap, replacementFor(bundle));
  assert(!developmentBootstrap.test(html), 'Development bootstrap script remains in Pages index');
  assertGeneratedContract(html, bundle);
  write(file, html);
}
