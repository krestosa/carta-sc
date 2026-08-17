#!/usr/bin/env python3
import os, posixpath, re, time
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

SITE=Path('.pages-site'); INDEX=SITE/'index.html'; DEFERRED=SITE/'_pages/deferred.css'; SHA=os.environ.get('GITHUB_SHA','')
if not re.fullmatch(r'[0-9a-f]{40}',SHA) or not INDEX.is_file(): raise SystemExit('invalid Pages build context')

LEGACY_CRITICAL={'_css_dev/bootstrap.min.css','_css_dev/fnt-helvlig.css','_css_dev/fontBar.css','_css_dev/slicknav__q_dd9216b6.css','_css_dev/styles.css','_css_dev/styles_newver17.css','css/styles_shop__q_a48cd660.css','css/_aux__q_a48cd660.css'}
OVERRIDE_CRITICAL={'./core/variables.css','./core/theme.css','./core/a11y.css','./features/catalog/catalog.css','./components/category-nav/desktop.css','./components/category-nav/mobile.css','./components/category-nav/controls.css','./core/prepaint.css','./core/performance.css','./core/no-loading-state.css','./components/product-card/image-ratio.css','./features/catalog/layout.css','./components/section-heading/layout.css','./components/product-card/layout.css','./components/product-card/content.css','./components/product-card/pricing.css','./components/catalog-tools/catalog-tools.css','./components/catalog-tools/theme.css','./components/catalog-tools/view-stability.css','./components/section-heading/section-heading.css','./components/section-heading/responsive.css','./components/mobile-header/mobile-header.css','./components/mobile-header/morph.css','./components/category-nav/compatibility.css','./features/image-preloader/image-preloader.css'}
RUNTIME=('js/jquery-2.1.0.min.js','_pages/legacy.js','_js_dev/main-legacy.js','override/main.js','_pages/shop.js')

def mincss(s):
    s=re.sub(r'/\*(?!\!)[\s\S]*?\*/','',s); s=re.sub(r'[\t\r\n]+',' ',s); return re.sub(r' {2,}',' ',s).strip()

def to_pages_urls(s):
    rx=re.compile(r'url\(\s*(?P<q>["\']?)(?P<v>.*?)(?P=q)\s*\)',re.I)
    def repl(m):
        v=m.group('v').strip()
        if not v or re.match(r'^(?:data:|[a-z][a-z0-9+.-]*:|//|/|#)',v,re.I): return m.group(0)
        mm=re.match(r'^(?P<p>[^?#]+)(?P<x>[?#].*)?$',v)
        if not mm:return m.group(0)
        p=posixpath.normpath(posixpath.join('..',mm.group('p')))+(mm.group('x') or '');q=m.group('q');return f'url({q}{p}{q})'
    return rx.sub(repl,s)

def split_css(html):
    rx=re.compile(r'<style id="sc-pages-critical-css">(?P<css>[\s\S]*?)</style>',re.I);m=rx.search(html)
    if not m: raise SystemExit('current critical CSS block missing')
    css=m.group('css'); mark=re.compile(r'(?m)^/\* source: (?P<n>.*?) \*/\s*'); ms=list(mark.finditer(css))
    if not ms: raise SystemExit('CSS source markers missing')
    critical=[]; deferred=[]
    for i,x in enumerate(ms):
        end=ms[i+1].start() if i+1<len(ms) else len(css); n=re.sub(r'\s+\(pruned:.*?\)$','',x.group('n')); chunk=css[x.start():end]
        (critical if n in LEGACY_CRITICAL or n in OVERRIDE_CRITICAL else deferred).append(chunk if n in LEGACY_CRITICAL or n in OVERRIDE_CRITICAL else to_pages_urls(chunk))
    rob=re.compile(r'<style id="sc-roboto-font-css">(?P<c>[\s\S]*?)</style>\s*',re.I);rm=rob.search(html)
    if rm: deferred.append(rm.group('c'))
    c=mincss('\n'.join(critical));d=mincss('\n'.join(deferred));DEFERRED.write_text(d+'\n',encoding='utf-8')
    html=rx.sub(lambda _:'<style id="sc-pages-critical-css">'+c+'</style>',html,count=1)
    if rm: html=rob.sub('',html,count=1)
    html=re.sub(r'<link\b(?=[^>]*rel=["\']preconnect["\'])(?=[^>]*href=["\']https://fonts\.(?:googleapis|gstatic)\.com/?["\'])[^>]*>\s*','',html,flags=re.I)
    html=re.sub(r'(<link\b(?=[^>]*rel=["\']preload["\'])(?=[^>]*AcuminPro-(?:Regular|Semibold)\.woff2)(?P<a>[^>]*))>',lambda z:z.group(1)+('' if re.search(r'fetchpriority=',z.group('a'),re.I) else ' fetchpriority="low"')+'>',html,flags=re.I)
    return html,len(c),len(d)

def critical_media(html):
    logo='https://www.sushiclub.com.ar/gfx/web-sushiclub2_black_m2.png'
    if not re.search(r'<link\b(?=[^>]*rel=["\']preload["\'])(?=[^>]*href=["\']'+re.escape(logo)+r'["\'])',html,re.I):
        h=re.search(r'<head\b[^>]*>',html,re.I); html=html[:h.end()]+'\n<link rel="preload" as="image" href="'+logo+'" fetchpriority="high" media="(max-width: 992px)">'+html[h.end():]
    br=re.compile(r'(<link\b(?=[^>]*rel=["\']preload["\'])(?=[^>]*as=["\']image["\'])(?=[^>]*banner_shop)[^>]*)(>)',re.I);m=br.search(html)
    if m and 'media=' not in m.group(1).lower():html=html[:m.start()]+m.group(1)+' media="(min-width: 993px)"'+m.group(2)+html[m.end():]
    ir=re.compile(r'(<img\b(?=[^>]*class=["\'][^"\']*\bimgBannerShop\b[^"\']*["\'])(?P<a>[^>]*))>',re.I);m=ir.search(html)
    if m:
        a=re.sub(r'\s+fetchpriority=["\'][^"\']*["\']','',m.group('a'),flags=re.I)+' fetchpriority="auto"';html=html[:m.start()]+'<img'+a+'>'+html[m.end():]
    return html

def remove_runtime(html):
    for p in RUNTIME:
        suf='' if p.startswith('js/jquery') else rf'\?v={re.escape(SHA)}';rx=re.compile(rf'<script\b(?=[^>]*src=["\']{re.escape(p)}{suf}["\'])[^>]*>\s*</script>\s*',re.I);html,n=rx.subn('',html,count=1)
        if n!=1:raise SystemExit(f'runtime tag mismatch: {p}={n}')
    return html

def queue_inline(html):
    sr=re.compile(r'<script(?P<a>[^>]*)>(?P<b>[\s\S]*?)</script>',re.I)
    for marker in ('function isValidEmailAddress(emailAddress)','var keepSessionAlive = function()'):
        m=next((x for x in sr.finditer(html) if marker in x.group('b')),None)
        if not m:raise SystemExit('inline marker missing: '+marker)
        b=m.group('b');w=re.fullmatch(r"\s*document\.addEventListener\('DOMContentLoaded',function\(\)\{\s*(?P<i>[\s\S]*?)\s*\},\{once:true\}\);\s*",b)
        if w:b=w.group('i')
        rep='<script>window.__scAfterRuntime=window.__scAfterRuntime||[];window.__scAfterRuntime.push(function(){\n'+b+'\n});</script>';html=html[:m.start()]+rep+html[m.end():]
    return html

def clean_style(a):
    m=re.search(r'\s+style=["\'](?P<s>[^"\']*)["\']',a,re.I)
    if not m:return a
    rules=[x.strip() for x in m.group('s').split(';') if x.strip() and not re.match(r'^display\s*:\s*none$',x.strip(),re.I)]
    return a[:m.start()]+((' style="'+'; '.join(rules)+'"') if rules else '')+a[m.end():]

def hard_lazy(html):
    rx=re.compile(r'(?P<open><div\b(?P<da>[^>]*class=["\'][^"\']*\bimgShop\b[^"\']*["\'][^>]*)>\s*<img\b)(?P<ia>[^>]*)(?P<close>>)',re.I);count=0
    def repl(m):
        nonlocal count;count+=1;da=m.group('da');cm=re.search(r'class=["\'](?P<c>[^"\']*)["\']',da,re.I)
        if cm:
            c=' '.join(x for x in cm.group('c').split() if x not in {'imgLiquid','imgLiquid_bgSize','imgLiquid_ready','imgLiquid_error'});da=da[:cm.start()]+f'class="{c}"'+da[cm.end():]
        ia=clean_style(m.group('ia'));src=re.search(r'\s+(?:data-sc-src|src)=["\'](?P<s>[^"\']+)["\']',ia,re.I)
        if src:
            val=src.group('s');ia=re.sub(r'\s+(?:data-sc-src|src)=["\'][^"\']+["\']','',ia,flags=re.I);ia=re.sub(r'\s+(?:loading|decoding|fetchpriority|data-sc-lcp-product)=["\'][^"\']*["\']','',ia,flags=re.I)
            if count==1: ia+=f' src="{val}" loading="eager" decoding="async" fetchpriority="high" data-sc-lcp-product="{count}"'
            elif count==2: ia+=f' src="{val}" loading="lazy" decoding="async" fetchpriority="auto" data-sc-lcp-product="{count}"'
            else: ia+=f' data-sc-src="{val}" loading="lazy" decoding="async" fetchpriority="low"'
        return '<div'+da+'>\n<img'+ia+m.group('close')
    html=rx.sub(repl,html)
    if count<100:raise SystemExit('product images not found')
    return html,count

def inject_catalog_tools_shell(html):
    if re.search(r'<section\b[^>]*class=["\'][^"\']*\bsc-catalog-tools\b',html,re.I): return html
    source=SITE/'override/components/catalog-tools/catalog-tools.html'
    text=source.read_text(encoding='utf-8')
    match=re.search(r'<template\b[^>]*data-sc-template=["\']catalog-tools["\'][^>]*>(?P<body>[\s\S]*?)</template>',text,re.I)
    if not match: raise SystemExit('catalog-tools template missing')
    shell=match.group('body').strip()
    shell=shell.replace('<section class="sc-catalog-tools"','<section class="sc-catalog-tools" data-sc-static-shell="1"',1)
    marker='<div class="sc-catalog-search-results"'
    if marker not in shell: raise SystemExit('catalog-tools search-results marker missing')
    shell=shell.replace(marker,'<div class="sc-trait-reference-placeholder" aria-hidden="true"></div>\n    '+marker,1)
    container=re.compile(r'(<div\b[^>]*class=["\'][^"\']*\bcontainerShop\b[^"\']*["\'][^>]*>)',re.I)
    html,n=container.subn(lambda m:m.group(1)+'\n'+shell+'\n',html,count=1)
    if n!=1: raise SystemExit('catalog container not found for static tools shell')
    return html

def mirror_critical_media(html):
    out=SITE/'_critical-media';out.mkdir(parents=True,exist_ok=True)
    preloads=[]
    def fetch_asset(url,name):
        suffix=Path(urlparse(url).path).suffix.lower()
        if suffix not in {'.png','.jpg','.jpeg','.webp','.gif'}: suffix='.bin'
        rel=f'_critical-media/{name}{suffix}'
        error=None
        for attempt in range(3):
            try:
                req=Request(url,headers={'User-Agent':'Mozilla/5.0'})
                with urlopen(req,timeout=10) as response:
                    data=response.read();ctype=response.headers.get_content_type()
                if not data or len(data)>3_000_000 or not ctype.startswith('image/'):
                    raise ValueError(f'critical asset invalid: type={ctype} bytes={len(data)}')
                (SITE/rel).write_bytes(data);return rel
            except Exception as exc:
                error=exc
                if attempt<2: time.sleep(.6*(attempt+1))
        raise SystemExit(f'critical product mirror failed for {url}: {error}')
    # Keep both cards in the compact mobile first row on the network from parse time.
    img_re=re.compile(r'<img\b(?P<a>[^>]*\bdata-sc-lcp-product=["\'](?P<n>[12])["\'][^>]*)>',re.I)
    def product(m):
        attrs=m.group('a');src=re.search(r'\bsrc=["\'](?P<u>[^"\']+)["\']',attrs,re.I)
        if not src:return m.group(0)
        idx=m.group('n');local=fetch_asset(src.group('u'),f'product-lcp-{idx}');asset=local+('?v='+SHA if local.startswith('_critical-media/') else '')
        attrs=attrs[:src.start('u')]+asset+attrs[src.end('u'):]
        preloads.append(f'<link rel="preload" as="image" href="{asset}" fetchpriority="high" media="(max-width: 640px)">')
        return '<img'+attrs+'>'
    html=img_re.sub(product,html)
    head=re.search(r'<head\b[^>]*>',html,re.I)
    if not head:raise SystemExit('head missing')
    # The site still uses SushiClub-hosted icons/media below the fold; establish that origin early without blocking.
    hints='<link rel="preconnect" href="https://www.sushiclub.com.ar" crossorigin>\n'+'\n'.join(preloads)+'\n'
    html=html[:head.end()]+'\n'+hints+html[head.end():]
    return html

def patch_runtime():
    shop=SITE/'_pages/shop.js'; legacy=SITE/'_pages/legacy.js';s=shop.read_text(encoding='utf-8',errors='ignore')
    rr=re.compile(r"\$\(function\(\)\s*\{\s*PS_initSearch\(\);\s*makeToolTips\(\);\s*shopCopyMobileNav\(\);\s*(?:if \(window\.moment\)\s*)?moment\.locale\('es'\);\s*shop_JSModales\(\);\s*shop_imgLiquids\(\);\s*shop_normalizeCols\(\);\s*dropdowntogglewOver\(\);\s*scrllAnim\(\);\s*JSgoMenu\(\);\s*JSgroupButtons\(\);\s*JSTopDropDown\(\);\s*\}\);",re.S)
    rep="""$(function() {\n\tshopCopyMobileNav();\n\tif (window.moment) moment.locale('es');\n\tvar jobs=[PS_initSearch,makeToolTips,shop_JSModales,dropdowntogglewOver,scrllAnim,JSgoMenu,JSgroupButtons,JSTopDropDown];\n\tfor(var i=0;i<jobs.length;i++)(function(fn,delay){setTimeout(fn,delay)})(jobs[i],i*18);\n});""";s,n=rr.subn(rep,s,count=1)
    if n!=1:raise SystemExit('shop startup callback mismatch')
    for name in ('shop_imgLiquids','shop_normalizeCols'):
        s,n=re.subn(rf'\nfunction {name}\(\)\s*\{{[\s\S]*?\n\}}\n','\n',s,count=1)
        if n!=1:raise SystemExit('cannot remove '+name)
    shop.write_text(s,encoding='utf-8')
    s=legacy.read_text(encoding='utf-8',errors='ignore');s,n=re.subn(r'/\*Knormalize_+\*/\s*function Knormalize\(obj\)\s*\{[\s\S]*?\n\}\s*','',s,count=1)
    if n!=1:raise SystemExit('cannot remove Knormalize')
    legacy.write_text(s,encoding='utf-8')

def strip_maps():
    for p in ('_pages/legacy.js','_pages/shop.js','_js_dev/main-legacy.js','override/main.js'):
        f=SITE/p;s=f.read_text(encoding='utf-8',errors='ignore');s=re.sub(r'(?m)^\s*//[@#]\s*sourceMappingURL=.*$','',s);s=re.sub(r'/\*# sourceMappingURL=.*?\*/','',s,flags=re.S);f.write_text(s,encoding='utf-8')

def loader():
    js="""<script id=\"sc-pages-delivery-loader\">(function(){'use strict';var d=document,w=window,S='__SHA__',A=['js/jquery-2.1.0.min.js','_pages/legacy.js?v='+S,'_js_dev/main-legacy.js?v='+S,'override/main.js?v='+S,'_pages/shop.js?v='+S];w.dataLayer=w.dataLayer||[];function li(i){var s=i&&i.getAttribute('data-sc-src');if(!s)return;i.removeAttribute('data-sc-src');i.src=s}var im=0;function images(){if(im)return;im=1;var a=[].slice.call(d.querySelectorAll('img[data-sc-src]'));if('IntersectionObserver'in w){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){io.unobserve(e.target);li(e.target)}})},{rootMargin:'80px 0px'});a.forEach(function(i){io.observe(i)})}else a.forEach(li)}var b=0,rtScheduled=0,pendingClick=null;function replay(){var t=pendingClick;pendingClick=null;if(t&&t.isConnected)setTimeout(function(){t.click()},0)}function flush(){w.__scRuntimeReady=1;var q=w.__scAfterRuntime||[];w.__scAfterRuntime=[];q.forEach(function(fn){try{fn()}catch(e){setTimeout(function(){throw e},0)}});var search=d.querySelector('.sc-catalog-search-input');if(search&&search.value)try{search.dispatchEvent(new Event('input',{bubbles:true}))}catch(_){}replay()}function runtime(){if(b)return;b=1;var c=d.createElement('link');c.rel='stylesheet';c.href='_pages/deferred.css?v='+S;var start=function(){if(start.done)return;start.done=1;var left=A.length;A.forEach(function(src){var s=d.createElement('script');s.src=src;s.async=false;s.fetchPriority='low';s.onload=s.onerror=function(){if(--left===0)flush()};d.head.appendChild(s)})};c.onload=c.onerror=start;d.head.appendChild(c)}function scheduleRuntime(){if(rtScheduled)return;rtScheduled=1;var go=function(){if('requestIdleCallback'in w)w.requestIdleCallback(runtime,{timeout:650});else setTimeout(runtime,70)};if('requestAnimationFrame'in w)w.requestAnimationFrame(function(){w.requestAnimationFrame(go)});else setTimeout(go,70)}function boot(){var p=d.querySelector('img[data-sc-lcp-product=\"1\"]'),done=0;function ready(){if(done)return;done=1;images();scheduleRuntime()}if(p&&!p.complete){p.addEventListener('load',ready,{once:true});p.addEventListener('error',ready,{once:true});setTimeout(ready,2200)}else ready()}if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',boot,{once:true});else boot();['scroll','touchmove'].forEach(function(t){w.addEventListener(t,images,{once:true,passive:true})});d.addEventListener('click',function(e){if(w.__scRuntimeReady)return;var t=e.target&&e.target.closest?e.target.closest('.sc-catalog-view-toggle,.sc-theme-toggle,.sc-theme-option'):null;if(!t)return;e.preventDefault();e.stopImmediatePropagation();pendingClick=t;runtime()},{capture:true});['pointerdown','keydown','touchstart','focusin'].forEach(function(t){w.addEventListener(t,runtime,{once:true,passive:true})});var g=0;function gtm(){if(g)return;g=1;w.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});var s=d.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtm.js?id=GTM-WQPLGX9';d.head.appendChild(s)}['pointerdown','keydown','touchstart','wheel'].forEach(function(t){w.addEventListener(t,gtm,{once:true,passive:true})});w.addEventListener('load',function(){setTimeout(gtm,30000)},{once:true});var r=0;function rc(){if(r)return;r=1;var s=d.createElement('script');s.async=true;s.defer=true;s.src='https://www.google.com/recaptcha/api.js';d.head.appendChild(s)}w.__scLoadRecaptcha=rc;var f=d.getElementById('newsletterForm');if(f){f.addEventListener('focusin',rc,{once:true});f.addEventListener('pointerdown',rc,{once:true,passive:true});if('IntersectionObserver'in w){var ro=new IntersectionObserver(function(es){if(es.some(function(e){return e.isIntersecting})){ro.disconnect();rc()}},{rootMargin:'600px 0px'});ro.observe(f)}}})();</script>"""
    return js.replace('__SHA__',SHA)

def inject_loader(html):
    x=loader();rx=re.compile(r'<script id="sc-pages-delivery-loader">[\s\S]*?</script>',re.I)
    if not rx.search(html):raise SystemExit('existing delivery loader missing')
    return rx.sub(lambda _:x,html,count=1)

def verify(html,n,c,d):
    active=re.sub(r'<!--[\s\S]*?-->','',html)
    if c>=450000 or d<30000 or not DEFERRED.is_file():raise SystemExit('CSS split budget failed')
    if re.search(r'<script\b[^>]*src=',active,re.I):raise SystemExit('initial external script remains')
    if html.count('data-sc-src=')<n-2:raise SystemExit('product hard-lazy incomplete')
    if len(re.findall(r'data-sc-lcp-product=["\'][12]["\']',html,re.I))!=2:raise SystemExit('mobile LCP product row is not promoted')
    if not re.search(r'<section\b[^>]*class=["\'][^"\']*\bsc-catalog-tools\b[^>]*data-sc-static-shell=',html,re.I):raise SystemExit('static catalog tools shell missing')
    if 'sc-trait-reference-placeholder' not in html:raise SystemExit('catalog trait-row reservation missing')
    if not re.search(r'web-sushiclub2_black_m2\.png[^>]*media="\(max-width: 992px\)"',html,re.I):raise SystemExit('mobile logo preload missing')
    if '_critical-media/product-lcp-1' not in html or '_critical-media/product-lcp-2' not in html:raise SystemExit('local LCP product mirrors missing')
    for i in (1,2):
        if not list((SITE/'_critical-media').glob(f'product-lcp-{i}.*')):raise SystemExit(f'critical product mirror file {i} missing')
    shop=(SITE/'_pages/shop.js').read_text(encoding='utf-8',errors='ignore');legacy=(SITE/'_pages/legacy.js').read_text(encoding='utf-8',errors='ignore')
    if '.imgLiquid(' in shop or 'shop_imgLiquids' in shop or 'Knormalize(' in shop or 'function Knormalize' in legacy:raise SystemExit('legacy catalog runtime remains')
    if 'cetAttribute' in (SITE/'override/main.js').read_text(encoding='utf-8',errors='ignore'):raise SystemExit('broken override call remains')

def main():
    html=INDEX.read_text(encoding='utf-8');html,c,d=split_css(html);html=critical_media(html);html=remove_runtime(html);html=queue_inline(html);html=inject_catalog_tools_shell(html);html,n=hard_lazy(html);html=mirror_critical_media(html);patch_runtime();strip_maps();html=inject_loader(html);verify(html,n,c,d);INDEX.write_text(html,encoding='utf-8');print(f'First-viewport split: {n} product images, 2 promoted local LCP candidates, static catalog tools shell, {c} critical CSS bytes, {d} deferred CSS bytes, runtime gated behind primary media, imgLiquid/Knormalize pruned.')
if __name__=='__main__':main()
