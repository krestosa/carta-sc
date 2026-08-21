import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, escapeRegExp, read } from '../../lib/core.js';
import { transpileBrowserRuntime } from '../../lib/browser-runtime.js';

const DELIVERY_LOADER_ID = 'sc-pages-delivery-loader';
const PHP_GUARD_SLOT = '/*__SC_PHP_GUARD__*/';
const VERSION_PLACEHOLDER = '__SC_VERSION__';
const DELIVERY_RUNTIME_SOURCE = 'lab/pages/steps/first-paint/delivery-runtime.ts';

function loaderSource(sha: string): string {
  const runtime = transpileBrowserRuntime(DELIVERY_RUNTIME_SOURCE, 'module')
    .replaceAll(VERSION_PLACEHOLDER, sha)
    .trim();
  assert(runtime.includes(PHP_GUARD_SLOT), 'compiled delivery runtime lost the PHP guard slot');
  assert(!runtime.includes(VERSION_PLACEHOLDER), 'compiled delivery runtime version placeholder remains');
  return `<script type="module" id="${DELIVERY_LOADER_ID}">\n${runtime}\n</script>`;
}
export function injectLoader(html: string, sha: string): string {
  const pattern = new RegExp(`<script\\b[^>]*\\bid=["']${DELIVERY_LOADER_ID}["'][^>]*>[\\s\\S]*?<\\/script>`, 'i');
  assert(pattern.test(html), 'existing delivery loader missing');
  return html.replace(pattern, loaderSource(sha));
}

export function verify(
  html: string,
  sha: string,
  productImageCount: number,
  criticalBytes: number,
  deferredBytes: number,
): void {
  const active = html.replace(/<!--[\s\S]*?-->/g, '');
  assert(
    criticalBytes < 450_000 && deferredBytes >= 30_000 && fs.existsSync(path.join(SITE, '_pages/deferred.css')),
    'CSS split budget failed',
  );
  assert(!/<script\b[^>]*src=/i.test(active), 'initial external script remains');
  assert(html.split('data-sc-src=').length - 1 >= productImageCount, 'product hard-lazy incomplete');
  assert(!/data-sc-lcp-product=/i.test(html), 'stale product LCP promotion remains');
  assert(
    /<section\b[^>]*class=["'][^"']*\bsc-catalog-tools\b[^>]*data-sc-static-shell=/i.test(html),
    'static catalog tools shell missing',
  );
  assert(html.includes('sc-trait-reference-placeholder'), 'catalog trait-row reservation missing');
  assert(
    html.includes(`{ src: 'override/main.js?v=' + VERSION, kind: 'module' }`),
    'override runtime must load as an ES module',
  );
  assert(
    html.includes("querySelectorAll('img[data-sc-first-viewport][data-sc-src]')"),
    'first-viewport image release contract is missing',
  );
  assert(
    html.includes("querySelectorAll('img[data-sc-desktop-src]')"),
    'desktop image release contract is missing',
  );
  assert(html.includes(PHP_GUARD_SLOT), 'PHP guard injection slot is missing');
  assert(!html.includes('__scRuntimeReady') && !html.includes('__scAfterRuntime'), 'legacy runtime readiness globals remain');

  const logo = new RegExp(
    `<img\\b(?=[^>]*data-sc-lcp-logo=["']1["'])(?=[^>]*src=["']_critical-media/mobile-logo\\.png\\?v=${escapeRegExp(sha)}["'])[^>]*>`,
    'i',
  ).exec(html);
  assert(logo, 'same-origin mobile LCP logo missing');
  assert(
    /loading=["']eager["']/i.test(logo[0]) && /fetchpriority=["']high["']/i.test(logo[0]),
    'mobile LCP logo lost eager/high priority',
  );
  assert(!/\b(?:margin-left|transform)\s*:/i.test(logo[0]), 'late-mutating mobile logo geometry remains');
  assert(
    new RegExp(
      `<link\\b(?=[^>]*rel=["']preload["'])(?=[^>]*href=["']_critical-media/mobile-logo\\.png\\?v=${escapeRegExp(sha)}["'])(?=[^>]*fetchpriority=["']high["'])[^>]*>`,
      'i',
    ).test(html),
    'same-origin mobile logo preload missing',
  );
  assert(fs.existsSync(path.join(SITE, '_critical-media/mobile-logo.png')), 'mirrored mobile logo file missing');

  const shop = read(path.join(SITE, '_pages/shop.js'));
  const legacy = read(path.join(SITE, '_pages/legacy.js'));
  assert(
    !shop.includes('.imgLiquid(')
      && !shop.includes('shop_imgLiquids')
      && !shop.includes('Knormalize(')
      && !legacy.includes('function Knormalize'),
    'legacy catalog runtime remains',
  );
  assert(!read(path.join(SITE, 'override/main.js')).includes('cetAttribute'), 'broken override call remains');
}

export { PHP_GUARD_SLOT };
