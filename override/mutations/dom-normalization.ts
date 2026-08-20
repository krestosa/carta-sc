(function(){
'use strict';
/* Normaliza fragmentos del DOM heredado que interfieren con la capa nueva. Corrige nombres
   accesibles, anchors y restos visuales sin modificar la estructura de negocio original. */
var SC=window.SCOverride,utils=SC&&SC.utils,CFG=SC&&SC.config,S=CFG&&CFG.selectors;if(!SC||!utils||!CFG||SC.__domNormalizationBooted)return;SC.__domNormalizationBooted=true;
var each=utils.each,matches=utils.matches,observer:MutationObserver|null=null,initialized=false,readyHandler:(()=>void)|null=null;
var TARGETS=[
  'a[name^="anchor"]',
  '#busquedaJSBox',
  '#busquedaJSBoxResults',
  'a[href*="/pedidosonline"]',
  '.imgShop[style]',
  'select[name="sucursalNews"]',
  'input.newsMail',
  'button.close',
  'a.shopMenuRightIcon',
  'a[href*="facebook.com/sushiclubargentina"]',
  'a[href*="instagram.com/SushiClub_ar"]',
  'a[href*="tiktok.com/@sushiclub_ar"]',
  'a[href*="pinterest.com/sushiclub"]'
].join(',');

/* Reparaciones puntuales sobre nodos legacy ya existentes o agregados dinámicamente. */
function repairCategoryAnchor(anchor:Element):void{var name=anchor.getAttribute('name');if(name&&anchor.id!==name)anchor.id=name;}
function removeLegacySearch(node:Element):void{if(node.parentNode)node.parentNode.removeChild(node);}
function setAccessibleName(node:Element,label:string):void{if(!node.hasAttribute('aria-label')&&!node.hasAttribute('aria-labelledby'))node.setAttribute('aria-label',label);}
function enhanceBanner(link:Element):void{
  if(!link.querySelector('.bannerShop'))return;setAccessibleName(link,'Pedilo Online — promoción de SushiClub');each(link.querySelectorAll<HTMLImageElement>('.bannerShop img'),function(img:HTMLImageElement):void{img.setAttribute('alt','');});
}
function cleanProductImageStage(stage:HTMLElement):void{
  ['background-image','background-size','background-position','background-repeat'].forEach(function(prop:string):void{stage.style.removeProperty(prop);});
  var style=stage.getAttribute('style');if(!style||!style.trim())stage.removeAttribute('style');
}
function enhanceSocialLink(link:HTMLAnchorElement):void{
  var label='';
  if(matches(link,'a[href*="facebook.com/sushiclubargentina"]'))label='Facebook de SushiClub';
  else if(matches(link,'a[href*="instagram.com/SushiClub_ar"]'))label='Instagram de SushiClub';
  else if(matches(link,'a[href*="tiktok.com/@sushiclub_ar"]'))label='TikTok de SushiClub';
  else if(matches(link,'a[href*="pinterest.com/sushiclub"]'))label='Pinterest de SushiClub';
  if(!label)return;setAccessibleName(link,label);if(link.target==='_blank')link.setAttribute('rel','noopener noreferrer');each(link.querySelectorAll<HTMLImageElement>('img'),function(img:HTMLImageElement):void{img.setAttribute('alt','');});
}
function handle(node:Element):void{
  if(matches(node,'a[name^="anchor"]'))repairCategoryAnchor(node);
  if(matches(node,'#busquedaJSBox'+','+'#busquedaJSBoxResults')){removeLegacySearch(node);return;}
  if(matches(node,'a[href*="/pedidosonline"]'))enhanceBanner(node);
  if(matches(node,'.imgShop[style]')&&node instanceof HTMLElement)cleanProductImageStage(node);
  if(matches(node,'select[name="sucursalNews"]'))setAccessibleName(node,'Espacio preferido');
  if(matches(node,'input.newsMail'))setAccessibleName(node,'Email para newsletter');
  if(matches(node,'button.close'))setAccessibleName(node,'Cerrar');
  if(matches(node,'a.shopMenuRightIcon'))setAccessibleName(node,'Ver carrito');
  if(matches(node,['a[href*="facebook.com/sushiclubargentina"]','a[href*="instagram.com/SushiClub_ar"]','a[href*="tiktok.com/@sushiclub_ar"]','a[href*="pinterest.com/sushiclub"]'].join(','))&&node instanceof HTMLAnchorElement)enhanceSocialLink(node);
}
function scan(root:Node):void{
  if(root instanceof Element&&matches(root,TARGETS))handle(root);
  if(root instanceof Document||root instanceof DocumentFragment||root instanceof Element)each(root.querySelectorAll<Element>(TARGETS),handle);
}

/* Completa semántica global mínima y observa únicamente altas de nodos relevantes. */
function normalizeDocumentLanguage():void{var root=document.documentElement;if(root&&!root.lang)root.lang='es-AR';}
function normalizeMainLandmark():void{if(document.querySelector('main,[role="main"]'))return;var main=document.querySelector(S.container);if(main)main.setAttribute('role','main');}
function disconnect():void{if(observer){observer.disconnect();observer=null;}}
function init():void{
  if(initialized)return;initialized=true;normalizeDocumentLanguage();normalizeMainLandmark();scan(document);disconnect();if(!window.MutationObserver||!document.body)return;
  observer=new MutationObserver(function(mutations:MutationRecord[]):void{mutations.forEach(function(mutation:MutationRecord):void{each(mutation.addedNodes,function(node:Node):void{scan(node);});});});observer.observe(document.body,{childList:true,subtree:true});
}
function destroy():void{initialized=false;disconnect();if(readyHandler){document.removeEventListener('DOMContentLoaded',readyHandler);readyHandler=null;}}
function boot():void{readyHandler=null;init();}
SC.mutations=SC.mutations||{};SC.mutations.scanLegacyDom=scan;SC.mutations.disconnectLegacyDom=disconnect;SC.mutations.domNormalization={init:init,destroy:destroy,scan:scan};
if(document.readyState==='loading'){readyHandler=boot;document.addEventListener('DOMContentLoaded',readyHandler,{once:true});}else init();
})();
