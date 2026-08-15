(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,N=SC&&SC.categoryNav;if(!SC||!U||!N||SC.__categoryNavLayoutBooted)return;SC.__categoryNavLayoutBooted=true;
var each=U.each,nav=null,home=null,next=null,toolbar=null,styles=new Map();

function toolbarNode(container){
  var node=document.createElement('nav');node.className='sc-catalog-toolbar';node.setAttribute('aria-label','Categorías de la carta');
  var scroller=document.createElement('div');scroller.className='sc-catalog-categories';node.appendChild(scroller);container.insertBefore(node,container.firstChild);return node;
}
function normalize(root){
  each(root.querySelectorAll('.nav-top-li > a.anchorLink'),function(link){
    if(!styles.has(link))styles.set(link,link.getAttribute('style'));
    link.style.removeProperty('font-size');
  });
}
function restoreStyles(){
  styles.forEach(function(value,link){
    if(!document.documentElement.contains(link))return;
    value===null?link.removeAttribute('style'):link.setAttribute('style',value);
  });
}
function layout(){
  if(N.mq.matches){
    var container=document.querySelector('.containerShop');if(!container)return;
    each(container.querySelectorAll('.listadoShop.sc-first-catalog-section'),function(node){node.classList.remove('sc-first-catalog-section');});
    var first=Array.prototype.find.call(container.querySelectorAll('.listadoShop'),function(node){return!!node.querySelector('.productoShop,.titleShopSeccion');});
    if(first)first.classList.add('sc-first-catalog-section');
    if(!nav){nav=document.querySelector('.fixedTopShop.wtopShopMenuMobile .wrapp-nav-tabsTopShop');if(!nav)return;home=nav.parentNode;next=nav.nextSibling;}
    if(!toolbar||!document.documentElement.contains(toolbar))toolbar=toolbarNode(container);
    var scroller=toolbar.querySelector('.sc-catalog-categories');if(nav.parentNode!==scroller)scroller.appendChild(nav);
    normalize(nav);document.body.classList.add('sc-catalog-layout-ready');
  }else{
    document.body&&document.body.classList.remove('sc-catalog-layout-ready');
    each(document.querySelectorAll('.listadoShop.sc-first-catalog-section'),function(node){node.classList.remove('sc-first-catalog-section');});
    if(nav&&home){next&&next.parentNode===home?home.insertBefore(nav,next):home.appendChild(nav);}
    restoreStyles();if(toolbar&&toolbar.parentNode)toolbar.parentNode.removeChild(toolbar);toolbar=null;
  }
  if(N.refreshMetrics)N.refreshMetrics();
  if(N.scheduleRail)N.scheduleRail();
  U.refreshMotion();
}
function semantics(){
  var node=document.querySelector('.fixedTopShop.wtopShopMenuMobile');
  if(node){node.setAttribute('role','navigation');node.setAttribute('aria-label','Categorías de la carta');}
}

N.layout=layout;
N.syncLayout=layout;
N.semantics=semantics;
N.restoreStyles=restoreStyles;
})();