import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, githubSha, read, replaceRegexOnce, write, walk } from '../lib/core.js';

function pruneUnusedMaps(html:string):string{
  const helpers=new Set([
    path.resolve(SITE,'_js_dev/mapKrc.js'),
    path.resolve(SITE,'js/main_shop_maps__q_9fc895e1.js'),
  ]);
  const usage=/\b(?:shop_init_mapear|shop_krc_geoCode|shop_krc_mapear|krc_geoCode|krc_mapear)\s*\(/i;
  const markup=/(?:\bid=["'][^"']*map[^"']*["']|\bclass=["'][^"']*\bmapParent\b[^"']*["'])/i;
  assert(!markup.test(html),'Map markup detected; refusing to remove Google Maps from Pages');
  for(const file of walk(SITE).filter((item)=>item.endsWith('.js'))){
    if(helpers.has(path.resolve(file)))continue;
    if(usage.test(fs.readFileSync(file,'utf8')))throw new Error(`Map helper usage detected in ${file}; refusing to remove Google Maps`);
  }
  const removals=[
    /<script\b[^>]*\bsrc=["']https:\/\/maps\.googleapis\.com\/maps\/api\/js\?[^"']*["'][^>]*><\/script>/i,
    /<script\b[^>]*\bsrc=["']_js_dev\/mapKrc\.js["'][^>]*><\/script>/i,
    /<script\b[^>]*\bsrc=["']js\/main_shop_maps__q_9fc895e1\.js["'][^>]*><\/script>/i,
  ];
  for(const pattern of removals){
    const count=(html.match(new RegExp(pattern.source,'gi'))??[]).length;
    assert(count===1,`Expected exactly one removable map script for pattern: ${pattern.source}`);
    html=html.replace(pattern,'');
  }
  return html;
}

function stampEntrypoint(sha:string):void{
  const file=path.join(SITE,'index.html');
  let html=read(file);
  html=replaceRegexOnce(html,/_js_dev\/main\.js\?v=[^"']+/,`_js_dev/main.js?v=${sha}`,'Could not rewrite the main.js entrypoint exactly once');
  const entry=new RegExp(`(?<tag><script\\s+src=["']_js_dev/main\\.js\\?v=${sha}["'][^>]*><\\/script>)`,'i');
  const hints=[
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>',
    `<link rel="preload" as="script" href="_js_dev/main-legacy.js?v=${sha}">`,
    `<link rel="preload" as="style" href="override/main.css?v=${sha}">`,
    `<link rel="preload" as="script" href="override/main.js?v=${sha}">`,
  ].join('\n');
  const match=entry.exec(html);assert(match?.groups?.tag,'Could not inject override preload hints exactly once');
  html=html.slice(0,match.index)+hints+'\n'+match.groups.tag+html.slice(match.index+match[0].length);
  let fontCount=0;
  html=html.replace(/(?<tag><link\s+rel="preload"\s+href="fuentes\/AcuminPro-(?:Regular|Semibold)\.woff2"\s+as="font"\s+type="font\/woff2")(?<end>>)/gi,(_all:string,tag:string,end:string)=>{fontCount++;return `${tag} crossorigin${end}`;});
  assert(fontCount===2,`Expected two Acumin font preloads, found ${fontCount}`);
  const banner=/<img\b(?=[^>]*\bclass="[^"]*\bimgBannerShop\b[^"]*")(?<attrs>[^>]*)>/i.exec(html);
  assert(banner?.groups?.attrs&&banner.index!==undefined,'Expected one catalogue banner image, found 0');
  let attrs=banner.groups.attrs.replace(/\s+(?:loading|decoding|fetchpriority)="[^"]*"/gi,'');
  attrs+=' loading="eager" decoding="async" fetchpriority="high"';
  html=html.slice(0,banner.index)+`<img${attrs}>`+html.slice(banner.index+banner[0].length);
  let imageCount=0;
  html=html.replace(/(?<prefix><div\b[^>]*class="[^"]*\bimgShop\b[^"]*"[^>]*>\s*<img\b)(?<attrs>[^>]*)(?<close>>)/gi,(_all:string,prefix:string,imageAttrs:string,close:string)=>{
    imageCount++;let next=imageAttrs;
    if(!/\bloading\s*=/i.test(next))next+=' loading="lazy"';
    if(!/\bdecoding\s*=/i.test(next))next+=' decoding="async"';
    return prefix+next+close;
  });
  assert(imageCount>=1,'No product images were found for native lazy loading');
  html=pruneUnusedMaps(html);
  write(file,html);
}

function stampBootstrap(sha:string):void{
  const file=path.join(SITE,'_js_dev/main.js');
  write(file,replaceRegexOnce(read(file),/var version='[^']+';/,`var version='${sha}';`,'Could not stamp the bootstrap version exactly once'));
}

function rebaseCssUrls(bundle:string,source:string,content:string):string{
  return content.replace(/url\(\s*(?<quote>["']?)(?<value>.*?)(?:\k<quote>)\s*\)/gi,(full:string,_q:string,_value:string,...args:unknown[])=>{
    const groups=args.at(-1) as {quote?:string;value?:string}|undefined;
    const value=(groups?.value??'').trim();const quote=groups?.quote??'';
    if(!value||/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(value))return full;
    const parts=/^(?<path>[^?#]+)(?<suffix>[?#].*)?$/.exec(value);if(!parts?.groups?.path)return full;
    const resolved=path.normalize(path.join(path.dirname(source),parts.groups.path));
    const rebased=path.relative(path.dirname(bundle),resolved).split(path.sep).join('/');
    return `url(${quote}${rebased}${parts.groups.suffix??''}${quote})`;
  });
}

function bundleCss():void{
  const file=path.join(SITE,'override/main.css');const manifest=read(file);
  const re=/^\s*@import\s+["'](?<path>\.\/[^"']+)\?v=unversioned["'];\s*$/gm;
  const imports=[...manifest.matchAll(re)].map((m)=>m.groups?.path).filter((value):value is string=>Boolean(value));
  assert(imports.length>0,'No CSS imports were found to bundle');assert(new Set(imports).size===imports.length,'Duplicate CSS imports found while bundling');
  assert(manifest.replace(re,'').trim()==='','override/main.css contains non-import content; refusing unsafe bundle');
  const chunks=imports.map((importPath)=>{const source=path.join(path.dirname(file),importPath.slice(2));assert(fs.existsSync(source),`Missing CSS source while bundling: ${source}`);const content=read(source);assert(!content.includes('@import'),`Nested CSS import found while bundling: ${source}`);return `/* origen: ${importPath} */\n${rebaseCssUrls(file,source,content).trimEnd()}`;});
  write(file,chunks.join('\n\n')+'\n');
}

const RUNTIME_TAIL=`var SC=window.SCOverride;
function releaseReveal(){
  var root=document.documentElement;
  if(!root)return;
  root.setAttribute('data-sc-catalog-reveal-ready','true');
  root.classList.remove('sc-catalog-reveal-prepaint');
}
function waitForDomReady(){
  if(document.readyState!=='loading')return Promise.resolve();
  return new Promise(function(resolve){document.addEventListener('DOMContentLoaded',resolve,{once:true});});
}
if(!SC||!SC.renderLifecycle)throw new Error('[SushiClub override] Render lifecycle unavailable');
Promise.resolve()
  .then(function(){
    var templates=SC.templates;
    if(!templates||!templates.ready)throw new Error('Template registry unavailable');
    return templates.ready();
  })
  .then(function(){
    var motion=SC.motion;
    return motion&&motion.prepare?motion.prepare():null;
  })
  .then(waitForDomReady)
  .then(function(){
    var lifecycle=SC.renderLifecycle,motion=SC.motion;
    lifecycle.markInitialViewport();
    if(lifecycle.freezeInitialViewport)lifecycle.freezeInitialViewport();
    if(motion)motion.unlock();
    releaseReveal();
    return lifecycle.waitForStableLayout();
  })
  .then(function(){
    var motion=SC.motion;
    if(motion&&motion.refresh)motion.refresh(0);
  })
  .catch(function(error){
    releaseReveal();
    if(window.console&&console.error)console.error('[SushiClub override] Error iniciando módulos',error);
  });`;

function bundleJs():void{
  const file=path.join(SITE,'override/main.js'),runtimeFile=path.join(SITE,'override/runtime-main.js'),runtime=read(runtimeFile);
  const entries=[...runtime.matchAll(/\[\s*'(?<path>[^']+\.js)'\s*,\s*'(?<id>[^']+)'\s*\]/g)].map((m)=>({path:m.groups?.path,id:m.groups?.id})).filter((item):item is {path:string;id:string}=>Boolean(item.path&&item.id));
  assert(entries.length>0,'No override runtime module entries were found to bundle');
  assert(new Set(entries.map((e)=>e.path)).size===entries.length,'Duplicate JS module paths found while bundling');
  assert(new Set(entries.map((e)=>e.id)).size===entries.length,'Duplicate JS module ids found while bundling');
  const declared=new Set([...runtime.matchAll(/'([^']+\.js)'/g)].map((m)=>m[1]).filter((v):v is string=>Boolean(v))),captured=new Set(entries.map((e)=>e.path));
  assert(declared.size===captured.size&&[...declared].every((v)=>captured.has(v)),'JS bundle manifest mismatch');
  const modules=entries.map(({path:modulePath})=>{const source=path.join(path.dirname(file),modulePath);assert(fs.existsSync(source),`Missing JS source while bundling: ${source}`);return `/* módulo: ${modulePath} */\n${read(source).trimEnd()}`;});
  write(file,["(function(){","'use strict';","if(window.__scOverrideEntryBooted||window.__scOverrideMainBooted)return;","window.__scOverrideEntryBooted=true;window.__scOverrideMainBooted=true;",'',modules.join('\n\n'),'',RUNTIME_TAIL,'})();',''].join('\n'));
}

function verify(sha:string):void{
  const index=read(path.join(SITE,'index.html')),bootstrap=read(path.join(SITE,'_js_dev/main.js')),css=read(path.join(SITE,'override/main.css')),js=read(path.join(SITE,'override/main.js'));
  assert(index.includes(`_js_dev/main.js?v=${sha}`),'Stamped main.js entrypoint is missing');
  for(const asset of [`_js_dev/main-legacy.js?v=${sha}`,`override/main.css?v=${sha}`,`override/main.js?v=${sha}`])assert(index.includes('rel="preload"')&&index.includes(asset),`Preload hint is missing for ${asset}`);
  for(const origin of ['https://fonts.googleapis.com','https://fonts.gstatic.com','https://cdn.jsdelivr.net'])assert(index.includes(`rel="preconnect" href="${origin}"`),`Preconnect hint is missing for ${origin}`);
  assert((index.match(/<link\s+rel="preload"\s+href="fuentes\/AcuminPro-(?:Regular|Semibold)\.woff2"\s+as="font"\s+type="font\/woff2"\s+crossorigin>/gi)??[]).length===2,'Acumin font preloads must include crossorigin');
  assert(/<img\b(?=[^>]*\bclass="[^"]*\bimgBannerShop\b[^"]*")(?=[^>]*\bloading="eager")(?=[^>]*\bdecoding="async")(?=[^>]*\bfetchpriority="high")[^>]*>/i.test(index),'Catalogue banner must be eager, async-decoded and high priority');
  assert(index.includes('loading="lazy"')&&index.includes('decoding="async"'),'Native lazy product image attributes are missing');
  assert(!index.includes('maps.googleapis.com/maps/api/js')&&!index.includes('_js_dev/mapKrc.js')&&!index.includes('js/main_shop_maps__q_9fc895e1.js'),'Unused Google Maps runtime remains in the Pages artifact');
  assert(bootstrap.includes(`var version='${sha}';`),'Stamped bootstrap version is missing');
  assert(!css.includes('@import'),'CSS imports remain in bundled Pages artifact');
  assert(!js.includes('loadStages(['),'Development staged loader remains in bundled Pages artifact');
  assert(js.includes('components/section-heading/section-heading.js'),'Section heading module is missing from bundled Pages artifact');
}

export function prepareArtifact():void{
  const sha=githubSha();
  stampEntrypoint(sha);stampBootstrap(sha);bundleCss();bundleJs();verify(sha);
}
