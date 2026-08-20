(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config;if(!SC||!U||!C||SC.__categoryNavCoreBooted)return;SC.__categoryNavCoreBooted=true;
interface ScrollPlan { y:number; distance:number; duration:number; }
/* Selectores, offsets y estado del scroll programático. */
var S=C.selectors,K=C.classes,N=SC.categoryNav=SC.categoryNav||{},each=U.each,offsetCache:number|null=null,autoRaf=0,autoToken=0;
N.selectors=N.selectors||{select:'.JSgoMenu',scroller:'.sc-catalog-categories',mobileWrapper:'.fixedTopShop.wtopShopMenuMobile',mobileRail:'.topShopMenuMobile',mobileScroller:'.topShopMenuMobileScroller'};
var CFG={offsetGap:12,currentMarkOffset:2,programmaticGraceMs:180,scrollMinDuration:.72,scrollMaxDuration:1.36,scrollDistanceScale:2400,scrollDistancePower:.62,settleTolerance:.75};N.currentMarkOffset=CFG.currentMarkOffset;
var scrollState=SC.scrollState=SC.scrollState||{};scrollState.programmatic=false;scrollState.suppressRevealUntil=0;N.mq=C.queries.desktop;

/* Resuelve anchors y relaciones padre/subcategoría. */
function anchor(href:string|null):HTMLElement|null{if(!href||href[0]!=='#'||href==='#')return null;var id=href.slice(1);try{id=decodeURIComponent(id);}catch(_error){}return document.getElementById(id)||document.getElementsByName(id)[0]||null;}
function parentLink(a:Element):boolean{return a.matches('a.anchorLink[href^="#"]')&&!a.classList.contains('anchorLinkSub')&&!a.closest('.topPullDown,.dropdown-menu');}
function links(root?:ParentNode):HTMLAnchorElement[]{return Array.prototype.filter.call((root||document).querySelectorAll('a.anchorLink[href^="#"]'),parentLink) as HTMLAnchorElement[];}
function subcategoryOwner(link:Element|null):HTMLElement|null{
  if(!link)return null;var href=link.getAttribute('data-sc-parent-href');if(href)return anchor(href);var nested=link.closest('.topPullDown');if(!nested)return null;
  var item=nested.closest('.nav-top-li'),parent=item&&item.querySelector<HTMLAnchorElement>(':scope > a.anchorLink[href^="#"]');return parent?anchor(parent.getAttribute('href')):null;
}

/* Calcula el espacio ocupado por headers fijos/sticky. */
function invalidateOffset():void{offsetCache=null;}
function persistentSticky(node:HTMLElement,style:CSSStyleDeclaration,rect:DOMRect):number{
  if(style.position!=='sticky')return 0;var isRail=(S.categoryToolbar&&node.matches(S.categoryToolbar))||node.matches(N.selectors.mobileWrapper);if(!isRail)return rect.top<=CFG.currentMarkOffset&&rect.bottom>0?rect.bottom:0;var top=parseFloat(style.top);if(!isFinite(top))top=0;return Math.max(0,top+rect.height);
}
function offset():number{
  if(offsetCache!==null)return offsetCache;var bottom=0;
  ['.topBar','.topShop',S.categoryToolbar,N.selectors.mobileWrapper].forEach(function(selector:string){if(!selector)return;each(document.querySelectorAll(selector),function(node:Element){var element=node as HTMLElement,style=getComputedStyle(element),rect=element.getBoundingClientRect(),candidate=0;if(rect.height<=0||style.display==='none'||style.visibility==='hidden')return;if(style.position==='fixed'&&rect.top<=CFG.currentMarkOffset&&rect.bottom>0)candidate=rect.bottom;else candidate=persistentSticky(element,style,rect);bottom=Math.max(bottom,candidate);});});
  offsetCache=Math.ceil(Math.max(0,bottom))+CFG.offsetGap;return offsetCache;
}

/* Cierra estados legacy y limpia hashes técnicos. */
function closeLegacy():void{if(SC.mutations&&SC.mutations.closeLegacyCategoryMenus){SC.mutations.closeLegacyCategoryMenus();return;}each(document.querySelectorAll(S.legacyPullDownOpen),function(node:Element){node.classList.remove('open');});each(document.querySelectorAll(S.legacyMobileOpen),function(node:Element){node.classList.remove('_open');});}
function cleanHash():void{if(SC.mutations&&SC.mutations.cleanCategoryHash){SC.mutations.cleanCategoryHash();return;}if(/^#anchor/i.test(location.hash||''))try{history.replaceState(history.state,document.title,location.pathname+location.search);}catch(_error){} }

/* Coordina scroll automático y pausa temporal del scroll-spy. */
function setProgrammatic(on:boolean,grace:boolean):void{scrollState.programmatic=on;scrollState.suppressRevealUntil=on?Infinity:(grace?performance.now()+CFG.programmaticGraceMs:0);}
function cancelAutoScroll(userInterrupt:boolean):void{autoToken++;if(autoRaf){cancelAnimationFrame(autoRaf);autoRaf=0;}if(userInterrupt){setProgrammatic(false,false);if(N.releaseSpyHold)N.releaseSpyHold();if(N.scheduleSpy)N.scheduleSpy();}}
function durationFor(distance:number):number{var range=CFG.scrollMaxDuration-CFG.scrollMinDuration;return Math.min(CFG.scrollMaxDuration,Math.max(CFG.scrollMinDuration,CFG.scrollMinDuration+Math.pow(Math.min(1,distance/CFG.scrollDistanceScale),CFG.scrollDistancePower)*range));}
function targetYFromCurrentOffset(target:HTMLElement):number{var y=target.getBoundingClientRect().top+(pageYOffset||document.documentElement.scrollTop||0)-offset(),max=Math.max(0,document.documentElement.scrollHeight-innerHeight);return Math.max(0,Math.min(max,y));}
function targetY(target:HTMLElement):number{invalidateOffset();return targetYFromCurrentOffset(target);}
function scrollPlan(target:HTMLElement):ScrollPlan{var y=targetY(target),startY=pageYOffset||document.documentElement.scrollTop||0,distance=Math.abs(y-startY),instant=C.queries.reducedMotion.matches||distance<CFG.currentMarkOffset;return{y:y,distance:distance,duration:instant?0:durationFor(distance)};}
function ease(p:number):number{return p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;}

/* Busca el heading asociado para confirmar visualmente el destino. */
function headingFor(target:HTMLElement|null):HTMLElement|null{
  if(!target)return null;var selector=S.sectionTitle+','+S.sectionSubtitle;if(target.matches(selector))return target;
  var node=target.nextElementSibling,steps=0;while(node&&steps<5){if(node.matches(selector))return node as HTMLElement;if(node.matches(S.productCard))break;node=node.nextElementSibling;steps++;}
  var parent=target.parentElement;if(!parent)return null;var headings=parent.querySelectorAll<HTMLElement>(selector),targetTop=target.getBoundingClientRect().top;
  for(var i=0;i<headings.length;i++){var heading=headings.item(i);if(heading&&heading.getBoundingClientRect().top>=targetTop-2)return heading;}return null;
}
function confirmCategory(target:HTMLElement):void{
  var heading=headingFor(target);if(!heading||C.queries.reducedMotion.matches||!heading.animate)return;var previous=heading.__scCategoryConfirm;if(previous)try{previous.cancel();}catch(_error){}
  var activeHeading:HTMLElement=heading,animation=activeHeading.animate([{opacity:.62},{opacity:1}],{duration:260,easing:'cubic-bezier(.22,1,.36,1)'});activeHeading.__scCategoryConfirm=animation;animation.onfinish=animation.oncancel=function(){if(activeHeading.__scCategoryConfirm===animation)activeHeading.__scCategoryConfirm=null;};
}

/* Anima scroll y corrige la posición final con el offset actual. */
function finishAutoScroll(token:number,target:HTMLElement):void{
  if(token!==autoToken)return;autoRaf=requestAnimationFrame(function(){if(token!==autoToken)return;autoRaf=requestAnimationFrame(function(){autoRaf=0;if(token!==autoToken)return;var finalY=targetY(target),currentY=pageYOffset||document.documentElement.scrollTop||0;if(Math.abs(finalY-currentY)>CFG.settleTolerance)scrollTo(0,finalY);if(N.refreshMetrics)N.refreshMetrics();setProgrammatic(false,true);if(N.releaseSpyHold)N.releaseSpyHold();if(N.scheduleSpy)N.scheduleSpy();confirmCategory(target);});});
}
function animateScroll(target:HTMLElement,token:number,duration:number,destination:number):void{
  var startY=pageYOffset||document.documentElement.scrollTop||0,start=performance.now(),ms=duration*1000;
  function frame(now:number):void{if(token!==autoToken)return;if(offsetCache===null)destination=targetYFromCurrentOffset(target);var p=Math.min(1,(now-start)/ms);scrollTo(0,startY+(destination-startY)*ease(p));if(p<1)autoRaf=requestAnimationFrame(frame);else{autoRaf=0;finishAutoScroll(token,target);}}
  autoRaf=requestAnimationFrame(frame);
}
function scrollToTarget(target:HTMLElement,plan?:ScrollPlan):void{invalidateOffset();var activePlan=plan||scrollPlan(target);cancelAutoScroll(false);var token=++autoToken;setProgrammatic(true,false);if(!activePlan.duration){scrollTo(0,targetY(target));finishAutoScroll(token,target);return;}animateScroll(target,token,activePlan.duration,activePlan.y);}
function activateAndScroll(target:HTMLElement,activeTarget?:HTMLElement|null):void{var selected=activeTarget||target;invalidateOffset();var plan=scrollPlan(target);if(N.holdSpy)N.holdSpy(selected);if(N.setActive)N.setActive(selected,true);scrollToTarget(target,plan);}

/* Maneja click/tap de categorías y subcategorías. */
function onCategory(event:MouseEvent):void{
  if(event.defaultPrevented||event.button>0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  var origin=event.target instanceof Element?event.target:null,link=origin&&origin.closest<HTMLAnchorElement>('a.anchorLink, a.anchorLinkSub, a.sc-category-submenu-link');if(!link)return;
  var submenuLink=link.classList.contains('sc-category-submenu-link'),nestedLegacy=!!link.closest('.topPullDown,.dropdown-menu');if(nestedLegacy&&!submenuLink)return;
  if(!(link.closest(S.categoryToolbar)||link.closest(N.selectors.mobileWrapper+' '+N.selectors.mobileRail)||link.closest('.sc-category-submenu')))return;
  var target=anchor(link.getAttribute('href'));if(!target)return;var owner=submenuLink?subcategoryOwner(link):null,hasChildren=!submenuLink&&N.categorySubmenu&&N.categorySubmenu.has(link),compact=!N.mq.matches;
  event.preventDefault();event.stopImmediatePropagation();closeLegacy();cleanHash();
  if(submenuLink){if(N.categorySubmenu)N.categorySubmenu.close(false);activateAndScroll(target,owner||target);return;}
  if(hasChildren&&compact){N.categorySubmenu.open(link,true);return;}if(hasChildren)N.categorySubmenu.open(link,true);activateAndScroll(target,target);
}
function onSelect(event:Event):void{var select=event.target instanceof HTMLSelectElement?event.target:null;if(!select||!select.matches(N.selectors.select))return;var target=anchor(select.value);if(!target)return;event.preventDefault();event.stopImmediatePropagation();closeLegacy();cleanHash();if(N.categorySubmenu)N.categorySubmenu.close(false);activateAndScroll(target,target);}
function interrupt():void{if(scrollState.programmatic)cancelAutoScroll(true);}
N.interruptAutoScroll=interrupt;N.resolveAnchor=N.anchor=anchor;N.parentLink=parentLink;N.links=links;N.subcategoryOwner=subcategoryOwner;N.offset=offset;N.invalidateOffset=invalidateOffset;N.closeLegacy=closeLegacy;N.cleanHash=cleanHash;N.scrollToTarget=scrollToTarget;N.onCategory=onCategory;N.onSelect=onSelect;N.isAutoScrolling=function(){return!!scrollState.programmatic;};
})();