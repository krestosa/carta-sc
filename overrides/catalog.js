(function(){
'use strict';
if(window.__scCatalogOverrideBooted)return;
window.__scCatalogOverrideBooted=true;

var desktopQuery=window.matchMedia('(min-width: 993px)');
var nav=null,navHome=null,navNext=null,toolbar=null,activeModal=null,previousFocus=null;
var inlineStyles=new Map();

function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}
function text(node){return node?node.textContent.replace(/\s+/g,' ').trim():'';}

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
    dispatchEvent(new Event('resize'));
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
  if(nav.parentNode!==scroller)scroller.appendChild(nav);
  normalizeParentLinks(nav);
  document.body.classList.add('sc-catalog-layout-ready');
  refreshMotion();
}
function restoreDesktop(){
  document.body.classList.remove('sc-catalog-layout-ready');
  document.querySelectorAll('.listadoShop.sc-first-catalog-section').forEach(function(list){list.classList.remove('sc-first-catalog-section');});
  if(nav&&navHome){navNext&&navNext.parentNode===navHome?navHome.insertBefore(nav,navNext):navHome.appendChild(nav);}
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

forceTop();
ready(function(){
  syncLayout();
  installModal();
  installCleanAnchors();
  if(desktopQuery.addEventListener)desktopQuery.addEventListener('change',syncLayout);else desktopQuery.addListener(syncLayout);
});
})();
