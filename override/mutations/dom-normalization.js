(function(){
'use strict';
var SC=window.SCOverride,utils=SC&&SC.utils;if(!SC||!utils||SC.__domNormalizationBooted)return;SC.__domNormalizationBooted=true;
var each=utils.each,matches=utils.matches;

function repairCategoryAnchors(root){
  var nodes=[];
  if(matches(root,'a[name^="anchor"]'))nodes.push(root);
  if(root&&root.querySelectorAll)each(root.querySelectorAll('a[name^="anchor"]'),function(node){nodes.push(node);});
  nodes.forEach(function(anchor){var name=anchor.getAttribute('name');if(name&&anchor.id!==name)anchor.id=name;});
}
function removeLegacySearch(root){
  var nodes=[];
  if(matches(root,'#busquedaJSBox,#busquedaJSBoxResults'))nodes.push(root);
  if(root&&root.querySelectorAll)each(root.querySelectorAll('#busquedaJSBox,#busquedaJSBoxResults'),function(node){nodes.push(node);});
  nodes.forEach(function(node){if(node.parentNode)node.parentNode.removeChild(node);});
}
function enhanceBanner(root){
  var links=[];
  if(matches(root,'a[href*="/pedidosonline"]'))links.push(root);
  if(root&&root.querySelectorAll)each(root.querySelectorAll('a[href*="/pedidosonline"]'),function(node){links.push(node);});
  links.forEach(function(link){
    if(!link.querySelector('.bannerShop'))return;
    link.setAttribute('aria-label','Pedilo Online — promoción de SushiClub');
    each(link.querySelectorAll('.bannerShop img'),function(img){img.setAttribute('alt','');});
  });
}
function scan(root){repairCategoryAnchors(root);removeLegacySearch(root);enhanceBanner(root);}
scan(document);
if(window.MutationObserver&&document.documentElement){
  var observer=new MutationObserver(function(mutations){
    mutations.forEach(function(mutation){each(mutation.addedNodes,scan);});
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
}
SC.mutations=SC.mutations||{};
SC.mutations.scanLegacyDom=scan;
})();