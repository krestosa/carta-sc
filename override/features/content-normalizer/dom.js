(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.contentNormalizer,R=C&&C.rules;
if(!SC||!C||!R||SC.__contentNormalizerDomBooted)return;SC.__contentNormalizerDomBooted=true;
var HOST_SELECTOR='.titleShopSeccion,.subTitleShopSeccion,.productoShop .title-shop1,.productoShop .descrip';
function textNodes(root,skipSelector){
  var nodes=[],walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(node){var parent=node.parentElement;if(!parent||parent.closest('script,style')||(skipSelector&&parent.closest(skipSelector)))return NodeFilter.FILTER_REJECT;return NodeFilter.FILTER_ACCEPT;}}),node;
  while((node=walker.nextNode()))nodes.push(node);return nodes;
}
function normalizeUpper(root){textNodes(root).forEach(function(node){var next=R.titlePeriodClean(node.nodeValue).toLocaleUpperCase('es-AR');if(next!==node.nodeValue)node.nodeValue=next;});}
function normalizeEditorial(root,options){var state={sentenceStart:true,words:0};textNodes(root,options&&options.skip).forEach(function(node){var next=R.smartCase(node.nodeValue,state,!!(options&&options.removePeriods));if(next!==node.nodeValue)node.nodeValue=next;});}
function unwrapTypography(description){
  description.querySelectorAll('b,strong').forEach(function(node){var parent=node.parentNode;if(!parent)return;while(node.firstChild)parent.insertBefore(node.firstChild,node);parent.removeChild(node);});
  description.querySelectorAll('[style]').forEach(function(node){['font-family','font-size','font-weight','font-style','text-transform','letter-spacing','line-height'].forEach(function(prop){node.style.removeProperty(prop);});if(!node.getAttribute('style')||!node.getAttribute('style').trim())node.removeAttribute('style');});
}
function normalizeHost(host){
  if(!host||host.nodeType!==1||!document.documentElement.contains(host))return;
  if(host.matches('.titleShopSeccion,.subTitleShopSeccion'))return normalizeUpper(host);
  if(host.matches('.productoShop .title-shop1'))return normalizeEditorial(host,{skip:'.sabores',removePeriods:true});
  if(host.matches('.productoShop .descrip')){unwrapTypography(host);normalizeEditorial(host,{removePeriods:false});}
}
function normalizeCatalogue(){document.querySelectorAll(HOST_SELECTOR).forEach(normalizeHost);}
function collect(node,target){var el=node&&node.nodeType===1?node:node&&node.parentElement;if(!el)return;var host=el.closest&&el.closest(HOST_SELECTOR);if(host)target.add(host);if(el.querySelectorAll)el.querySelectorAll(HOST_SELECTOR).forEach(function(item){target.add(item);});}
C.dom={selector:HOST_SELECTOR,normalizeHost:normalizeHost,normalizeCatalogue:normalizeCatalogue,collect:collect};
})();