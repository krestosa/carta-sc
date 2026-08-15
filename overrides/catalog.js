(function(){
'use strict';
if(window.__scCatalogOverrideBooted)return;
window.__scCatalogOverrideBooted=true;

var desktopQuery=window.matchMedia('(min-width: 993px)');
var CART_URL='https://www.sushiclub.com.ar/shop_init.php';
var nav=null,navHome=null,navNext=null,toolbar=null;
var inlineStyles=new Map();
var categoryStateObserver=null,categoryStateRaf=0,lastAutoCategory=null;
var activeModal=null,previousFocus=null,backgroundState=[];
var cardSequence=0;

function text(node){return node?node.textContent.replace(/\s+/g,' ').trim():'';}
function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}
function each(list,fn){Array.prototype.forEach.call(list||[],fn);}
function matches(node,selector){return !!(node&&node.nodeType===1&&node.matches&&node.matches(selector));}

function ensureHardeningStyles(){
  if(document.getElementById('sc-ux-hardening-css'))return;
  var link=document.createElement('link');
  link.id='sc-ux-hardening-css';
  link.rel='stylesheet';
  link.href='overrides/ux-hardening.css?v='+(window.__scCatalogAssetVersion||'20260814-ux-hardening-v1');
  document.head.appendChild(link);
}
ensureHardeningStyles();

function repairCategoryAnchors(root){
  var nodes=[];
  if(matches(root,'a[name^="anchor"]'))nodes.push(root);
  if(root&&root.querySelectorAll)each(root.querySelectorAll('a[name^="anchor"]'),function(node){nodes.push(node);});
  nodes.forEach(function(anchor){
    var name=anchor.getAttribute('name');
    if(name&&anchor.id!==name)anchor.id=name;
  });
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

function earlyScan(root){
  repairCategoryAnchors(root);
  removeLegacySearch(root);
  enhanceBanner(root);
}

earlyScan(document);
if(window.MutationObserver&&document.documentElement){
  var earlyObserver=new MutationObserver(function(mutations){
    mutations.forEach(function(mutation){each(mutation.addedNodes,earlyScan);});
  });
  earlyObserver.observe(document.documentElement,{childList:true,subtree:true});
}

(function installHashlessCategoryUrls(){
  if(window.__scHashlessCategoryHistoryGuard)return;
  window.__scHashlessCategoryHistoryGuard=true;
  if(!history||typeof history.replaceState!=='function')return;
  var replace=history.replaceState;
  history.replaceState=function(state,title,url){
    if(typeof url==='string'&&/^#anchor/i.test(url)){
      return replace.call(history,state,title,location.pathname+location.search);
    }
    return replace.apply(history,arguments);
  };
})();

function ensureCategoryNavStyles(){
  if(document.getElementById('sc-category-nav-css'))return;
  var link=document.createElement('link');
  link.id='sc-category-nav-css';
  link.rel='stylesheet';
  link.href='overrides/category-nav.css';
  document.head.appendChild(link);
}

function imageSource(card){
  var img=card.querySelector('.imgShop img, .imgLiquidNoFillShop img');
  if(img&&img.getAttribute('src'))return img.getAttribute('src');
  var box=card.querySelector('.imgShop, .imgLiquidNoFillShop');
  if(!box)return'';
  var bg=box.style.backgroundImage||getComputedStyle(box).backgroundImage||'';
  var match=bg.match(/^url\(["']?(.*?)["']?\)$/);
  return match?match[1]:'';
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
  var root=document.createElement('nav');
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
    var link=currentCategoryLink(root);
    if(!link||link===lastAutoCategory)return;
    var previous=lastAutoCategory;lastAutoCategory=link;
    revealCategoryWithContext(link,previous,root,scroller);
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
  if(categoryStateObserver)categoryStateObserver.disconnect();
  categoryStateObserver=null;
  if(categoryStateRaf)cancelAnimationFrame(categoryStateRaf);
  categoryStateRaf=0;lastAutoCategory=null;
}

function enhanceCategorySemantics(){
  var mobile=document.querySelector('.fixedTopShop.wtopShopMenuMobile');
  if(mobile){mobile.setAttribute('role','navigation');mobile.setAttribute('aria-label','Categorías de la carta');}
}

function applyDesktop(){
  if(!desktopQuery.matches)return;
  var container=document.querySelector('.containerShop');
  if(!container)return;
  each(container.querySelectorAll('.listadoShop.sc-first-catalog-section'),function(list){list.classList.remove('sc-first-catalog-section');});
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
  installCategoryAutoScroll(nav,scroller);
  document.body.classList.add('sc-catalog-layout-ready');
  refreshMotion();
}

function restoreDesktop(){
  if(!document.body)return;
  document.body.classList.remove('sc-catalog-layout-ready');
  each(document.querySelectorAll('.listadoShop.sc-first-catalog-section'),function(list){list.classList.remove('sc-first-catalog-section');});
  if(nav&&navHome){navNext&&navNext.parentNode===navHome?navHome.insertBefore(nav,navNext):navHome.appendChild(nav);}
  removeCategoryAutoScroll();
  restoreParentLinks();
  if(toolbar&&toolbar.parentNode)toolbar.parentNode.removeChild(toolbar);
  toolbar=null;
  refreshMotion();
}

function syncLayout(){desktopQuery.matches?applyDesktop():restoreDesktop();}

function cleanPriceText(node){
  if(!node)return'';
  var clone=node.cloneNode(true);
  each(clone.querySelectorAll('input,.sumar,button'),function(el){if(el.parentNode)el.parentNode.removeChild(el);});
  return text(clone);
}

function ensureId(node,base){
  if(!node)return'';
  if(!node.id)node.id=base;
  return node.id;
}

function traitLabels(card){
  var seen={},labels=[];
  each(card.querySelectorAll('.title-shop1 .sabores img[data-original-title]'),function(img){
    var label=(img.getAttribute('data-original-title')||'').trim();
    if(label&&!seen[label]){seen[label]=true;labels.push(label);}
  });
  return labels;
}

function enhanceCardLink(link){
  var card=link.closest('.productoShop');if(!card)return;
  var hidden=card.querySelector('.producto-id');
  var key=hidden&&hidden.value?hidden.value:String(++cardSequence);
  key=String(key).replace(/[^a-zA-Z0-9_-]/g,'-');
  var title=card.querySelector('.title-shop1'),desc=card.querySelector('.descrip');
  var current=card.querySelector('.priceRow .priceHijass, .priceRow .price');
  var previous=card.querySelector('.priceRow .ofertaPrice');
  var titleId=ensureId(title,'sc-product-'+key+'-title');
  var descId=desc&&text(desc)?ensureId(desc,'sc-product-'+key+'-desc'):'';
  var currentText=cleanPriceText(current),previousText=cleanPriceText(previous),traits=traitLabels(card);
  if(current&&currentText)current.setAttribute('aria-label',(/^\$/.test(currentText)?'Precio actual: ':'Estado del producto: ')+currentText);
  if(previous&&previousText)previous.setAttribute('aria-label','Precio anterior: '+previousText);
  var meta=link.querySelector('.sc-card-a11y-meta');
  if(!meta){meta=document.createElement('span');meta.className='sc-card-a11y-meta sc-sr-only';link.appendChild(meta);}
  meta.id='sc-product-'+key+'-meta';
  var parts=[];
  if(currentText)parts.push((/^\$/.test(currentText)?'Precio actual ':'Estado ')+currentText);
  if(previousText)parts.push('Precio anterior '+previousText);
  if(traits.length)parts.push('Características: '+traits.join(', '));
  meta.textContent=parts.join('. ')+(parts.length?'.':'');
  link.removeAttribute('aria-label');
  if(titleId)link.setAttribute('aria-labelledby',titleId);
  var described=[];if(descId)described.push(descId);if(meta.textContent)described.push(meta.id);
  described.length?link.setAttribute('aria-describedby',described.join(' ')):link.removeAttribute('aria-describedby');
  link.setAttribute('aria-haspopup','dialog');
}

function enhanceProductLinks(){each(document.querySelectorAll('a.fancyboxModalAddProd'),enhanceCardLink);}

function buildTraitGroup(card,className){
  var labels=traitLabels(card);if(!labels.length)return null;
  var source=card.querySelector('.title-shop1 .sabores');if(!source)return null;
  var group=document.createElement('span');group.className=className||'sabores';
  group.setAttribute('role','img');group.setAttribute('aria-label','Características: '+labels.join(', '));
  each(source.querySelectorAll('img'),function(img){
    var clone=img.cloneNode(true);clone.setAttribute('alt','');clone.setAttribute('aria-hidden','true');
    clone.removeAttribute('data-toggle');clone.removeAttribute('title');group.appendChild(clone);
  });
  return group;
}

function focusableElements(dialog){
  return Array.prototype.filter.call(dialog.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'),function(el){
    return el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';
  });
}

function lockBackground(modal){
  backgroundState=[];
  var inertSupported=typeof HTMLElement!=='undefined'&&'inert' in HTMLElement.prototype;
  each(document.body.children,function(node){
    if(node===modal)return;
    var state={node:node,inertSupported:inertSupported};
    if(inertSupported){state.inert=!!node.inert;node.inert=true;}
    else{state.ariaHidden=node.getAttribute('aria-hidden');node.setAttribute('aria-hidden','true');}
    backgroundState.push(state);
  });
}

function unlockBackground(){
  backgroundState.forEach(function(state){
    if(!state.node||!document.documentElement.contains(state.node))return;
    if(state.inertSupported)state.node.inert=state.inert;
    else if(state.ariaHidden===null)state.node.removeAttribute('aria-hidden');
    else state.node.setAttribute('aria-hidden',state.ariaHidden);
  });
  backgroundState=[];
}

function closeModal(event){
  if(event)event.preventDefault();
  if(!activeModal)return;
  var modal=activeModal;activeModal=null;
  modal.classList.remove('is-visible');
  document.body.classList.remove('sc-product-modal-open');
  var restore=previousFocus;previousFocus=null;
  var delay=matchMedia('(prefers-reduced-motion: reduce)').matches?0:190;
  window.setTimeout(function(){
    if(modal.parentNode)modal.parentNode.removeChild(modal);
    unlockBackground();
    if(restore&&document.documentElement.contains(restore)){
      try{restore.focus({preventScroll:true});}catch(_){restore.focus();}
    }
  },delay);
}

function buildModal(link){
  var card=link.closest('.productoShop');if(!card)return null;
  var name=text(card.querySelector('.title-shop1')),description=text(card.querySelector('.descrip')),src=imageSource(card);
  var titleId='sc-product-modal-title-'+Date.now();
  var overlay=document.createElement('div');overlay.className='sc-product-modal';overlay.setAttribute('role','presentation');
  var dialog=document.createElement('section');dialog.className='sc-product-modal__dialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby',titleId);dialog.tabIndex=-1;
  var close=document.createElement('button');close.className='sc-product-modal__close';close.type='button';close.setAttribute('aria-label','Cerrar detalle del producto');close.innerHTML='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/></svg>';close.addEventListener('click',closeModal);
  var stage=document.createElement('div');stage.className='sc-product-modal__image-stage';
  if(src){var image=document.createElement('img');image.className='sc-product-modal__image';image.src=src;image.alt=name;image.decoding='async';stage.appendChild(image);}
  var content=document.createElement('div');content.className='sc-product-modal__content';
  var title=document.createElement('h2');title.className='sc-product-modal__title';title.id=titleId;
  var traits=buildTraitGroup(card,'sc-product-modal__traits sabores');if(traits)title.appendChild(traits);
  title.appendChild(document.createTextNode(name));content.appendChild(title);
  if(description){var copy=document.createElement('p');copy.className='sc-product-modal__description';copy.textContent=description;content.appendChild(copy);}
  var footer=document.createElement('div');footer.className='sc-product-modal__footer';
  var sourcePrice=card.querySelector('.priceRow');
  if(sourcePrice){
    var price=sourcePrice.cloneNode(true);price.className='sc-product-modal__price-row';
    each(price.querySelectorAll('.sumar,input,button'),function(node){if(node.parentNode)node.parentNode.removeChild(node);});
    footer.appendChild(price);
  }
  var actions=document.createElement('div');actions.className='sc-product-modal__actions';
  var cta=document.createElement('a');cta.className='sc-product-modal__cart-button';cta.href=CART_URL;cta.textContent='Pedilo Online';cta.setAttribute('aria-label','Pedilo Online en SushiClub');
  actions.appendChild(cta);footer.appendChild(actions);content.appendChild(footer);
  dialog.appendChild(close);dialog.appendChild(stage);dialog.appendChild(content);overlay.appendChild(dialog);
  overlay.addEventListener('mousedown',function(e){if(e.target===overlay)closeModal(e);});
  return overlay;
}

function openModal(link){
  if(activeModal)return;
  var modal=buildModal(link);if(!modal)return;
  previousFocus=link;document.body.appendChild(modal);document.body.classList.add('sc-product-modal-open');activeModal=modal;
  var close=modal.querySelector('.sc-product-modal__close');
  try{close.focus({preventScroll:true});}catch(_){close.focus();}
  lockBackground(modal);
  requestAnimationFrame(function(){if(activeModal===modal)modal.classList.add('is-visible');});
}

function installModal(){
  document.addEventListener('click',function(e){
    var link=e.target.closest&&e.target.closest('a.fancyboxModalAddProd');
    if(!link)return;
    if((e.button&&e.button!==0)||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();openModal(link);
  },true);
  document.addEventListener('keydown',function(e){
    if(!activeModal)return;
    if(e.key==='Escape'||e.key==='Esc'){e.preventDefault();closeModal();return;}
    if(e.key!=='Tab')return;
    var dialog=activeModal.querySelector('.sc-product-modal__dialog'),items=focusableElements(dialog);
    if(!items.length){e.preventDefault();dialog.focus();return;}
    var first=items[0],last=items[items.length-1],current=document.activeElement;
    if(e.shiftKey&&(current===first||!dialog.contains(current))){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&current===last){e.preventDefault();first.focus();}
  },true);
  document.addEventListener('focusin',function(e){
    if(!activeModal||activeModal.contains(e.target))return;
    var dialog=activeModal.querySelector('.sc-product-modal__dialog'),items=focusableElements(dialog);
    (items[0]||dialog).focus();
  });
}

function boot(){
  earlyScan(document);
  enhanceCategorySemantics();
  enhanceProductLinks();
  syncLayout();
  installModal();
  if(desktopQuery.addEventListener)desktopQuery.addEventListener('change',syncLayout);else desktopQuery.addListener(syncLayout);
  window.setTimeout(function(){enhanceProductLinks();enhanceCategorySemantics();},180);
}

ensureCategoryNavStyles();
ready(boot);
})();
