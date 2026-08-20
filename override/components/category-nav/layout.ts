/* Reubica el riel legacy dentro de la barra propia según el breakpoint. Conserva el nodo
   original para no duplicar listeners y restaura su ubicación exacta al volver a mobile. */
(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,S=C&&C.selectors,K=C&&C.classes,N=SC&&SC.categoryNav,T=SC&&SC.templates;if(!SC||!U||!N||!T||SC.__categoryNavLayoutBooted)return;SC.__categoryNavLayoutBooted=true;
var each=U.each,nav:HTMLElement|null=null,home:Node|null=null,next:Node|null=null,toolbar:HTMLElement|null=null,styles=new Map<HTMLElement,string|null>();

function toolbarNode(container:HTMLElement):HTMLElement{var node=T.clone('category-toolbar') as HTMLElement;container.insertBefore(node,container.firstChild);return node;}
/* Descarta referencias de una estructura legacy reemplazada y adopta el riel vigente. */
function captureNav():boolean{
  var candidate=document.querySelector<HTMLElement>(N.selectors.mobileWrapper+' '+'.wrapp-nav-tabsTopShop');
  if(candidate&&candidate!==nav){
    restoreStyles();styles.clear();
    if(nav&&document.documentElement.contains(nav)&&nav.parentNode)nav.parentNode.removeChild(nav);
    nav=candidate;home=nav.parentNode;next=nav.nextSibling;return true;
  }
  if(nav&&document.documentElement.contains(nav))return true;
  restoreStyles();styles.clear();nav=candidate;home=nav&&nav.parentNode;next=nav&&nav.nextSibling;return!!nav;
}
/* Quita referencias a links que ya no pertenecen al DOM activo. */
function pruneStyles():void{styles.forEach(function(_value: string|null,link:HTMLElement){if(!document.documentElement.contains(link))styles.delete(link);});}
/* Quita tamaños inline del legacy mientras el riel está bajo control del override. */
function normalize(root:ParentNode):void{
  pruneStyles();
  each(root.querySelectorAll<HTMLElement>(".nav-top-li > a.anchorLink"),function(link:HTMLElement){
    if(!styles.has(link))styles.set(link,link.getAttribute('style'));
    link.style.removeProperty('font-size');
  });
}
function restoreStyles():void{
  styles.forEach(function(value:string|null,link:HTMLElement){
    if(!document.documentElement.contains(link))return;
    value===null?link.removeAttribute('style'):link.setAttribute('style',value);
  });
}
/* Monta o desmonta la barra desktop sin recrear la navegación original. */
function layout():void{
  if(N.mq.matches){
    var container=document.querySelector<HTMLElement>(S.container);if(!container)return;
    each(container.querySelectorAll<HTMLElement>(S.productList+'.'+"sc-first-catalog-section"),function(node:HTMLElement){node.classList.remove("sc-first-catalog-section");});
    var first=Array.from(container.querySelectorAll<HTMLElement>(S.productList)).find(function(node:HTMLElement){return!!node.querySelector(S.productCard+','+S.sectionTitle);});
    if(first)first.classList.add("sc-first-catalog-section");
    if(!captureNav()||!nav)return;
    if(!toolbar||!document.documentElement.contains(toolbar))toolbar=toolbarNode(container);
    var scroller=toolbar.querySelector<HTMLElement>(N.selectors.scroller);if(!scroller)return;if(nav.parentNode!==scroller)scroller.appendChild(nav);
    normalize(nav);document.body.classList.add(K.catalogLayoutReady);
  }else{
    document.body&&document.body.classList.remove(K.catalogLayoutReady);
    each(document.querySelectorAll<HTMLElement>(S.productList+'.'+"sc-first-catalog-section"),function(node:HTMLElement){node.classList.remove("sc-first-catalog-section");});
    captureNav();
    if(nav&&home&&document.documentElement.contains(home)){next&&next.parentNode===home?home.insertBefore(nav,next):home.appendChild(nav);}
    restoreStyles();if(toolbar&&toolbar.parentNode)toolbar.parentNode.removeChild(toolbar);toolbar=null;
  }
  if(N.refreshMetrics)N.refreshMetrics();
  if(N.scheduleRail)N.scheduleRail();
}
/* Expone navegación semántica aunque el contenedor provenga del DOM legacy. */
function semantics():void{
  var node=document.querySelector<HTMLElement>(N.selectors.mobileWrapper);
  if(node){node.setAttribute('role','navigation');node.setAttribute('aria-label','Categorías de la carta');}
}

N.layout=layout;
N.syncLayout=layout;
N.semantics=semantics;
N.restoreStyles=restoreStyles;
})();