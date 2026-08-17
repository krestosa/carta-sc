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


def patch_once(path, old, new, label):
    text = path.read_text(encoding='utf-8')
    if text.count(old) != 1:
        raise SystemExit(f'{label}: expected one source shape, found {text.count(old)}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


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

# Restore the pre-layout selector aliases only in the disposable Pages copy.
patch_once(
    SITE / 'override/components/product-card/content.css',
    '  body.sushiShop.sc-catalog-layout-ready .listadoShop .productoShop .title-shop1 {',
    "  body.sushiShop.sc-catalog-layout-ready .listadoShop .productoShop .title-shop1,\n  html.sc-catalog-prepaint body.sushiShop:not(.sc-catalog-layout-ready) .listadoShop .productoShop .title-shop1 {",
    'card title prepaint alias',
)
patch_once(
    SITE / 'override/components/product-card/content.css',
    '  body.sushiShop.sc-catalog-layout-ready .listadoShop .productoShop .descrip {',
    "  body.sushiShop.sc-catalog-layout-ready .listadoShop .productoShop .descrip,\n  html.sc-catalog-prepaint body.sushiShop:not(.sc-catalog-layout-ready) .listadoShop .productoShop .descrip {",
    'card description prepaint alias',
)
patch_once(
    SITE / 'override/components/product-card/image-ratio.css',
    '  body.sushiShop.sc-catalog-layout-ready .listadoShop .productoShop .imgShop {',
    "  body.sushiShop.sc-catalog-layout-ready .listadoShop .productoShop .imgShop,\n  html.sc-catalog-prepaint body.sushiShop:not(.sc-catalog-layout-ready) .listadoShop .productoShop .imgShop {",
    'card image-ratio prepaint alias',
)
patch_once(
    SITE / 'override/components/product-card/layout.css',
    '  body.sushiShop.sc-catalog-layout-ready .listadoShop .productoShop > a.fancyboxModalAddProd {',
    "  body.sushiShop.sc-catalog-layout-ready .listadoShop .productoShop > a.fancyboxModalAddProd,\n  html.sc-catalog-prepaint body.sushiShop:not(.sc-catalog-layout-ready) .listadoShop .productoShop > a.fancyboxModalAddProd {",
    'card anchor prepaint alias',
)
patch_once(
    SITE / 'override/components/product-card/layout.css',
    '  body.sushiShop.sc-catalog-layout-ready .listadoShop .productoShop .imgShop {',
    "  body.sushiShop.sc-catalog-layout-ready .listadoShop .productoShop .imgShop,\n  html.sc-catalog-prepaint body.sushiShop:not(.sc-catalog-layout-ready) .listadoShop .productoShop .imgShop {",
    'card layout image prepaint alias',
)
patch_once(
    SITE / 'override/components/product-card/pricing.css',
    '  body.sushiShop.sc-catalog-layout-ready .listadoShop .productoShop .priceRow {',
    "  body.sushiShop.sc-catalog-layout-ready .listadoShop .productoShop .priceRow,\n  html.sc-catalog-prepaint body.sushiShop:not(.sc-catalog-layout-ready) .listadoShop .productoShop .priceRow {",
    'pricing prepaint alias',
)
patch_once(
    SITE / 'override/components/section-heading/layout.css',
    '  body.sushiShop.sc-catalog-layout-ready .listadoShop .titleShopSeccion {',
    "  body.sushiShop.sc-catalog-layout-ready .listadoShop .titleShopSeccion,\n  html.sc-catalog-prepaint body.sushiShop:not(.sc-catalog-layout-ready) .listadoShop .titleShopSeccion {",
    'section title prepaint alias',
)
patch_once(
    SITE / 'override/components/section-heading/layout.css',
    '  body.sushiShop.sc-catalog-layout-ready .listadoShop .titleShopSeccion > div {',
    "  body.sushiShop.sc-catalog-layout-ready .listadoShop .titleShopSeccion > div,\n  html.sc-catalog-prepaint body.sushiShop:not(.sc-catalog-layout-ready) .listadoShop .titleShopSeccion > div {",
    'section title inner prepaint alias',
)
patch_once(
    SITE / 'override/components/section-heading/layout.css',
    '  body.sushiShop.sc-catalog-layout-ready .listadoShop .subTitleShopSeccion {',
    "  body.sushiShop.sc-catalog-layout-ready .listadoShop .subTitleShopSeccion,\n  html.sc-catalog-prepaint body.sushiShop:not(.sc-catalog-layout-ready) .listadoShop .subTitleShopSeccion {",
    'section subtitle prepaint alias',
)

section_css = SITE / 'override/components/section-heading/section-heading.css'
section_text = section_css.read_text(encoding='utf-8')
section_lab_block = """

html.sc-catalog-prepaint body.sushiShop:not(.sc-catalog-layout-ready) .listadoShop .titleShopSeccion,
html.sc-catalog-prepaint body.sushiShop:not(.sc-catalog-layout-ready) .listadoShop .titleShopSeccion > div,
html.sc-catalog-prepaint body.sushiShop:not(.sc-catalog-layout-ready) .listadoShop .subTitleShopSeccion {
  border-top: 0 !important;
  border-bottom: 0 !important;
}
"""
if 'html.sc-catalog-prepaint' in section_text:
    raise SystemExit('section-heading lab prepaint block already present in staged source')
section_css.write_text(section_text.rstrip() + section_lab_block + '\n', encoding='utf-8')

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

print('Applied lab-only first-paint CSS, component aliases and render lifecycle to .pages-site staging copy.')
