(function(){
'use strict';
var SC=window.SCOverride,utils=SC&&SC.utils;if(!SC||!utils||SC.__domNormalizationBooted)return;SC.__domNormalizationBooted=true;
var each=utils.each,matches=utils.matches;
var TARGETS='a[name^="anchor"],#busquedaJSBox,#busquedaJSBoxResults,a[href*="/pedidosonline"]';

function repairCategoryAnchor(anchor){
  var name=anchor.getAttribute('name');if(name&&anchor.id!==name)anchor.id=name;
}
function removeLegacySearch(node){if(node.parentNode)node.parentNode.removeChild(node);}
function enhanceBanner(link){
  if(!link.querySelector('.bannerShop'))return;
  link.setAttribute('aria-label','Pedilo Online — promoción de SushiClub');
  each(link.querySelectorAll('.bannerShop img'),function(img){img.setAttribute('alt','');});
}
function handle(node){
  if(matches(node,'a[name^="anchor"]'))repairCategoryAnchor(node);
  if(matches(node,'#busquedaJSBox,#busquedaJSBoxResults')){removeLegacySearch(node);return;}
  if(matches(node,'a[href*="/pedidosonline"]'))enhanceBanner(node);
}
function scan(root){
  if(matches(root,TARGETS))handle(root);
  if(root&&root.querySelectorAll)each(root.querySelectorAll(TARGETS),handle);
}
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
