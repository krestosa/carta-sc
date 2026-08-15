(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config;if(!SC||!U||!C||SC.__categoryNavCoreBooted)return;SC.__categoryNavCoreBooted=true;
var N=SC.categoryNav=SC.categoryNav||{},each=U.each;
N.mq=C.desktopQuery;

function anchor(href){
  if(!href||href[0]!=='#'||href==='#')return null;
  var id=href.slice(1);try{id=decodeURIComponent(id);}catch(_){}
  return document.getElementById(id)||document.getElementsByName(id)[0]||null;
}
function parentLink(a){return !!(a&&a.matches&&a.matches('a.anchorLink[href^="#"]')&&!a.classList.contains('anchorLinkSub')&&!a.closest('.topPullDown,.dropdown-menu'));}
function links(root){return Array.prototype.filter.call((root||document).querySelectorAll('a.anchorLink[href^="#"]'),parentLink);}
function offset(){
  var bottom=0;
  ['.topBar','.topShop','.sc-catalog-toolbar','.fixedTopShop.wtopShopMenuMobile'].forEach(function(selector){
    each(document.querySelectorAll(selector),function(node){
      if(!U.visible(node))return;
      var style=getComputedStyle(node),rect=node.getBoundingClientRect();
      if((style.position==='fixed'||style.position==='sticky')&&rect.top<=2&&rect.bottom>0)bottom=Math.max(bottom,rect.bottom);
    });
  });
  return Math.ceil(Math.max(0,bottom))+12;
}
function closeLegacy(){
  if(SC.mutations&&SC.mutations.closeLegacyCategoryMenus)return SC.mutations.closeLegacyCategoryMenus();
  each(document.querySelectorAll('.topPullDown.open'),function(node){node.classList.remove('open');});
  each(document.querySelectorAll('.topShopMenuMobile._open'),function(node){node.classList.remove('_open');});
}
function cleanHash(){
  if(SC.mutations&&SC.mutations.cleanCategoryHash)return SC.mutations.cleanCategoryHash();
  if(/^#anchor/i.test(location.hash||''))try{history.replaceState(history.state,document.title,location.pathname+location.search);}catch(_){}
}
function scrollToTarget(target){
  var y=target.getBoundingClientRect().top+(pageYOffset||document.documentElement.scrollTop||0)-offset();
  var max=Math.max(0,document.documentElement.scrollHeight-innerHeight);y=Math.max(0,Math.min(max,y));
  try{scrollTo({top:y,left:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}catch(_){scrollTo(0,y);}
}
function onCategory(event){
  if(event.defaultPrevented||event.button>0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  var link=event.target&&event.target.closest?event.target.closest('a.anchorLink, a.anchorLinkSub'):null;
  if(!link||link.closest('.topPullDown,.dropdown-menu')||!(link.closest('.sc-catalog-toolbar')||link.closest('.wtopShopMenuMobile .topShopMenuMobile')))return;
  var target=anchor(link.getAttribute('href'));if(!target)return;
  event.preventDefault();event.stopImmediatePropagation();closeLegacy();cleanHash();
  if(N.setActive)N.setActive(target,true);scrollToTarget(target);
}
function onSelect(event){
  var select=event.target;if(!select||!select.matches||!select.matches('.JSgoMenu'))return;
  var target=anchor(select.value);if(!target)return;
  event.preventDefault();event.stopImmediatePropagation();closeLegacy();cleanHash();
  if(N.setActive)N.setActive(target,true);scrollToTarget(target);
}

N.resolveAnchor=N.anchor=anchor;
N.parentLink=parentLink;
N.links=links;
N.offset=offset;
N.closeLegacy=closeLegacy;
N.cleanHash=cleanHash;
N.scrollToTarget=scrollToTarget;
N.onCategory=onCategory;
N.onSelect=onSelect;
})();