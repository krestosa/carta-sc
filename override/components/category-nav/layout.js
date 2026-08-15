(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,S=C&&C.selectors,K=C&&C.classes,N=SC&&SC.categoryNav,T=SC&&SC.templates;if(!SC||!U||!N||!T||SC.__categoryNavLayoutBooted)return;SC.__categoryNavLayoutBooted=true;
var each=U.each,nav=null,home=null,next=null,toolbar=null,styles=new Map();

function toolbarNode(container){var node=T.clone('category-toolbar');container.insertBefore(node,container.firstChild);return node;}
function normalize(root){
  each(root.querySelectorAll(".nav-top-li > a.anchorLink"),function(link){
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
    var container=document.querySelector(S.container);if(!container)return;
    each(container.querySelectorAll(S.productList+'.'+"sc-first-catalog-section"),function(node){node.classList.remove("sc-first-catalog-section");});
    var first=Array.prototype.find.call(container.querySelectorAll(S.productList),function(node){return!!node.querySelector(S.productCard+','+S.sectionTitle);});
    if(first)first.classList.add("sc-first-catalog-section");
    if(!nav){nav=document.querySelector(N.selectors.mobileWrapper+' '+".wrapp-nav-tabsTopShop");if(!nav)return;home=nav.parentNode;next=nav.nextSibling;}
    if(!toolbar||!document.documentElement.contains(toolbar))toolbar=toolbarNode(container);
    var scroller=toolbar.querySelector(N.selectors.scroller);if(nav.parentNode!==scroller)scroller.appendChild(nav);
    normalize(nav);document.body.classList.add(K.catalogLayoutReady);
  }else{
    document.body&&document.body.classList.remove(K.catalogLayoutReady);
    each(document.querySelectorAll(S.productList+'.'+"sc-first-catalog-section"),function(node){node.classList.remove("sc-first-catalog-section");});
    if(nav&&home){next&&next.parentNode===home?home.insertBefore(nav,next):home.appendChild(nav);}
    restoreStyles();if(toolbar&&toolbar.parentNode)toolbar.parentNode.removeChild(toolbar);toolbar=null;
  }
  if(N.refreshMetrics)N.refreshMetrics();
  if(N.scheduleRail)N.scheduleRail();
  U.refreshMotion();
}
function semantics(){
  var node=document.querySelector(N.selectors.mobileWrapper);
  if(node){node.setAttribute('role','navigation');node.setAttribute('aria-label','Categorías de la carta');}
}

N.layout=layout;
N.syncLayout=layout;
N.semantics=semantics;
N.restoreStyles=restoreStyles;
})();
