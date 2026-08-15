(function(){
'use strict';
var SC=window.SCOverride,utils=SC&&SC.utils,CFG=SC&&SC.config,S=CFG&&CFG.selectors,L=CFG&&CFG.labels;if(!SC||!utils||!CFG||SC.__domNormalizationBooted)return;SC.__domNormalizationBooted=true;
var each=utils.each,matches=utils.matches,observer=null;
var TARGETS=[
  S.legacyCategoryAnchor,
  S.legacySearchBox,
  S.legacySearchResults,
  S.orderLink,
  S.styledProductImage,
  S.preferredStoreSelect,
  S.newsletterInput,
  S.legacyCloseButton,
  S.cartLink,
  S.socialFacebook,
  S.socialInstagram,
  S.socialTiktok,
  S.socialPinterest
].join(',');

function repairCategoryAnchor(anchor){
  var name=anchor.getAttribute('name');if(name&&anchor.id!==name)anchor.id=name;
}
function removeLegacySearch(node){if(node.parentNode)node.parentNode.removeChild(node);}
function setAccessibleName(node,label){if(!node.hasAttribute('aria-label')&&!node.hasAttribute('aria-labelledby'))node.setAttribute('aria-label',label);}
function enhanceBanner(link){
  if(!link.querySelector(S.banner))return;
  setAccessibleName(link,L.bannerOrder);
  each(link.querySelectorAll(S.bannerImage),function(img){img.setAttribute('alt','');});
}
function cleanProductImageStage(stage){
  ['background-image','background-size','background-position','background-repeat'].forEach(function(prop){stage.style.removeProperty(prop);});
  if(!stage.getAttribute('style')||!stage.getAttribute('style').trim())stage.removeAttribute('style');
}
function enhanceSocialLink(link){
  var label='';
  if(matches(link,S.socialFacebook))label=L.social.facebook;
  else if(matches(link,S.socialInstagram))label=L.social.instagram;
  else if(matches(link,S.socialTiktok))label=L.social.tiktok;
  else if(matches(link,S.socialPinterest))label=L.social.pinterest;
  if(!label)return;
  setAccessibleName(link,label);
  if(link.target==='_blank')link.setAttribute('rel','noopener noreferrer');
  each(link.querySelectorAll(S.genericImage),function(img){img.setAttribute('alt','');});
}
function handle(node){
  if(matches(node,S.legacyCategoryAnchor))repairCategoryAnchor(node);
  if(matches(node,S.legacySearchBox+','+S.legacySearchResults)){removeLegacySearch(node);return;}
  if(matches(node,S.orderLink))enhanceBanner(node);
  if(matches(node,S.styledProductImage))cleanProductImageStage(node);
  if(matches(node,S.preferredStoreSelect))setAccessibleName(node,L.preferredStore);
  if(matches(node,S.newsletterInput))setAccessibleName(node,L.newsletterEmail);
  if(matches(node,S.legacyCloseButton))setAccessibleName(node,L.close);
  if(matches(node,S.cartLink))setAccessibleName(node,L.cart);
  if(matches(node,[S.socialFacebook,S.socialInstagram,S.socialTiktok,S.socialPinterest].join(',')))enhanceSocialLink(node);
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
