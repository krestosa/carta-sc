(function(){
'use strict';
if(window.__scModalCtaBooted)return;
window.__scModalCtaBooted=true;

function assetVersion(){return window.__scCatalogAssetVersion||'20260815-ux-interaction-v3';}

function restoreNativeHistory(){
  try{
    var proto=window.History&&window.History.prototype;
    if(!proto||typeof proto.replaceState!=='function')return;
    if(Object.prototype.hasOwnProperty.call(window.history,'replaceState')){
      try{delete window.history.replaceState;}catch(_){}
    }
    if(window.history.replaceState!==proto.replaceState){
      try{Object.defineProperty(window.history,'replaceState',{configurable:true,writable:true,value:proto.replaceState.bind(window.history)});}catch(_){}
    }
  }catch(_){}
}

function installInteractionCss(){
  if(document.getElementById('sc-ux-interaction-fixes-css'))return;
  var style=document.createElement('style');
  style.id='sc-ux-interaction-fixes-css';
  style.textContent=[
    'body.sushiShop.sc-catalog-layout-ready .sc-catalog-categories{overscroll-behavior:auto!important;overscroll-behavior-x:auto!important;overscroll-behavior-y:auto!important;}',
    'body.sushiShop .wtopShopMenuMobile .topShopMenuMobile .topShopMenuMobileScroller{overscroll-behavior:auto!important;overscroll-behavior-x:auto!important;overscroll-behavior-y:auto!important;}',
    'body.sushiShop .wtopShopMenuMobile .topShopMenuMobile._open .topShopMenuMobileScroller{height:46px!important;min-height:46px!important;overflow-y:hidden!important;}'
  ].join('');
  document.head.appendChild(style);
}

function resolveAnchor(href){
  if(!href||href.charAt(0)!=='#'||href==='#')return null;
  var id=href.slice(1);
  try{id=decodeURIComponent(id);}catch(_){}
  return document.getElementById(id)||document.getElementsByName(id)[0]||null;
}

function visible(node){
  if(!node)return false;
  var rect=node.getBoundingClientRect();
  return rect.height>0&&(node.offsetParent!==null||node.getClientRects().length>0);
}

function stickyOffset(){
  var bottom=0;
  ['.topBar','.topShop','.sc-catalog-toolbar','.fixedTopShop.wtopShopMenuMobile'].forEach(function(selector){
    Array.prototype.forEach.call(document.querySelectorAll(selector),function(node){
      if(!visible(node))return;
      var css=getComputedStyle(node);
      if(css.position!=='fixed'&&css.position!=='sticky')return;
      var rect=node.getBoundingClientRect();
      if(rect.top<=2&&rect.bottom>0)bottom=Math.max(bottom,rect.bottom);
    });
  });
  return Math.max(0,Math.ceil(bottom))+12;
}

function cleanCategoryHash(){
  if(!/^#anchor/i.test(location.hash||''))return;
  try{history.replaceState(history.state,document.title,location.pathname+location.search);}catch(_){}
}

function closeLegacyCategoryMenus(){
  Array.prototype.forEach.call(document.querySelectorAll('.topPullDown.open'),function(node){node.classList.remove('open');});
  Array.prototype.forEach.call(document.querySelectorAll('.topShopMenuMobile._open'),function(node){node.classList.remove('_open');});
}

function scrollToCategory(target){
  var top=target.getBoundingClientRect().top+(window.pageYOffset||document.documentElement.scrollTop||0)-stickyOffset();
  var max=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
  top=Math.max(0,Math.min(max,top));
  var reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  try{window.scrollTo({top:top,left:0,behavior:reduced?'auto':'smooth'});}catch(_){window.scrollTo(0,top);}
}

function interceptCategoryClick(event){
  if(event.defaultPrevented||event.button>0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  var link=event.target&&event.target.closest?event.target.closest('a.anchorLink, a.anchorLinkSub'):null;
  if(!link)return;
  if(!(link.closest('.sc-catalog-toolbar')||link.closest('.wtopShopMenuMobile .topShopMenuMobile')))return;
  if(link.closest('.topPullDown,.dropdown-menu'))return;
  var target=resolveAnchor(link.getAttribute('href'));
  if(!target)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  closeLegacyCategoryMenus();
  cleanCategoryHash();
  scrollToCategory(target);
}

function interceptCategorySelect(event){
  var select=event.target;
  if(!select||!select.matches||!select.matches('.JSgoMenu'))return;
  var target=resolveAnchor(select.value);
  if(!target)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  closeLegacyCategoryMenus();
  cleanCategoryHash();
  scrollToCategory(target);
}

function stripLegacyHoverHandlers(){
  closeLegacyCategoryMenus();
  if(!window.jQuery)return;
  window.jQuery('.nav-tabsTopShop .anchorLink').off('mouseenter');
  window.jQuery('.nav-top-li').off('mouseleave');
}

function scrollStorageKey(){
  return 'sc:scroll:'+location.pathname+location.search;
}

function navigationType(){
  try{
    var entries=performance&&performance.getEntriesByType?performance.getEntriesByType('navigation'):[];
    if(entries&&entries[0]&&entries[0].type)return entries[0].type;
    if(performance&&performance.navigation){
      if(performance.navigation.type===1)return 'reload';
      if(performance.navigation.type===2)return 'back_forward';
    }
  }catch(_){}
  return 'navigate';
}

function saveScrollPosition(){
  try{
    var y=window.pageYOffset||document.documentElement.scrollTop||0;
    sessionStorage.setItem(scrollStorageKey(),String(Math.max(0,Math.round(y))));
  }catch(_){}
}

function restoreSavedScrollPosition(){
  var type=navigationType();
  if(type!=='reload'&&type!=='back_forward')return;
  if(location.hash&&!/^#anchor/i.test(location.hash))return;
  var raw=null;
  try{raw=sessionStorage.getItem(scrollStorageKey());}catch(_){}
  if(raw===null)return;
  var y=Number(raw);
  if(!isFinite(y)||y<0)return;
  var apply=function(){
    var max=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
    var top=Math.max(0,Math.min(max,y));
    try{window.scrollTo({top:top,left:0,behavior:'auto'});}catch(_){window.scrollTo(0,top);}
  };
  var afterLayout=function(){
    requestAnimationFrame(function(){requestAnimationFrame(apply);});
  };
  if(document.readyState==='complete')afterLayout();
  else window.addEventListener('load',afterLayout,{once:true});
}

function installScrollPersistence(){
  window.addEventListener('pagehide',saveScrollPosition,{capture:true});
  window.addEventListener('pageshow',function(event){
    if(event.persisted)return;
    restoreSavedScrollPosition();
  },{once:true});
}

function installInteractionFixes(){
  restoreNativeHistory();
  installInteractionCss();
  document.addEventListener('click',interceptCategoryClick,true);
  document.addEventListener('change',interceptCategorySelect,true);
  var finish=function(){
    restoreNativeHistory();
    cleanCategoryHash();
    stripLegacyHoverHandlers();
    window.setTimeout(stripLegacyHoverHandlers,0);
    window.setTimeout(stripLegacyHoverHandlers,120);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',finish,{once:true});
  else finish();
}

function ensureMotion(){
  if(document.getElementById('sc-modal-motion-js'))return;
  var script=document.createElement('script');
  script.id='sc-modal-motion-js';
  script.src='motion/modal-motion.js?v='+assetVersion();
  script.async=true;
  document.head.appendChild(script);
}

installScrollPersistence();
installInteractionFixes();
ensureMotion();
})();
