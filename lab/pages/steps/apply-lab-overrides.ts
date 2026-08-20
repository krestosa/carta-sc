import path from 'node:path';
import { PAGE_ASSETS, SITE, assert, copyFile, isDir, isFile, read, write } from '../lib/core.js';

export function applyLabOverrides(): void {
  const mainCss = path.join(SITE, 'override', 'main.css');
  const lifecycle = path.join(SITE, 'override', 'core', 'render-lifecycle.js');
  assert(isDir(SITE) && isFile(mainCss) && isFile(lifecycle), 'lab Pages staging context is incomplete');

  for (const name of ['prepaint.css', 'performance.css']) copyFile(path.join(PAGE_ASSETS, name), path.join(SITE, 'override', 'core', name));

  const anchor = '@import "./components/category-nav/controls.css?v=unversioned";\n';
  const labImports = '@import "./core/prepaint.css?v=unversioned";\n@import "./core/performance.css?v=unversioned";\n';
  let manifest = read(mainCss);
  assert(!manifest.includes('core/prepaint.css') && !manifest.includes('core/performance.css'), 'lab first-paint CSS already present in staged override manifest');
  assert(manifest.includes(anchor), 'category controls import anchor missing from staged override manifest');
  manifest = manifest.replace(anchor, anchor + labImports);
  write(mainCss, manifest);

  for (const relative of [
    'override/components/product-card/content.css','override/components/product-card/image-ratio.css','override/components/product-card/layout.css',
    'override/components/product-card/pricing.css','override/components/section-heading/layout.css','override/components/section-heading/section-heading.css'
  ]) {
    const staged = path.join(SITE, relative);
    assert(isFile(staged), `staged frontend source missing: ${relative}`);
    assert(!read(staged).includes('html.sc-catalog-prepaint'), `lab prepaint alias leaked into shared component source: ${relative}`);
  }

  let source = read(lifecycle);
  assert(source.includes('const FONT_TIMEOUT = 1100;'), 'render-lifecycle FONT_TIMEOUT shape changed; review lab patch');
  assert(source.includes('const MOBILE_HEADER_TIMEOUT = 500;'), 'render-lifecycle MOBILE_HEADER_TIMEOUT shape changed; review lab patch');
  source = source.replace('const FONT_TIMEOUT = 1100;', 'const FONT_TIMEOUT = 1100;\n    const MEDIA_TIMEOUT = 1200;\n    const root = document.documentElement;');

  const waitAnchor = 'function waitForStableLayout() {';
  assert(source.includes(waitAnchor), 'render-lifecycle waitForStableLayout shape changed; review lab patch');
  const helpers = `    function waitForImage(img) {\n        if (!img) return Promise.resolve();\n        if (img.complete) {\n            if (img.naturalWidth && typeof img.decode === 'function') return withTimeout(img.decode(), MEDIA_TIMEOUT);\n            return Promise.resolve();\n        }\n        return withTimeout(new Promise((resolve) => {\n            const done = () => { img.removeEventListener('load', done); img.removeEventListener('error', done); resolve(); };\n            img.addEventListener('load', done, { once: true });\n            img.addEventListener('error', done, { once: true });\n        }), MEDIA_TIMEOUT);\n    }\n    function waitForVisibleMedia(img, className) { return waitForImage(img).then(() => { if (root && img && img.complete && img.naturalWidth) root.classList.add(className); }); }\n    function waitForCriticalMedia() { return waitFor(() => Boolean(document.querySelector('.bannerShop .imgBannerShop')), STABLE_LAYOUT_TIMEOUT).then(() => withTimeout(waitForVisibleMedia(document.querySelector('.bannerShop .imgBannerShop'), 'sc-banner-media-ready'), MEDIA_TIMEOUT)); }\n    function clearPrepaint() { if (!root) return; root.classList.remove('sc-catalog-prepaint'); root.classList.remove('sc-banner-media-ready'); root.classList.remove('sc-mobile-logo-ready'); }\n`;
  source = source.replace(waitAnchor, helpers + '    ' + waitAnchor);
  assert(source.includes('waits.push(waitForFonts());'), 'render-lifecycle desktop waits shape changed; review lab patch');
  source = source.replace('waits.push(waitForFonts());', 'waits.push(waitForFonts(), waitForCriticalMedia());');
  const frameTail = '}).then(() => new Promise(afterLayoutFrame));';
  assert(source.includes(frameTail), 'render-lifecycle frame tail changed; review lab patch');
  source = source.replace(frameTail, '}).then(() => new Promise(afterLayoutFrame)).then(clearPrepaint);');
  write(lifecycle, source);
  console.log('Applied lab-only first-paint CSS and render lifecycle to Pages artifact.');
}
