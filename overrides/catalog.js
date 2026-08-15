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
    ||root.querySelector