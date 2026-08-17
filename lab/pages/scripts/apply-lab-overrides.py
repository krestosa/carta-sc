#!/usr/bin/env python3
from pathlib import Path
import shutil

SITE = Path('.pages-site')
LAB_ASSETS = Path('lab/pages/assets')
MAIN_CSS = SITE / 'override/main.css'
LIFECYCLE = SITE / 'override/core/render-lifecycle.js'
ANCHOR = '@import "./components/category-nav/controls.css?v=unversioned";\n'
LAB_IMPORTS = (
    '@import "./core/prepaint.css?v=unversioned";\n'
    '@import "./core/performance.css?v=unversioned";\n'
)

if not SITE.is_dir() or not MAIN_CSS.is_file() or not LIFECYCLE.is_file():
    raise SystemExit('lab Pages staging context is incomplete')

for name in ('prepaint.css', 'performance.css'):
    source = LAB_ASSETS / name
    target = SITE / 'override/core' / name
    if not source.is_file():
        raise SystemExit(f'lab asset missing: {source}')
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)

manifest = MAIN_CSS.read_text(encoding='utf-8')
if 'core/prepaint.css' in manifest or 'core/performance.css' in manifest:
    raise SystemExit('lab first-paint CSS already present in staged override manifest')
if ANCHOR not in manifest:
    raise SystemExit('category controls import anchor missing from staged override manifest')
manifest = manifest.replace(ANCHOR, ANCHOR + LAB_IMPORTS, 1)
MAIN_CSS.write_text(manifest, encoding='utf-8')

source = LIFECYCLE.read_text(encoding='utf-8')
base_decl = (
    'var STABLE_LAYOUT_TIMEOUT=900,FONT_TIMEOUT=1100,MOBILE_HEADER_TIMEOUT=500,'
    'desktopQuery=C.queries.desktop,waitObserver=null,waiters=[],'
)
lab_decl = (
    'var STABLE_LAYOUT_TIMEOUT=900,FONT_TIMEOUT=1100,MEDIA_TIMEOUT=1200,MOBILE_HEADER_TIMEOUT=500,'
    'desktopQuery=C.queries.desktop,root=document.documentElement,waitObserver=null,waiters=[],'
)
if source.count(base_decl) != 1:
    raise SystemExit('production render-lifecycle declaration shape changed; review lab patch')
source = source.replace(base_decl, lab_decl, 1)

font_fn = "function waitForFonts(){if(!document.fonts||!document.fonts.ready)return Promise.resolve();return withTimeout(document.fonts.ready,FONT_TIMEOUT);}\n"
lab_helpers = """function waitForImage(img){if(!img)return Promise.resolve();if(img.complete){if(img.naturalWidth&&typeof img.decode==='function')return withTimeout(img.decode(),MEDIA_TIMEOUT);return Promise.resolve();}return withTimeout(new Promise(function(resolve){function done(){img.removeEventListener('load',done);img.removeEventListener('error',done);resolve();}img.addEventListener('load',done,{once:true});img.addEventListener('error',done,{once:true});}),MEDIA_TIMEOUT);}
function waitForVisibleMedia(img,className){return waitForImage(img).then(function(){if(root&&img&&img.complete&&img.naturalWidth)root.classList.add(className);});}
function waitForCriticalMedia(){return waitFor(function(){return!!document.querySelector('.bannerShop .imgBannerShop');},STABLE_LAYOUT_TIMEOUT).then(function(){return withTimeout(waitForVisibleMedia(document.querySelector('.bannerShop .imgBannerShop'),'sc-banner-media-ready'),MEDIA_TIMEOUT);});}
function clearPrepaint(){if(!root)return;root.classList.remove('sc-catalog-prepaint');root.classList.remove('sc-banner-media-ready');root.classList.remove('sc-mobile-logo-ready');}
"""
if source.count(font_fn) != 1:
    raise SystemExit('production waitForFonts shape changed; review lab patch')
source = source.replace(font_fn, font_fn + lab_helpers, 1)

base_wait = """function waitForStableLayout(){
  return whenDomReady().then(function(){
    var waits=[waitForCatalogLayout(),waitForCatalogTools(),waitForMobileHeader()];
    if(desktopQuery.matches)waits.push(waitForFonts());
    return Promise.all(waits);
  }).then(function(){return new Promise(afterLayoutFrame);});
}
"""
lab_wait = """function waitForStableLayout(){
  return whenDomReady().then(function(){
    var waits=[waitForCatalogLayout(),waitForCatalogTools(),waitForMobileHeader()];
    if(desktopQuery.matches)waits.push(waitForFonts(),waitForCriticalMedia());
    return Promise.all(waits);
  }).then(function(){return new Promise(afterLayoutFrame);}).then(clearPrepaint);
}
"""
if source.count(base_wait) != 1:
    raise SystemExit('production waitForStableLayout shape changed; review lab patch')
source = source.replace(base_wait, lab_wait, 1)
LIFECYCLE.write_text(source, encoding='utf-8')

print('Applied lab-only first-paint CSS and render lifecycle to .pages-site staging copy.')
