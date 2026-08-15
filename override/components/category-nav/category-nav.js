(function(){
'use strict';
var SC=window.SCOverride,utils=SC&&SC.utils,config=SC&&SC.config;
if(!SC||!utils||!config||SC.__categoryNavBooted)return;SC.__categoryNavBooted=true;
var each=utils.each,ready=utils.ready,desktopQuery=config.desktopQuery;
var nav=null,navHome=null,navNext=null,toolbar=null;
var inlineStyles=new Map();
var categoryStateObserver=null,categoryStateRaf=0,lastAutoCategory=null;
var railStateRaf=0,lastMobileActiveCategory=null;

function resolveAnchor(href){
  if(!href||href.charAt(0)!=='#'||href==='#')return null;
  var id=href.slice(1);try{id=decodeURIComponent(id);}catch(_){}
  return document.getElementById(id)||document.getElementsByName(id)[0]||null;
}
function stickyOffset(){
  var bottom=0;
  ['.topBar','.topShop','.sc-catalog-toolbar','.fixedTopShop.wtopShopMenuMobile'].forEach(function(selector){
    each(document.querySelectorAll(selector),function(node){
      if(!utils.visible(node))return;
      var css=getComputedStyle(node);
      if(css.position!=='fixed'&&css.position!=='sticky')return;
      var rect=node.getBoundingClientRect();
      if(rect.top<=2&&rect.bottom>0)bottom=Math.max(bottom,rect.bottom);
    });
  });
  return Math.max(0,Math.ceil(bottom))+12;
}
function closeLegacyMenus(){
  if(SC.mutations&&SC.mutations.closeLegacyCategoryMenus)return SC.mutations.closeLegacyCategoryMenus();
  each(document.querySelectorAll('.topPullDown.open'),function(node){node.classList.remove('open');});
  each(document.querySelectorAll('.topShopMenuMobile._open'),function(node){node.classList.remove('_open');});
}
function cleanCategoryHash(){
  if(SC.mutations&&SC.mutations.cleanCategoryHash)return SC.mutations.cleanCategoryHash();
  if(!/^#anchor/i.test(location.hash||''))return;
  try{history.replaceState(history.state,document.title,location.pathname+location.search);}catch(_){}
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
  var target=resolveAnchor(link.getAttribute('href'));if(!target)return;
  event.preventDefault();event.stopImmediatePropagation();
  closeLegacyMenus();cleanCategoryHash();scrollToCategory(target);
}
function interceptCategorySelect(event){
  var select=event.target;
  if(!select||!select.matches||!select.matches('.JSgoMenu'))return;
  var target=resolveAnchor(select.value);if(!target)return;
  event.preventDefault();event.stopImmediatePropagation();
  closeLegacyMenus();cleanCategoryHash();scrollToCategory(target);
}

function normalizeParentLinks(root){
  each(root.querySelectorAll('.nav-top-li > a.anchorLink'),function(link){
    if(!inlineStyles.has(link))inlineStyles.set(link,link.getAttribute('style'));
    link.style.removeProperty('font-size');
  });
}
function restoreParentLinks(){
  inlineStyles.forEach(function(style,link){
    if(!document.documentElement.contains(link))return;
    style===null?link.removeAttribute('style'):link.setAttribute('style',style);
  });
}
function makeToolbar(container){
  var root=document.createElement('nav');root.className='sc-catalog-toolbar';root.setAttribute('aria-label','Categorías de la carta');
  var scroller=document.createElement('div');scroller.className='sc-catalog-categories';root.appendChild(scroller);
  container.insertBefore(root,container.firstChild);return root;
}
function currentCategoryLink(root){
  if(!root)return null;
  return root.querySelector('.nav-top-li > a.anchorLink.sc-motion-current')
    ||root.querySelector('.nav-top-li > a.anchorLink[aria-current="location"]')
    ||root.querySelector('.nav-top-li.active > a.anchorLink')
    ||root.querySelector('.nav-top-li > a.anchorLink.active');
}
function categoryLinks(root){
  return root?Array.prototype.slice.call(root.querySelectorAll('.nav-top-li > a.anchorLink[href^="#"]')):[];
}
function revealCategoryWithContext(link,previous,root,scroller){
  if(!link||!scroller||!desktopQuery.matches)return;
  requestAnimationFrame(function(){
    if(!document.documentElement.contains(link)||!document.documentElement.contains(scroller))return;
    var links=categoryLinks(root),index=links.indexOf(link),previousIndex=previous?links.indexOf(previous):-1;
    var direction=previousIndex<0?0:(index>previousIndex?1:index<previousIndex?-1:0);
    var rail=scroller.getBoundingClientRect(),item=link.getBoundingClientRect(),edge=item,target=scroller.scrollLeft;
    if(direction>0&&index>=0)edge=links[Math.min(links.length-1,index+2)].getBoundingClientRect();
    else if(direction<0&&index>=0)edge=links[Math.max(0,index-2)].getBoundingClientRect();
    if(direction>0){
      if(edge.right>rail.right+.5)target+=edge.right-rail.right;
      else if(item.left<rail.left-.5)target+=item.left-rail.left;
      else return;
    }else if(direction<0){
      if(edge.left<rail.left-.5)target+=edge.left-rail.left;
      else if(item.right>rail.right+.5)target+=item.right-rail.right;
      else return;
    }else{
      if(item.right>rail.right+.5)target+=item.right-rail.right;
      else if(item.left<rail.left-.5)target+=item.left-rail.left;
      else return;
    }
    var max=Math.max(0,scroller.scrollWidth-scroller.clientWidth);
    target=Math.max(0,Math.min(max,target));
    if(Math.abs(target-scroller.scrollLeft)<.5)return;
    var reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try{scroller.scrollTo({left:target,top:0,behavior:reduced?'auto':'smooth'});}catch(_){scroller.scrollLeft=target;}
  });
}
function scheduleCategoryAutoScroll(root,scroller){
  if(categoryStateRaf)cancelAnimationFrame(categoryStateRaf);
  categoryStateRaf=requestAnimationFrame(function(){
    categoryStateRaf=0;
    var link=currentCategoryLink(root);if(!link||link===lastAutoCategory)return;
    var previous=lastAutoCategory;lastAutoCategory=link;revealCategoryWithContext(link,previous,root,scroller);
  });
}
function installCategoryAutoScroll(root,scroller){
  if(categoryStateObserver)categoryStateObserver.disconnect();
  categoryStateObserver=null;lastAutoCategory=null;
  if(!root||!scroller||!window.MutationObserver)return;
  categoryStateObserver=new MutationObserver(function(){scheduleCategoryAutoScroll(root,scroller);});
  categoryStateObserver.observe(root,{subtree:true,attributes:true,attributeFilter:['class','aria-current']});
  scheduleCategoryAutoScroll(root,scroller);
}
function removeCategoryAutoScroll(){
  if(categoryStateObserver)categoryStateObserver.disconnect();categoryStateObserver=null;
  if(categoryStateRaf)cancelAnimationFrame(categoryStateRaf);categoryStateRaf=0;lastAutoCategory=null;
}
function enhanceCategorySemantics(){
  var mobile=document.querySelector('.fixedTopShop.wtopShopMenuMobile');
  if(mobile){mobile.setAttribute('role','navigation');mobile.setAttribute('aria-label','Categorías de la carta');}
}
function applyDesktop(){
  if(!desktopQuery.matches)return;
  var container=document.querySelector('.containerShop');if(!container)return;
  each(container.querySelectorAll('.listadoShop.sc-first-catalog-section'),function(list){list.classList.remove('sc-first-catalog-section');});
  var first=Array.prototype.find.call(container.querySelectorAll('.listadoShop'),function(list){return!!list.querySelector('.productoShop, .titleShopSeccion');});
  if(first)first.classList.add('sc-first-catalog-section');
  if(!nav){
    nav=document.querySelector('.fixedTopShop.wtopShopMenuMobile .wrapp-nav-tabsTopShop');
    if(!nav)return;navHome=nav.parentNode;navNext=nav.nextSibling;
  }
  if(!toolbar||!document.documentElement.contains(toolbar))toolbar=makeToolbar(container);
  var scroller=toolbar.querySelector('.sc-catalog-categories');
  if(nav.parentNode!==scroller)scroller.appendChild(nav);
  normalizeParentLinks(nav);installCategoryAutoScroll(nav,scroller);
  document.body.classList.add('sc-catalog-layout-ready');utils.refreshMotion();scheduleRailState();
}
function restoreDesktop(){
  if(!document.body)return;
  document.body.classList.remove('sc-catalog-layout-ready');
  each(document.querySelectorAll('.listadoShop.sc-first-catalog-section'),function(list){list.classList.remove('sc-first-catalog-section');});
  if(nav&&navHome){navNext&&navNext.parentNode===navHome?navHome.insertBefore(nav,navNext):navHome.appendChild(nav);}
  removeCategoryAutoScroll();restoreParentLinks();
  if(toolbar&&toolbar.parentNode)toolbar.parentNode.removeChild(toolbar);toolbar=null;
  utils.refreshMotion();scheduleRailState();
}
function syncLayout(){desktopQuery.matches?applyDesktop():restoreDesktop();}

function makeRailArrow(host,scroller,direction){
  var selector='.sc-rail-arrow--'+direction,existing=host.querySelector(selector);if(existing)return existing;
  var button=document.createElement('button');button.type='button';button.className='sc-rail-arrow sc-rail-arrow--'+direction;
  button.setAttribute('aria-label',direction==='left'?'Ver categorías anteriores':'Ver más categorías');
  button.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#666" aria-hidden="true"><path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"/></svg>';
  button.addEventListener('click',function(){
    var amount=Math.max(140,Math.round(scroller.clientWidth*.65));if(direction==='left')amount*=-1;
    try{scroller.scrollBy({left:amount,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}catch(_){scroller.scrollLeft+=amount;}
    requestAnimationFrame(scheduleRailState);
  });
  host.appendChild(button);return button;
}
function setRailArrowVisible(button,visible){
  if(!button)return;
  button.style.setProperty('opacity',visible?'1':'0','important');
  button.style.setProperty('visibility',visible?'visible':'hidden','important');
  button.style.setProperty('pointer-events',visible?'auto':'none','important');
  button.disabled=!visible;
}
function setRailArrowState(host,scroller,canLeft,canRight){
  if(!host)return;var left=host.querySelector('.sc-rail-arrow--left'),right=host.querySelector('.sc-rail-arrow--right');
  if(scroller){left=left||makeRailArrow(host,scroller,'left');right=right||makeRailArrow(host,scroller,'right');}
  setRailArrowVisible(left,!!canLeft);setRailArrowVisible(right,!!canRight);
}
function setOverflowState(host,scroller){
  if(!host||!scroller)return;
  var max=Math.max(0,scroller.scrollWidth-scroller.clientWidth);
  var canLeft=max>1&&scroller.scrollLeft>1,canRight=max>1&&scroller.scrollLeft<max-1;
  host.classList.toggle('sc-overflow-left',canLeft);host.classList.toggle('sc-overflow-right',canRight);
  setRailArrowState(host,scroller,canLeft,canRight);
}
function mobileActiveCategoryLink(rail){
  if(!rail)return null;
  return rail.querySelector('.nav-top-li > a.anchorLink.sc-motion-current')
    ||rail.querySelector('.nav-top-li > a.anchorLink[aria-current="location"]')
    ||rail.querySelector('.nav-top-li.active > a.anchorLink')
    ||rail.querySelector('.nav-top-li > a.anchorLink.active');
}
function autoScrollMobileCategory(rail,scroller){
  if(desktopQuery.matches||!rail||!scroller)return;
  var link=mobileActiveCategoryLink(rail);if(!link||link===lastMobileActiveCategory)return;lastMobileActiveCategory=link;
  requestAnimationFrame(function(){
    if(!document.documentElement.contains(link)||!document.documentElement.contains(scroller))return;
    var railRect=scroller.getBoundingClientRect(),itemRect=link.getBoundingClientRect();
    var target=scroller.scrollLeft+(itemRect.left+itemRect.width/2-(railRect.left+railRect.width/2));
    var max=Math.max(0,scroller.scrollWidth-scroller.clientWidth);target=Math.max(0,Math.min(max,target));
    if(Math.abs(target-scroller.scrollLeft)<1)return;
    try{scroller.scrollTo({left:target,top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}catch(_){scroller.scrollLeft=target;}
  });
}
function updateRailState(){
  railStateRaf=0;
  var desktopToolbar=document.querySelector('.sc-catalog-toolbar');
  if(desktopToolbar){
    var desktopScroller=desktopToolbar.querySelector('.sc-catalog-categories');
    setOverflowState(desktopToolbar,desktopScroller);
    var rect=desktopToolbar.getBoundingClientRect();
    desktopToolbar.classList.toggle('sc-is-stuck',desktopQuery.matches&&window.scrollY>0&&rect.top<=.5&&rect.bottom>0);
  }
  var wrapper=document.querySelector('.fixedTopShop.wtopShopMenuMobile');
  var rail=wrapper&&wrapper.querySelector('.topShopMenuMobile');
  var scroller=rail&&rail.querySelector('.topShopMenuMobileScroller');
  if(rail){
    if(desktopQuery.matches){
      rail.classList.remove('sc-overflow-left','sc-overflow-right');setRailArrowState(rail,null,false,false);lastMobileActiveCategory=null;
    }else{setOverflowState(rail,scroller);autoScrollMobileCategory(rail,scroller);}
  }
  if(wrapper){
    var mobileRect=wrapper.getBoundingClientRect();
    wrapper.classList.toggle('sc-is-stuck',!desktopQuery.matches&&window.scrollY>0&&mobileRect.top<=.5&&mobileRect.bottom>0);
  }
}
function scheduleRailState(){if(!railStateRaf)railStateRaf=requestAnimationFrame(updateRailState);}
function handleResize(){scheduleRailState();}
function handleBreakpoint(){lastMobileActiveCategory=null;syncLayout();handleResize();}

document.addEventListener('click',interceptCategoryClick,true);
document.addEventListener('change',interceptCategorySelect,true);
window.addEventListener('scroll',scheduleRailState,{passive:true});
document.addEventListener('scroll',scheduleRailState,true);
window.addEventListener('resize',handleResize,{passive:true});

ready(function(){
  enhanceCategorySemantics();syncLayout();scheduleRailState();
  each(document.querySelectorAll('.sc-catalog-categories, .topShopMenuMobileScroller'),function(scroller){
    scroller.addEventListener('scroll',scheduleRailState,{passive:true});
  });
  document.addEventListener('click',function(e){
    if(desktopQuery.matches)return;
    var link=e.target.closest&&e.target.closest('.topShopMenuMobile a.anchorLink[href^="#"]');if(!link)return;
    window.setTimeout(scheduleRailState,0);window.setTimeout(scheduleRailState,180);
  },true);
  window.setTimeout(enhanceCategorySemantics,180);
});
if(desktopQuery.addEventListener)desktopQuery.addEventListener('change',handleBreakpoint);else desktopQuery.addListener(handleBreakpoint);

SC.categoryNav={syncLayout:syncLayout,scheduleRailState:scheduleRailState,resolveAnchor:resolveAnchor};
})();