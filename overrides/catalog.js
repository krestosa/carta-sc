(function(){
'use strict';
/* Pages deploy marker: stable-no-skeleton-v1. */
if(window.__scCatalogOverrideBooted)return;
window.__scCatalogOverrideBooted=true;

var desktopQuery=window.matchMedia('(min-width: 993px)');
var nav=null,navHome=null,navNext=null,toolbar=null,activeModal=null,previousFocus=null;
var inlineStyles=new Map();
var categoryProxies=[];
var proxyStyle=null;
var categoryWheelScroller=null;
var categoryWheelHandler=null;
var categoryStateObserver=null;
var categoryStateRaf=0;
var lastAutoCategory=null;

/* Skeleton loading was removed. Clean stale state once and never observe the
   root class attribute; observing and mutating the same attribute can create
   an unbounded MutationObserver feedback loop. */
[
  'sc-catalog-skeleton',
  'sc-catalog-content-loading',
  'sc-catalog-skeleton-leaving',
  'sc-skeleton-ready'
].forEach(function(name){
  if(document.documentElement.classList.contains(name))document.documentElement.classList.remove(name);
});
var staleGuard=document.getElementById('sc-skeleton-guard');
if(staleGuard&&staleGuard.parentNode)staleGuard.parentNode.removeChild(staleGuard);

function ensureCategoryNavStyles(){
  if(document.getElementById('sc-category-nav-css'))return;
  var link=document.createElement('link');
  link.id='sc-category-nav-css';
  link.rel='stylesheet';
  link.href='overrides/category-nav.css';
  document.head.appendChild(link);
}

function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}
function text(node){return node?node.textContent.replace(/\s+/g,' ').trim():'';}

function installHashlessHistoryGuard(){
  if(window.__scHashlessCategoryHistoryGuard)return;
  window.__scHashlessCategoryHistoryGuard=true;
  var replace=history.replaceState;
  history.replaceState=function(state,title,url){
    if(typeof url==='string'&&/^#anchor/i.test(url))url=location.pathname+location.search;
    return replace.call(history,state,title,url);
  };
}
function cleanHash(){
  if(!location.hash)return;
  try{history.replaceState(history.state,document.title,location.pathname+location.search);}catch(e){}
}
function forceTop(){
  if('scrollRestoration' in history){try{history.scrollRestoration='manual';}catch(e){}}
  cleanHash();
  var top=function(){requestAnimationFrame(function(){scrollTo(0,0);});};
  document.readyState==='complete'?top():addEventListener('load',top,{once:true});
  addEventListener('pageshow',function(e){if(e.persisted)top();});
}
function installCleanAnchors(){
  document.addEventListener('click',function(e){
    var link=e.target.closest&&e.target.closest('.sc-catalog-toolbar a.anchorLink[href^="#"]');
    if(!link||!desktopQuery.matches)return;
    e.preventDefault();
    setTimeout(cleanHash,0);
  },true);
  addEventListener('hashchange',function(){if(/^#anchor/i.test(location.hash))cleanHash();});
}

function ensureProxyStyle(){
  if(proxyStyle&&document.documentElement.contains(proxyStyle))return;
  proxyStyle=document.createElement('style');
  proxyStyle.setAttribute('data-sc-category-proxy','');
  proxyStyle.textContent='\n'
    +'.sc-catalog-toolbar .nav-top-li{position:relative!important;}\n'
    +'.sc-catalog-toolbar .sc-category-proxy{position:absolute;inset:0;z-index:8;width:100%;height:100%;margin:0;padding:0;border:0;background:transparent;color:transparent;font:inherit;cursor:pointer;}\n'
    +'.sc-catalog-toolbar .sc-category-proxy:focus-visible{outline:1px solid var(--sc-catalog-ink,#151515);outline-offset:-1px;}\n'
    +'.sc-catalog-toolbar a.anchorLink.sc-category-proxy-hover{color:var(--sc-catalog-ink,#151515)!important;text-decoration:underline!important;text-decoration-thickness:1px!important;text-underline-offset:4px!important;}\n';
  document.head.appendChild(proxyStyle);
}
function clearCategoryProxies(){
  categoryProxies.forEach(function(entry){
    if(entry.link&&document.documentElement.contains(entry.link)){
      entry.link.style.removeProperty('pointer-events');
      entry.link.classList.remove('sc-category-proxy-hover');
    }
    if(entry.button&&entry.button.parentNode)entry.button.parentNode.removeChild(entry.button);
  });
  categoryProxies=[];
  if(proxyStyle&&proxyStyle.parentNode)proxyStyle.parentNode.removeChild(proxyStyle);
  proxyStyle=null;
}
function installCategoryProxies(root){
  clearCategoryProxies();
  ensureProxyStyle();
  root.querySelectorAll('.nav-top-li > a.anchorLink[href^="#"]').forEach(function(link){
    var li=link.parentElement;
    if(!li)return;
    var button=document.createElement('button');
    button.type='button';
    button.className='sc-category-proxy';
    button.setAttribute('aria-label',text(link));
    link.style.setProperty('pointer-events','none','important');
    button.addEventListener('pointerenter',function(){link.classList.add('sc-category-proxy-hover');});
    button.addEventListener('pointerleave',function(){link.classList.remove('sc-category-proxy-hover');});
    button.addEventListener('focus',function(){link.classList.add('sc-category-proxy-hover');});
    button.addEventListener('blur',function(){link.classList.remove('sc-category-proxy-hover');});
    button.addEventListener('click',function(){link.click();});
    li.appendChild(button);
    categoryProxies.push({link:link,button:button});
  });
}

function removeCategoryAutoScroll(){
  if(categoryStateObserver)categoryStateObserver.disconnect();
  categoryStateObserver=null;
  if(categoryStateRaf)cancelAnimationFrame(categoryStateRaf);
  categoryStateRaf=0;
  lastAutoCategory=null;
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
    var links=categoryLinks(root);
    var index=links.indexOf(link);
    var previousIndex=previous?links.indexOf(previous):-1;
    var direction=previousIndex<0?0:(index>previousIndex?1:index<previousIndex?-1:0);
    var rail=scroller.getBoundingClientRect();
    var item=link.getBoundingClientRect();
    var target=scroller.scrollLeft;
    var edge=item;

    if(direction>0&&index>=0)edge=links[Math.min(links.length-1,index+2)].getBoundingClientRect();
    else if(direction<0&&index>=0)edge=links[Math.max(0,index-2)].getBoundingClientRect();

    if(direction>0){
      if(edge.right>rail.right+0.5)target+=edge.right-rail.right;
      else if(item.left<rail.left-0.5)target+=item.left-rail.left;
      else return;
    }else if(direction<0){
      if(edge.left<rail.left-0.5)target+=edge.left-rail.left;
      else if(item.right>rail.right+0.5)target+=item.right-rail.right;
      else return;
    }else{
      if(item.right>rail.right+0.5)target+=item.right-rail.right;
      else if(item.left<rail.left-0.5)target+=item.left-rail.left;
      else return;
    }

    var max=Math.max(0,scroller.scrollWidth-scroller.clientWidth);
    target=Math.max(0,Math.min(max,target));
    if(Math.abs(target-scroller.scrollLeft)<0.5)return;

    var reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(typeof scroller.scrollTo==='function'){
      try{scroller.scrollTo({left:target,top:0,behavior:reduced?'auto':'smooth'});return;}catch(e){}
    }
    scroller.scrollLeft=target;
  });
}
function scheduleCategoryAutoScroll(root,scroller){
  if(categoryStateRaf)cancelAnimationFrame(categoryStateRaf);
  categoryStateRaf=requestAnimationFrame(function(){
    categoryStateRaf=0;
    var link=currentCategoryLink(root);
    if(!link||link===lastAutoCategory)return;
    var previous=lastAutoCategory;
    lastAutoCategory=link;
    revealCategoryWithContext(link,previous,root,scroller);
  });
}
function installCategoryAutoScroll(root,scroller){
  removeCategoryAutoScroll();
  if(!root||!scroller)return;
  categoryStateObserver=new MutationObserver(function(){scheduleCategoryAutoScroll(root,scroller);});
  categoryStateObserver.observe(root,{subtree:true,attributes:true,attributeFilter:['class','aria-current']});
  scheduleCategoryAutoScroll(root,scroller);
}

function removeHorizontalCategoryWheel(){
  if(categoryWheelScroller&&categoryWheelHandler){
    categoryWheelScroller.removeEventListener('wheel',categoryWheelHandler);
  }
  categoryWheelScroller=null;
  categoryWheelHandler=null;
}
function installHorizontalCategoryWheel(scroller){
  if(!scroller||categoryWheelScroller===scroller)return;
  removeHorizontalCategoryWheel();
  categoryWheelScroller=scroller;
  categoryWheelHandler=function(e){
    if(!desktopQuery.matches)return;
    e.preventDefault();

    var max=Math.max(0,scroller.scrollWidth-scroller.clientWidth);
    if(max<1)return;

    var delta=Math.abs(e.deltaY)>=Math.abs(e.deltaX)?e.deltaY:e.deltaX;
    if(Math.abs(delta)<0.5)return;
    if(e.deltaMode===1)delta*=16;
    else if(e.deltaMode===2)delta*=Math.max(1,scroller.clientWidth);

    scroller.scrollLeft=Math.max(0,Math.min(max,scroller.scrollLeft+delta));
  };
  scroller.addEventListener('wheel',categoryWheelHandler,{passive:false});
}

function imageSource(card){
  var img=card.querySelector('.imgShop img, .imgLiquidNoFillShop img');
  if(img&&img.getAttribute('src'))return img.getAttribute('src');
  var box=card.querySelector('.imgShop, .imgLiquidNoFillShop');
  if(!box)return'';
  var bg=box.style.backgroundImage||getComputedStyle(box).backgroundImage||'';
  var m=bg.match(/^url\(["']?(.*?)["']?\)$/);
  return m?m[1]:'';
}
function normalizeParentLinks(root){
  root.querySelectorAll('.nav-top-li > a.anchorLink').forEach(function(link){
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
  var root=document.createElement('div');
  root.className='sc-catalog-toolbar';
  root.setAttribute('aria-label','Categorías de la carta');
  var scroller=document.createElement('div');
  scroller.className='sc-catalog-categories';
  root.appendChild(scroller);
  container.insertBefore(root,container.firstChild);
  return root;
}
function refreshMotion(){
  requestAnimationFrame(function(){
    if(window.ScrollTrigger&&typeof window.ScrollTrigger.refresh==='function')window.ScrollTrigger.refresh();
  });
}
function applyDesktop(){
  if(!desktopQuery.matches)return;
  var container=document.querySelector('.containerShop');
  if(!container)return;
  container.querySelectorAll('.listadoShop.sc-first-catalog-section').forEach(function(list){list.classList.remove('sc-first-catalog-section');});
  var first=Array.prototype.find.call(container.querySelectorAll('.listadoShop'),function(list){return!!list.querySelector('.productoShop, .titleShopSeccion');});
  if(first)first.classList.add('sc-first-catalog-section');
  if(!nav){
    nav=document.querySelector('.fixedTopShop.wtopShopMenuMobile .wrapp-nav-tabsTopShop');
    if(!nav)return;
    navHome=nav.parentNode;navNext=nav.nextSibling;
  }
  if(!toolbar||!document.documentElement.contains(toolbar))toolbar=makeToolbar(container);
  var scroller=toolbar.querySelector('.sc-catalog-categories');
  installHorizontalCategoryWheel(scroller);
  if(nav.parentNode!==scroller)scroller.appendChild(nav);
  normalizeParentLinks(nav);
  installCategoryProxies(nav);
  installCategoryAutoScroll(nav,scroller);
  document.body.classList.add('sc-catalog-layout-ready');
  refreshMotion();
}
function restoreDesktop(){
  document.body.classList.remove('sc-catalog-layout-ready');
  document.querySelectorAll('.listadoShop.sc-first-catalog-section').forEach(function(list){list.classList.remove('sc-first-catalog-section');});
  if(nav&&navHome){navNext&&navNext.parentNode===navHome?navHome.insertBefore(nav,navNext):navHome.appendChild(nav);}
  clearCategoryProxies();
  removeCategoryAutoScroll();
  removeHorizontalCategoryWheel();
  restoreParentLinks();
  if(toolbar&&toolbar.parentNode)toolbar.parentNode.removeChild(toolbar);
  toolbar=null;
  refreshMotion();
}
function syncLayout(){desktopQuery.matches?applyDesktop():restoreDesktop();}

function cloneFlavorIcons(card,target){
  var source=card.querySelector('.title-shop1 .sabores');
  if(!source||!source.children.length)return;
  var flavors=source.cloneNode(true);
  flavors.querySelectorAll('img').forEach(function(img){
    if(!img.getAttribute('alt'))img.setAttribute('alt',img.getAttribute('data-original-title')||'');
    img.removeAttribute('data-toggle');
  });
  target.appendChild(flavors);
}
function closeModal(e){
  if(e)e.preventDefault();
  if(!activeModal)return;
  var modal=activeModal;activeModal=null;
  modal.classList.remove('is-visible');
  document.body.classList.remove('sc-product-modal-open');
  setTimeout(function(){if(modal.parentNode)modal.parentNode.removeChild(modal);},matchMedia('(prefers-reduced-motion: reduce)').matches?0:190);
  if(previousFocus&&document.documentElement.contains(previousFocus)){try{previousFocus.focus({preventScroll:true});}catch(err){previousFocus.focus();}}
  previousFocus=null;
}
function buildModal(link){
  var card=link.closest('.productoShop');
  if(!card||!desktopQuery.matches)return null;
  var name=text(card.querySelector('.title-shop1')),description=text(card.querySelector('.descrip')),src=imageSource(card),titleId='sc-product-modal-title';
  var overlay=document.createElement('div');overlay.className='sc-product-modal';overlay.setAttribute('role','presentation');
  var dialog=document.createElement('section');dialog.className='sc-product-modal__dialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby',titleId);dialog.tabIndex=-1;
  var close=document.createElement('button');close.className='sc-product-modal__close';close.type='button';close.setAttribute('aria-label','Cerrar detalle del producto');close.innerHTML='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/></svg>';close.addEventListener('click',closeModal);
  var stage=document.createElement('div');stage.className='sc-product-modal__image-stage';
  if(src){var image=document.createElement('img');image.className='sc-product-modal__image';image.src=src;image.alt=name;image.decoding='async';stage.appendChild(image);}
  var content=document.createElement('div');content.className='sc-product-modal__content';
  var title=document.createElement('h2');title.className='sc-product-modal__title';title.id=titleId;cloneFlavorIcons(card,title);title.appendChild(document.createTextNode(name));content.appendChild(title);
  if(description){var copy=document.createElement('p');copy.className='sc-product-modal__description';copy.textContent=description;content.appendChild(copy);}
  var sourcePrice=card.querySelector('.priceRow');
  if(sourcePrice){var price=sourcePrice.cloneNode(true);price.className='sc-product-modal__price-row';price.querySelectorAll('.sumar, input, button').forEach(function(node){node.remove();});content.appendChild(price);}
  dialog.appendChild(close);dialog.appendChild(stage);dialog.appendChild(content);overlay.appendChild(dialog);
  overlay.addEventListener('mousedown',function(e){if(e.target===overlay)closeModal(e);});
  return overlay;
}
function openModal(link){
  if(activeModal)closeModal();
  var modal=buildModal(link);if(!modal)return;
  previousFocus=link;document.body.appendChild(modal);document.body.classList.add('sc-product-modal-open');activeModal=modal;
  requestAnimationFrame(function(){if(activeModal!==modal)return;modal.classList.add('is-visible');var dialog=modal.querySelector('.sc-product-modal__dialog');try{dialog.focus({preventScroll:true});}catch(e){dialog.focus();}});
}
function enhanceProductLinks(){
  document.querySelectorAll('a.fancyboxModalAddProd').forEach(function(link){var card=link.closest('.productoShop'),name=text(card&&card.querySelector('.title-shop1'));link.setAttribute('aria-haspopup','dialog');if(name)link.setAttribute('aria-label','Ver detalle de '+name);});
}
function installModal(){
  enhanceProductLinks();
  document.addEventListener('click',function(e){
    var link=e.target.closest&&e.target.closest('a.fancyboxModalAddProd');
    if(!link||!desktopQuery.matches)return;
    if(e.button&&e.button!==0)return;
    if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();openModal(link);
  },true);
  document.addEventListener('keydown',function(e){if(activeModal&&(e.key==='Escape'||e.key==='Esc')){e.preventDefault();closeModal();}});
}

ensureCategoryNavStyles();
installHashlessHistoryGuard();
forceTop();
ready(function(){
  syncLayout();
  installModal();
  installCleanAnchors();
  if(desktopQuery.addEventListener)desktopQuery.addEventListener('change',syncLayout);else desktopQuery.addListener(syncLayout);
});
})();
