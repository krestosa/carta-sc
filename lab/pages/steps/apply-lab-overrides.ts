import path from 'node:path';
import { PAGE_ASSETS, SITE, assert, copyFile, isDir, isFile, read, write } from '../lib/core.js';

function replaceOnce(source:string,pattern:RegExp,replacement:string,message:string):string{
  const matches=source.match(new RegExp(pattern.source,pattern.flags.includes('g')?pattern.flags:pattern.flags+'g'))??[];
  assert(matches.length===1,`${message}; found ${matches.length}`);
  return source.replace(pattern,replacement);
}

export function applyLabOverrides():void{
  const mainCss=path.join(SITE,'override','main.css');
  const lifecycle=path.join(SITE,'override','core','render-lifecycle.js');
  assert(isDir(SITE)&&isFile(mainCss)&&isFile(lifecycle),'lab Pages staging context is incomplete');

  for(const name of ['prepaint.css','performance.css'])copyFile(path.join(PAGE_ASSETS,name),path.join(SITE,'override','core',name));

  const anchor='@import "./components/category-nav/controls.css?v=unversioned";\n';
  const labImports='@import "./core/prepaint.css?v=unversioned";\n@import "./core/performance.css?v=unversioned";\n';
  let manifest=read(mainCss);
  assert(!manifest.includes('core/prepaint.css')&&!manifest.includes('core/performance.css'),'lab first-paint CSS already present in staged override manifest');
  assert(manifest.includes(anchor),'category controls import anchor missing from staged override manifest');
  write(mainCss,manifest.replace(anchor,anchor+labImports));

  for(const relative of [
    'override/components/product-card/content.css','override/components/product-card/image-ratio.css','override/components/product-card/layout.css',
    'override/components/product-card/pricing.css','override/components/section-heading/layout.css','override/components/section-heading/section-heading.css'
  ]){
    const staged=path.join(SITE,relative);
    assert(isFile(staged),`staged frontend source missing: ${relative}`);
    assert(!read(staged).includes('html.sc-catalog-prepaint'),`lab prepaint alias leaked into shared component source: ${relative}`);
  }

  let source=read(lifecycle);
  source=replaceOnce(
    source,
    /FONT_TIMEOUT\s*=\s*1100,\s*MOBILE_HEADER_TIMEOUT\s*=\s*500,/,
    'FONT_TIMEOUT = 1100, MEDIA_TIMEOUT = 1200, MOBILE_HEADER_TIMEOUT = 500,',
    'render-lifecycle timeout declaration shape changed; review lab patch'
  );

  const waitAnchor='function waitForStableLayout() {';
  assert(source.includes(waitAnchor),'render-lifecycle waitForStableLayout shape changed; review lab patch');
  const helpers=`function waitForImage(img) {\n        if (!img)\n            return Promise.resolve();\n        if (img.complete) {\n            if (img.naturalWidth && typeof img.decode === 'function')\n                return withTimeout(img.decode(), MEDIA_TIMEOUT);\n            return Promise.resolve();\n        }\n        return withTimeout(new Promise(function (resolve) {\n            function done() { img.removeEventListener('load', done); img.removeEventListener('error', done); resolve(); }\n            img.addEventListener('load', done, { once: true });\n            img.addEventListener('error', done, { once: true });\n        }), MEDIA_TIMEOUT);\n    }\n    function waitForVisibleMedia(img, className) { return waitForImage(img).then(function () { var root = document.documentElement; if (root && img && img.complete && img.naturalWidth) root.classList.add(className); }); }\n    function waitForCriticalMedia() { return waitFor(function () { return Boolean(document.querySelector('.bannerShop .imgBannerShop')); }, STABLE_LAYOUT_TIMEOUT).then(function () { return withTimeout(waitForVisibleMedia(document.querySelector('.bannerShop .imgBannerShop'), 'sc-banner-media-ready'), MEDIA_TIMEOUT); }); }\n    function clearPrepaint() { var root = document.documentElement; if (!root) return; root.classList.remove('sc-catalog-prepaint'); root.classList.remove('sc-banner-media-ready'); root.classList.remove('sc-mobile-logo-ready'); }\n    `;
  source=source.replace(waitAnchor,helpers+waitAnchor);
  source=replaceOnce(source,/waits\.push\(waitForFonts\(\)\);/,'waits.push(waitForFonts(), waitForCriticalMedia());','render-lifecycle desktop waits shape changed; review lab patch');
  source=replaceOnce(
    source,
    /\}\)\.then\(function \(\) \{ return new Promise\(afterLayoutFrame\); \}\);/,
    '}).then(function () { return new Promise(afterLayoutFrame); }).then(clearPrepaint);',
    'render-lifecycle frame tail changed; review lab patch'
  );
  write(lifecycle,source);
}
