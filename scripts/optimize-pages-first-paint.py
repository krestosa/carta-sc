#!/usr/bin/env python3
import os, posixpath, re
from pathlib import Path

SITE=Path('.pages-site'); INDEX=SITE/'index.html'; DEFERRED=SITE/'_pages/deferred.css'; SHA=os.environ.get('GITHUB_SHA','')
if not re.fullmatch(r'[0-9a-f]{40}',SHA) or not INDEX.is_file(): raise SystemExit('invalid Pages build context')

LEGACY_CRITICAL={'_css_dev/bootstrap.min.css','_css_dev/fnt-helvlig.css','_css_dev/fontBar.css','_css_dev/slicknav__q_dd9216b6.css','_css_dev/styles.css','_css_dev/styles_newver17.css','css/styles_shop__q_a48cd660.css','css/_aux__q_a48cd660.css'}
OVERRIDE_CRITICAL={'./core/variables.css','./core/theme.css','./core/a11y.css','./features/catalog/catalog.css','./components/category-nav/desktop.css','./components/category-nav/mobile.css','./components/category-nav/controls.css','./core/prepaint.css','./core/performance.css','./core/no-loading-state.css','./components/product-card/image-ratio.css','./features/catalog/layout.css','./components/section-heading/layout.css','./components/product-card/layout.css','./components/product-card/content.css','./components/product-card/pricing.css','./components/section-heading/section-heading.css','./components/section-heading/responsive.css','./components/mobile-header/mobile-header.css','./components/mobile-header/morph.css','./components/category-nav/compatibility.css','./features/image-preloader/image-preloader.css'}
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
            val=src.group('s');ia=re.sub(r'\s+(?:data-sc-src|src)=["\'][^"\']+["\']','',ia,flags=re.I);ia=re.sub(r'\s+(?:loading|decoding|fetchpriority)=["\'][^"\']*["\']','',ia,flags=re.I);ia+=f' data-sc-src="{val}" loading="lazy" decoding="async" fetchpriority="low"'
        return '<div'+da+'>\n<img'+ia+m.group('close')
    html=rx.sub(repl,html)
    if count<100:raise SystemExit('product images not found')
    return html,count

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
    A="['js/jquery-2.1.0.min.js','_pages/legacy.js?v='+S,'_js_dev/main-legacy.js?v='+S,'override/main.js?v='+S,'_pages/shop.js?v='+S]"
    return f'''<script id="sc-pages-delivery-loader">(function(){{'use strict';var d=document,w=window,S='{SHA}',A={A};w.dataLayer=w.dataLayer||[];function li(i){{var s=i&&i.getAttribute('data-sc-src');if(!s)return;i.removeAttribute('data-sc-src');i.src=s}}var im=0;function images(){{if(im)return;im=1;var a=[].slice.call(d.querySelectorAll('img[data-sc-src]'));if('IntersectionObserver'in w){{var io=new IntersectionObserver(function(es){{es.forEach(function(e){{if(e.isIntersecting){{io.unobserve(e.target);li(e.target)}}}})}},{{rootMargin:'180px 0px'}});a.forEach(function(i){{io.observe(i)}})}}else a.forEach(li)}}var b=0;function flush(){{var q=w.__scAfterRuntime||[];w.__scAfterRuntime=[];q.forEach(function(fn){{try{{fn()}}catch(e){{setTimeout(function(){{throw e}},0)}}}})}}function runtime(){{if(b)return;b=1;var c=d.createElement('link');c.rel='stylesheet';c.href='_pages/deferred.css?v='+S;var start=function(){{if(start.done)return;start.done=1;var left=A.length;A.forEach(function(src){{var s=d.createElement('script');s.src=src;s.async=false;s.fetchPriority='low';s.onload=s.onerror=function(){{if(--left===0)flush()}};d.head.appendChild(s)}})}};c.onload=c.onerror=start;d.head.appendChild(c)}}function afterPaint(){{var go=function(){{if('requestIdleCallback'in w)w.requestIdleCallback(runtime,{{timeout:700}});else setTimeout(runtime,90)}};if('requestAnimationFrame'in w)w.requestAnimationFrame(function(){{w.requestAnimationFrame(go)}});else setTimeout(go,90)}}function ready(){{images();afterPaint()}}if(d.readyState==='complete')setTimeout(ready,0);else w.addEventListener('load',ready,{{once:true}});setTimeout(images,2200);setTimeout(runtime,3200);['pointerdown','touchstart','scroll'].forEach(function(t){{w.addEventListener(t,images,{{once:true,passive:true}})}});['pointerdown','keydown','touchstart'].forEach(function(t){{w.addEventListener(t,runtime,{{once:true,passive:true}})}});var g=0;function gtm(){{if(g)return;g=1;w.dataLayer.push({{'gtm.start':Date.now(),event:'gtm.js'}});var s=d.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtm.js?id=GTM-WQPLGX9';d.head.appendChild(s)}}['pointerdown','keydown','touchstart','wheel'].forEach(function(t){{w.addEventListener(t,gtm,{{once:true,passive:true}})}});w.addEventListener('load',function(){{setTimeout(gtm,30000)}},{{once:true}});var r=0;function rc(){{if(r)return;r=1;var s=d.createElement('script');s.async=true;s.defer=true;s.src='https://www.google.com/recaptcha/api.js';d.head.appendChild(s)}}w.__scLoadRecaptcha=rc;var f=d.getElementById('newsletterForm');if(f){{f.addEventListener('focusin',rc,{{once:true}});f.addEventListener('pointerdown',rc,{{once:true,passive:true}});if('IntersectionObserver'in w){{var ro=new IntersectionObserver(function(es){{if(es.some(function(e){{return e.isIntersecting}})){{ro.disconnect();rc()}}}},{{rootMargin:'600px 0px'}});ro.observe(f)}}}}}})();</script>'''

def inject_loader(html):
    x=loader();rx=re.compile(r'<script id="sc-pages-delivery-loader">[\s\S]*?</script>',re.I)
    if not rx.search(html):raise SystemExit('existing delivery loader missing')
    return rx.sub(lambda _:x,html,count=1)

def verify(html,n,c,d):
    active=re.sub(r'<!--[\s\S]*?-->','',html)
    if c>=450000 or d<50000 or not DEFERRED.is_file():raise SystemExit('CSS split budget failed')
    if re.search(r'<script\b[^>]*src=',active,re.I):raise SystemExit('initial external script remains')
    if html.count('data-sc-src=')<n:raise SystemExit('product hard-lazy incomplete')
    if not re.search(r'web-sushiclub2_black_m2\.png[^>]*media="\(max-width: 992px\)"',html,re.I):raise SystemExit('mobile LCP preload missing')
    shop=(SITE/'_pages/shop.js').read_text(encoding='utf-8',errors='ignore');legacy=(SITE/'_pages/legacy.js').read_text(encoding='utf-8',errors='ignore')
    if '.imgLiquid(' in shop or 'shop_imgLiquids' in shop or 'Knormalize(' in shop or 'function Knormalize' in legacy:raise SystemExit('legacy catalog runtime remains')
    if 'cetAttribute' in (SITE/'override/main.js').read_text(encoding='utf-8',errors='ignore'):raise SystemExit('broken override call remains')

def main():
    html=INDEX.read_text(encoding='utf-8');html,c,d=split_css(html);html=critical_media(html);html=remove_runtime(html);html=queue_inline(html);html,n=hard_lazy(html);patch_runtime();strip_maps();html=inject_loader(html);verify(html,n,c,d);INDEX.write_text(html,encoding='utf-8');print(f'First-paint split: {n} product images hard-lazy, {c} critical CSS bytes, {d} deferred CSS bytes, runtime moved behind first paint, imgLiquid/Knormalize pruned.')
if __name__=='__main__':main()
