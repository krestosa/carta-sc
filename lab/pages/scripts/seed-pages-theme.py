#!/usr/bin/env python3
import re
from pathlib import Path

SITE = Path('.pages-site')
INDEX = SITE / 'index.html'
if not INDEX.is_file():
    raise SystemExit('Pages index missing for theme prepaint seed')

html = INDEX.read_text(encoding='utf-8')
if 'id="sc-theme-prepaint"' in html:
    raise SystemExit('theme prepaint bootstrap already present')

bootstrap = r'''<style id="sc-theme-prepaint-css">.sc-catalog-tools:not([data-sc-theme-prepaint-ready]) .sc-theme-icon{visibility:hidden!important}</style>
<script id="sc-theme-prepaint">(function(){'use strict';var w=window,d=document,h=d.documentElement,M=['system','light','dark'],K='scTheme:v1',m='';try{m=localStorage.getItem(K)||''}catch(_){}if(M.indexOf(m)<0)m='system';w.__scInitialTheme=m;var dark=matchMedia('(prefers-color-scheme:dark)').matches,a=m==='system'?(dark?'dark':'light'):m;h.setAttribute('data-sc-theme',m);h.setAttribute('data-sc-theme-resolved',a);var SUN='M12 7.3A4.7 4.7 0 1 1 12 16.7A4.7 4.7 0 1 1 12 7.3Z',MOON='M12 3.6A8.4 8.4 0 1 1 12 20.4A8.4 8.4 0 1 1 12 3.6Z',AUTO='M12 3.6a8.4 8.4 0 0 1 0 16.8z';function seed(r){if(!r||r.hasAttribute('data-sc-theme-prepaint-ready'))return true;var s=r.querySelector('[data-sc-theme-icon]'),c=r.querySelector('[data-sc-theme-core]'),b=r.querySelector('[data-sc-theme-bite]'),g=r.querySelector('[data-sc-theme-auto-ring]'),q=r.querySelector('[data-sc-theme-rays]'),ls=r.querySelectorAll('[data-sc-theme-rays] line');if(!s||!c||!b||!g||!q||ls.length!==8)return false;r.setAttribute('data-sc-theme-mode',m);r.setAttribute('data-sc-theme-actual',a);c.setAttribute('d',m==='system'?AUTO:(m==='dark'?MOON:SUN));b.setAttribute('cx','17.9');b.setAttribute('cy','6.6');b.setAttribute('r',m==='dark'?'8':'0');g.setAttribute('r','8.4');g.style.opacity=m==='system'?'1':'0';q.style.opacity=m==='light'?'1':'0';for(var i=0;i<ls.length;i++){ls[i].setAttribute('pathLength','1');ls[i].style.strokeDasharray='1';ls[i].style.strokeDashoffset=m==='light'?'0':'1'}s.setAttribute('data-sc-theme-glyph-state',m);var btn=r.querySelector('.sc-theme-toggle');if(btn){btn.setAttribute('aria-label',m==='system'?'Tema automático. Elegir tema':m==='dark'?'Tema oscuro. Elegir tema':'Tema claro. Elegir tema');btn.setAttribute('title',m==='system'?'Tema automático':'Tema '+(m==='dark'?'oscuro':'claro'))}var os=r.querySelectorAll('[data-sc-theme-option]');for(var j=0;j<os.length;j++){var on=os[j].getAttribute('data-sc-theme-option')===m;os[j].setAttribute('aria-checked',on?'true':'false');os[j].classList.toggle('sc-theme-option-selected',on)}r.setAttribute('data-sc-theme-prepaint-ready','1');return true}function scan(n){if(n&&n.nodeType===1&&n.matches&&n.matches('.sc-catalog-tools'))seed(n);var r=d.querySelector('.sc-catalog-tools');if(r)seed(r)}scan(d.documentElement);var o=new MutationObserver(function(ms){for(var i=0;i<ms.length;i++){for(var j=0;j<ms[i].addedNodes.length;j++)scan(ms[i].addedNodes[j])}var r=d.querySelector('.sc-catalog-tools[data-sc-theme-prepaint-ready]');if(r)o.disconnect()});o.observe(d.documentElement,{childList:true,subtree:true});})();</script>'''

head = re.search(r'<head\b[^>]*>', html, re.I)
if not head:
    raise SystemExit('head missing for theme prepaint seed')
html = html[:head.end()] + '\n' + bootstrap + html[head.end():]

if html.count('id="sc-theme-prepaint"') != 1:
    raise SystemExit('theme prepaint bootstrap count invalid')
if 'window.__scInitialTheme' not in html and 'w.__scInitialTheme' not in html:
    raise SystemExit('theme prepaint memory bridge missing')
if 'data-sc-theme-prepaint-ready' not in html:
    raise SystemExit('theme prepaint shell guard missing')

INDEX.write_text(html, encoding='utf-8')
print('Theme prepaint seed injected: saved mode is applied to the static tools shell before its glyph can paint.')
