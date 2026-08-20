import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, escapeRegExp, githubSha, read, write } from '../lib/core.js';
import { SYSTEM_LOGO_SVG } from './system-logo-source.js';

const CRITICAL_CSS="<style id=\"sc-system-brand-css\">\nbody.sushiShop .sc-system-brand-logo{display:block!important;flex:0 0 auto!important;width:312px!important;max-width:100%!important;height:45px!important;max-height:45px!important;margin:0!important;padding:0!important;opacity:1!important;visibility:visible!important;object-fit:contain!important;object-position:center center!important;filter:invert(1)!important;transform:none!important;transition:filter var(--sc-motion-theme,560ms) cubic-bezier(.45,0,.55,1)!important}\nhtml[data-sc-theme-resolved='dark'] body.sushiShop .sc-system-brand-logo{filter:none!important}\n@media(min-width:993px){body.sushiShop .newVer17topBar .brand:has(.sc-system-brand-logo){box-sizing:border-box!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;width:312px!important;max-width:312px!important;height:55px!important;max-height:55px!important;margin:0 auto!important;padding:0!important;line-height:0!important;vertical-align:top!important}body.sushiShop .newVer17topBar .brand:has(.sc-system-brand-logo)>a{display:flex!important;align-items:center!important;justify-content:center!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important;line-height:0!important}}\n@media(max-width:992px){body.sushiShop .brandOnlyMobile:has(.sc-system-brand-logo){display:flex!important;align-items:center!important;justify-content:center!important}body.sushiShop .brandOnlyMobile:has(.sc-system-brand-logo)>a{display:flex!important;align-items:center!important;justify-content:center!important;width:312px!important;max-width:calc(100vw - 120px)!important;height:var(--sc-mobile-header-height,100px)!important;margin:0!important;padding:0!important;line-height:0!important}body.sushiShop .brandOnlyMobile .sc-system-brand-logo{width:312px!important;max-width:100%!important;height:auto!important;max-height:45px!important;aspect-ratio:312/45!important}}\n</style>";

function cleanStyle(tag:string):string{
  const style=/\s+style=["'](?<value>[^"']*)["']/i.exec(tag);if(!style?.groups?.value||style.index===undefined)return tag;
  const blocked=new Set(['margin-left','width','height','max-width','max-height','transform']);
  const kept=style.groups.value.split(';').map((v)=>v.trim()).filter((v)=>v.includes(':')&&!blocked.has((v.split(':',1)[0]??'').trim().toLowerCase()));
  const replacement=kept.length?` style="${kept.join('; ')}"`:'';
  return tag.slice(0,style.index)+replacement+tag.slice(style.index+style[0].length);
}

function normalizeLogoTag(tag:string,newLogo:string,sourceAttr:'src'|'data-sc-desktop-src'='src'):string{
  tag=cleanStyle(tag).replace(/\s+(?:width|height)=["'][^"']*["']/gi,'');
  let classChanged=false;
  tag=tag.replace(/\s+class=["'](?<classes>[^"']*)["']/i,(_all:string,...args:unknown[])=>{const groups=args.at(-1) as {classes?:string}|undefined;const classes=[...new Set(`${groups?.classes??''} sc-system-brand-logo`.trim().split(/\s+/))].join(' ');classChanged=true;return ` class="${classes}"`;});
  if(!classChanged){const close=tag.endsWith('/>')?'/>':'>';tag=`${tag.slice(0,-close.length).trimEnd()} class="sc-system-brand-logo"${close}`;}
  if(sourceAttr==='data-sc-desktop-src')tag=tag.replace(/\s+data-sc-desktop-src=["'][^"']*["']/i,'');
  tag=tag.replace(/\bsrc=["'][^"']*["']/i,`src="${newLogo}"`);
  const close=tag.endsWith('/>')?'/>':'>';return `${tag.slice(0,-close.length).trimEnd()} width="312" height="45"${close}`;
}

export function replaceSystemLogo():void{
  const sha=githubSha(),index=path.join(SITE,'index.html'),target=path.join(SITE,'_critical-media/sushiclub-logo.svg');
  const oldMobile=`_critical-media/mobile-logo.webp?v=${sha}`,oldDesktop=`_chrome-media/desktop-logo.webp?v=${sha}`,newLogo=`_critical-media/sushiclub-logo.svg?v=${sha}`;
  const svg=SYSTEM_LOGO_SVG.trim();
  assert(/<svg\b[^>]*viewBox="0 0 312 45"/i.test(svg),'unexpected SushiClub SVG geometry');assert((svg.match(/<path /g)??[]).length===9,'unexpected SushiClub SVG path count');write(target,svg.replace(/>\s+</g,'><')+'\n');
  let html=read(index);
  const mobileRe=new RegExp(`<img\\b(?=[^>]*\\bdata-sc-lcp-logo=["']1["'])(?=[^>]*\\bsrc=["']${escapeRegExp(oldMobile)}["'])[^>]*>`,'gi');
  const mobile=[...html.matchAll(mobileRe)];assert(mobile.length===1&&mobile[0]?.index!==undefined,`expected one generated mobile logo, found ${mobile.length}`);let match=mobile[0]!;html=html.slice(0,match.index!)+normalizeLogoTag(match[0],newLogo)+html.slice(match.index!+match[0].length);
  const preloadRe=new RegExp(`<link\\b(?=[^>]*\\brel=["']preload["'])(?=[^>]*\\bas=["']image["'])(?=[^>]*\\bhref=["']${escapeRegExp(oldMobile)}["'])[^>]*>`,'gi');
  const preloads=[...html.matchAll(preloadRe)];assert(preloads.length===1&&preloads[0]?.index!==undefined,`expected one generated mobile logo preload, found ${preloads.length}`);match=preloads[0]!;let preload=match[0].replace(oldMobile,newLogo).replace(/\s+media=["'][^"']*["']/gi,'');if(!/\stype=["']image\/svg\+xml["']/i.test(preload))preload=preload.slice(0,-1).trimEnd()+' type="image/svg+xml">';html=html.slice(0,match.index!)+preload+html.slice(match.index!+match[0].length);
  const desktopRe=new RegExp(`<img\\b(?=[^>]*\\bdata-sc-desktop-src=["']${escapeRegExp(oldDesktop)}["'])[^>]*>`,'gi');const desktop=[...html.matchAll(desktopRe)];assert(desktop.length===1&&desktop[0]?.index!==undefined,`expected one generated desktop logo, found ${desktop.length}`);match=desktop[0]!;html=html.slice(0,match.index!)+normalizeLogoTag(match[0],newLogo,'data-sc-desktop-src')+html.slice(match.index!+match[0].length);
  assert(!html.includes('id="sc-system-brand-css"'),'system logo critical CSS already exists');const head=/<\/head\s*>/i.exec(html);assert(head&&head.index!==undefined,'document head closing tag missing');html=html.slice(0,head.index)+CRITICAL_CSS+'\n'+html.slice(head.index);
  for(const obsolete of [path.join(SITE,'_critical-media/mobile-logo.webp'),path.join(SITE,'_chrome-media/desktop-logo.webp')])if(fs.existsSync(obsolete))fs.rmSync(obsolete);
  assert(!html.includes(oldMobile)&&!html.includes(oldDesktop),'obsolete generated logo reference remains');const tags=html.match(/<img\b(?=[^>]*\bclass=["'][^"']*\bsc-system-brand-logo\b[^"']*["'])[^>]*>/gi)??[];assert(tags.length===2,`system logo must appear exactly twice, found ${tags.length}`);assert(html.split(newLogo).length-1===3,'system logo URL must serve two images plus one preload');assert(html.split('id="sc-system-brand-css"').length-1===1,'system logo critical CSS must appear exactly once');assert(fs.existsSync(target)&&fs.statSync(target).size<=7000,'optimized system SVG is missing or over budget');write(index,html);console.log(`System logo optimized: one ${fs.statSync(target).size}B SVG shared by mobile and desktop; critical centering injected.`);
}
