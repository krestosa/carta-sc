(function(){
'use strict';
var SC=window.SCOverride,utils=SC&&SC.utils;if(!SC||!utils||SC.__domNormalizationBooted)return;SC.__domNormalizationBooted=true;
var each=utils.each,matches=utils.matches,observer=null;
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

function repairCategoryAnchor(anchor){
  var name=anchor.getAttribute('name');if(name&&anchor.id!==name)anchor.id=name;
}
function removeLegacySearch(node){if(node.parentNode)node.parentNode.removeChild(node);}
function setAccessibleName(node,label){if(!node.hasAttribute('aria-label')&&!node.hasAttribute('aria-labelledby'))node.setAttribute('aria-label',label);}
function enhanceBanner(link){
  if(!link.querySelector('.bannerShop'))return;
  setAccessibleName(link,'Pedilo Online — promoción de SushiClub');
  each(link.querySelectorAll('.bannerShop img'),function(img){img.setAttribute('alt','');});
}
function cleanProductImageStage(stage){
  ['background-image','background-size','background-position','background-repeat'].forEach(function(prop){stage.style.removeProperty(prop);});
  if(!stage.getAttribute('style')||!stage.getAttribute('style').trim())stage.removeAttribute('style');
}
function enhanceSocialLink(link){
  var href=link.getAttribute('href')||'',label='';
  if(href.indexOf('facebook.com/sushiclubargentina')!==-1)label='Facebook de SushiClub';
  else if(href.indexOf('instagram.com/SushiClub_ar')!==-1)label='Instagram de SushiClub';
  else if(href.indexOf('tiktok.com/@sushiclub_ar')!==-1)label='TikTok de SushiClub';
  else if(href.indexOf('pinterest.com/sushiclub')!==-1)label='Pinterest de SushiClub';
  if(!label)return;
  setAccessibleName(link,label);
  if(link.target==='_blank')link.setAttribute('rel','noopener noreferrer');
  each(link.querySelectorAll('img'),function(img){img.setAttribute('alt','');});
}
function handle(node){
  if(matches(node,'a[name^="anchor"]'))repairCategoryAnchor(node);
  if(matches(node,'#busquedaJSBox,#busquedaJSBoxResults')){removeLegacySearch(node);return;}
  if(matches(node,'a[href*="/pedidosonline"]'))enhanceBanner(node);
  if(matches(node,'.imgShop[style]'))cleanProductImageStage(node);
  if(matches(node,'select[name="sucursalNews"]'))setAccessibleName(node,'Espacio preferido');
  if(matches(node,'input.newsMail'))setAccessibleName(node,'Email para newsletter');
  if(matches(node,'button.close'))setAccessibleName(node,'Cerrar');
  if(matches(node,'a.shopMenuRightIcon'))setAccessibleName(node,'Ver carrito');
  if(matches(node,'a[href*="facebook.com/sushiclubargentina"],a[href*="instagram.com/SushiClub_ar"],a[href*="tiktok.com/@sushiclub_ar"],a[href*="pinterest.com/sushiclub"]'))enhanceSocialLink(node);
}
function scan(root){
  if(matches(root,TARGETS))handle(root);
  if(root&&root.querySelectorAll)each(root.querySelectorAll(TARGETS),handle);
}
function disconnect(){if(observer){observer.disconnect();observer=null;}}
function start(){
  scan(document);
  disconnect();
  if(!window.MutationObserver||!document.body)return;
  observer=new MutationObserver(function(mutations){
    mutations.forEach(function(mutation){each(mutation.addedNodes,scan);});
  });
  observer.observe(document.body,{childList:true,subtree:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
SC.mutations=SC.mutations||{};
SC.mutations.scanLegacyDom=scan;
SC.mutations.disconnectLegacyDom=disconnect;
})();