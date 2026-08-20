import fs from 'node:fs';
import path from 'node:path';
import { SITE, assert, ensureDir, githubSha, read, write } from '../lib/core.js';

const LEGACY_STYLES = [
  '_css_dev/font-awesome.min.css','_css_dev/bootstrap.min.css','_css_dev/fnt-helvlig.css','_css_dev/fontBar.css',
  '_css_dev/jquery.fancybox.css','_css_dev/jquery.fancybox-buttons.css','_css_dev/slick.css','_css_dev/slick-theme.css',
  '_css_dev/sweetalert2.min.css','_css_dev/slicknav__q_dd9216b6.css','_css_dev/nyroModal_wkTheme.css','_css_dev/daterangepicker.css',
  '_css_dev/styles.css','_css_dev/styles_newver17.css','css/styles_shop__q_a48cd660.css','css/_aux__q_a48cd660.css',
] as const;
const LEGACY_SCRIPTS = [
  '_js_dev/modernizr-2.6.1-respond-1.1.0.min.js','_js_dev/jquery.easing.1.3.min.js','js/bootstrap.min.js',
  '_js_dev/jquery.cycle2.min.js','_js_dev/jquery.slicknav.js','_js_dev/jquery.nyroModal.custom.js','_js_dev/jquery.livequery.min.js',
  '_js_dev/jquery.fancybox.js','_js_dev/jquery.fancybox-buttons.js','_js_dev/jquery.fancybox-media.js','_js_dev/moment.min.js',
  '_js_dev/daterangepicker.js','_js_dev/imgLiquid.js','_js_dev/slick.min.js','_js_dev/sweetalert2.min.js','_js_dev/plugins.js',
] as const;
const SHOP_SCRIPTS = ['js/funcionesShop__q_f352afe3.js','js/main_shop__q_a48cd660.js'] as const;
const DATE_FLOW_JS = ['_js_dev/moment.min.js','_js_dev/daterangepicker.js'] as const;
const DATE_FLOW_CSS = ['_css_dev/daterangepicker.css'] as const;

function escaped(value:string):string{return value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function sourceBlock(source:string):RegExp{return new RegExp(`/\\* origen: ${escaped(source)} \\*/\\n.*?(?=\\n\\n/\\* origen:|$)`,'s');}
function scriptPattern(src:string):RegExp{return new RegExp(`<script\\b(?=[^>]*\\bsrc=["']${escaped(src)}["'])[^>]*>\\s*</script>`,'i');}
function linkPattern(href:string):RegExp{return new RegExp(`<link\\b(?=[^>]*\\bhref=["']${escaped(href)}["'])[^>]*>`,'i');}
function removeCommented(html:string,tag:'script'|'link',asset:string):string{
  const attr=tag==='script'?'src':'href';
  const tail=tag==='script'?'[^>]*>\\s*</script>':'[^>]*>';
  return html.replace(new RegExp(`<!--\\s*<${tag}\\b(?=[^>]*\\b${attr}=["']${escaped(asset)}["'])${tail}\\s*-->`,'ig'),'');
}
function rebaseUrls(source:string,bundle:string,content:string):string{
  return content.replace(/url\(\s*(["']?)(.*?)\1\s*\)/gi,(whole:string,quote:string,value:string)=>{
    const raw=value.trim();if(!raw||/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(raw))return whole;
    const match=raw.match(/^([^?#]+)([?#].*)?$/);if(!match)return whole;
    const resolved=path.normalize(path.join(path.dirname(source),match[1]??''));
    const rebased=path.relative(path.dirname(bundle),resolved).split(path.sep).join('/');
    return `url(${quote}${rebased}${match[2]??''}${quote})`;
  });
}
function normalizeLegacyFonts(href:string,content:string):string{
  if(href==='_css_dev/font-awesome.min.css'){
    const pattern=/@font-face\s*\{\s*font-family\s*:\s*['"]FontAwesome['"].*?\}/is;
    assert(pattern.test(content),'Could not normalize Font Awesome @font-face exactly once');
    content=content.replace(pattern,"@font-face{font-family:'FontAwesome';src:url('../fonts/fontawesome-webfont__q_fb3a7b16.woff2') format('woff2');font-weight:normal;font-style:normal;font-display:swap}");
  }else if(href==='_css_dev/slick-theme.css'){
    const face=/@font-face\s*\{\s*font-family\s*:\s*['"]slick['"].*?\}/is;
    assert(face.test(content),'Could not remove Slick @font-face');content=content.replace(face,'');
    const before=content;content=content.replace(/font-family\s*:\s*['"]slick['"]\s*;/gi,'font-family: Arial, sans-serif;');
    assert(content!==before,'No Slick pseudo-element font declarations were normalized');
  }
  return content;
}

export function bundleLegacyCss():void{
  const sha=githubSha(),index=path.join(SITE,'index.html'),bundle=path.join(SITE,'_pages','legacy.css');let html=read(index);const output:string[]=[];
  for(const href of LEGACY_STYLES)html=removeCommented(html,'link',href);
  LEGACY_STYLES.forEach((href,position)=>{
    const pattern=linkPattern(href),matches=html.match(new RegExp(pattern.source,'ig'))??[];assert(matches.length===1,`Expected one active stylesheet tag for ${href}, found ${matches.length}`);
    const tag=matches[0]??'';assert(/\brel=["']stylesheet["']/i.test(tag),`Non-stylesheet link matched for ${href}`);
    const media=tag.match(/\bmedia=["']([^"']+)["']/i)?.[1];assert(!media||media.trim().toLowerCase()==='all',`Cannot bundle ${href} with media=${media}`);
    const source=path.join(SITE,href);assert(fs.existsSync(source),`Missing legacy stylesheet: ${href}`);let content=read(source).replace(/^\s*@charset\s+["'][^"']+["'];\s*/i,'');
    assert(!/@import\b/i.test(content),`Nested @import in ${href}`);content=normalizeLegacyFonts(href,content);output.push(`/* origen: ${href} */\n${rebaseUrls(source,bundle,content).trimEnd()}`);
    html=html.replace(pattern,position===0?`<link href="_pages/legacy.css?v=${sha}" rel="stylesheet" media="all" type="text/css">`:'');
  });
  ensureDir(path.dirname(bundle));write(bundle,`${output.join('\n\n')}\n`);write(index,html);
  assert(html.split(`_pages/legacy.css?v=${sha}`).length-1===1,'Legacy CSS bundle link must appear exactly once');
  const text=read(bundle);assert((text.match(/^\/\* origen:/gm)??[]).length===LEGACY_STYLES.length,'Legacy CSS source count mismatch');
  assert(!/fontawesome-webfont\.(?:eot|ttf|svg)|fontawesome-webfont\.woff\?/i.test(text),'Obsolete Font Awesome fallbacks remain');
  assert(!/url\([^)]*fonts\/slick\.(?:eot|woff|ttf|svg)/i.test(text),'Missing Slick font URLs remain');
  assert(text.includes("font-family:'FontAwesome'")&&text.includes('font-display:swap'),'Font Awesome must use font-display:swap');
}

export function bundleLegacyJs():void{
  const sha=githubSha(),index=path.join(SITE,'index.html'),bundle=path.join(SITE,'_pages','legacy.js');let html=read(index);const output:string[]=[];
  for(const src of LEGACY_SCRIPTS)html=removeCommented(html,'script',src);
  LEGACY_SCRIPTS.forEach((src,position)=>{
    const pattern=scriptPattern(src),matches=html.match(new RegExp(pattern.source,'ig'))??[];assert(matches.length===1,`Expected one active script for ${src}, found ${matches.length}`);
    const tag=matches[0]??'';assert(!/\b(?:async|defer)\b/i.test(tag),`Cannot bundle async/defer script ${src}`);
    const type=tag.match(/\btype=["']([^"']+)["']/i)?.[1]?.trim().toLowerCase();assert(!type||type==='text/javascript'||type==='application/javascript',`Unsupported script type for ${src}`);
    const source=path.join(SITE,src);assert(fs.existsSync(source),`Missing legacy script: ${src}`);const content=read(source);assert(!/\bdocument\.currentScript\b|\bimport\.meta\b/.test(content),`Per-file semantics in ${src}`);
    output.push(`/* origen: ${src} */\n${content.trimEnd()}\n;`);html=html.replace(pattern,position===0?`<script src="_pages/legacy.js?v=${sha}" type="text/javascript"></script>`:'');
  });
  ensureDir(path.dirname(bundle));write(bundle,`${output.join('\n\n')}\n`);write(index,html);assert((read(bundle).match(/^\/\* origen:/gm)??[]).length===LEGACY_SCRIPTS.length,'Legacy JS source count mismatch');
}

function pruneSourceBlock(file:string,source:string):void{let text=read(file);const pattern=sourceBlock(source);assert(pattern.test(text),`Expected bundled source block for ${source}`);text=text.replace(pattern,`/* origen: ${source} (omitido: flujo de fecha inactivo) */`);write(file,text);}
export async function bundleShopJs(externalize:()=>void|Promise<void>):Promise<void>{
  const sha=githubSha(),index=path.join(SITE,'index.html'),bundle=path.join(SITE,'_pages','shop.js'),legacyJs=path.join(SITE,'_pages','legacy.js'),legacyCss=path.join(SITE,'_pages','legacy.css');let html=read(index);const output:string[]=[];
  const dateFlowPresent=/\bid=["']dateInit["']/i.test(html)||/\bshopfunc_(?:start|submit)_init\s*\(/.test(html);
  const positions=SHOP_SCRIPTS.map(src=>{const pattern=scriptPattern(src),match=pattern.exec(html);assert(match,`Missing shop script ${src}`);return {start:match.index,end:match.index+match[0].length};});
  assert(!/\S/.test(html.slice(positions[0]?.end??0,positions[1]?.start??0)),'Unexpected markup between shop scripts');
  SHOP_SCRIPTS.forEach((src,position)=>{const pattern=scriptPattern(src);const tag=pattern.exec(html)?.[0]??'';assert(tag&&!/\b(?:async|defer)\b/i.test(tag),`Cannot bundle shop script ${src}`);const source=path.join(SITE,src);assert(fs.existsSync(source),`Missing shop script ${src}`);let content=read(source);
    if(!dateFlowPresent&&src==='js/main_shop__q_a48cd660.js'){const before=content;content=content.replace(/^([\t ]*)moment\.locale\(\s*['"]es['"]\s*\);\s*$/m,"$1if (window.moment) moment.locale('es');");assert(content!==before,'Expected one moment.locale call');}
    assert(!/\bdocument\.currentScript\b|\bimport\.meta\b/.test(content),`Per-file semantics in ${src}`);output.push(`/* origen: ${src} */\n${content.trimEnd()}\n;`);html=html.replace(pattern,position===0?`<script src="_pages/shop.js?v=${sha}" type="text/javascript"></script>`:'');
  });
  ensureDir(path.dirname(bundle));write(bundle,`${output.join('\n\n')}\n`);write(index,html);
  if(!dateFlowPresent){for(const src of DATE_FLOW_JS)pruneSourceBlock(legacyJs,src);for(const href of DATE_FLOW_CSS)pruneSourceBlock(legacyCss,href);}
  assert((read(bundle).match(/^\/\* origen:/gm)??[]).length===SHOP_SCRIPTS.length,'Shop JS source count mismatch');await externalize();
}
