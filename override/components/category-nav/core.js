(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config;if(!SC||!U||!C||SC.__categoryNavCoreBooted)return;SC.__categoryNavCoreBooted=true;

/* Selectores, offsets y estado del scroll programático. */
var S=C.selectors,N=SC.categoryNav=SC.categoryNav||{},each=U.each,offsetCache=null,autoRaf=0,autoToken=0;
N.selectors=N.selectors||{select:'.JSgoMenu',scroller:'.sc-catalog-categories',mobileWrapper:'.fixedTopShop.wtopShopMenuMobile',mobileRail:'.topShopMenuMobile',mobileScroller:'.topShopMenuMobileScroller'};
var CFG={offsetGap:12,currentMarkOffset:2,programmaticGraceMs:180,settleTolerance:.75};N.currentMarkOffset=CFG.currentMarkOffset;
var scrollState=SC.scrollState=SC.scrollState||{};scrollState.programmatic=false;scrollState.suppressRevealUntil=0;N.mq=C.queries.desktop;

/* Resuelve anchors y relaciones padre/subcategoría. */
function anchor(href){if(!href||href[0]!=='#'||href==='#')return null;var id=href.slice(1);try{id=decodeURIComponent(id);}catch(_){}return document.getElementById(id)||document.getElementsByName(id)[0]||null;}
function parentLink(a){return !!(a&&a.matches&&a.matches("a.anchorLink[href^=\"#\"]")&&!a.classList.contains('anchorLinkSub')&&!a.closest('.topPullDown,.dropdown-menu'));}
function links(root){return Array.prototype.filter.call((root||document).querySelectorAll("a.anchorLink[href^=\"#\"]"),parentLink);}
function subcategoryOwner(link){if(!link)return null;var href=link.getAttribute('data-sc-parent-href');if(href)return anchor(href);var nested=link.closest('.topPullDown');if(!nested)return null;var item=nested.closest('.nav-top-li'),parent=item&&item.querySelector(':scope > a.anchorLink[href^="#"]');return parent?anchor(parent.getAttribute('href')):null;}

/* Calcula el espacio ocupado por headers fijos/sticky. */
function invalidateOffset(){offsetCache=null;}
function persistentSticky(node,style,rect){if(style.position!=='sticky')return 0;var isRail=(S.categoryToolbar&&node.matches(S.categoryToolbar))||node.matches(N.selectors.mobileWrapper);if(!isRail)return rect.top<=CFG.currentMarkOffset&&rect.bottom>0?rect.bottom:0;var top=parseFloat(style.top);if(!isFinite(top))top=0;return Math.max(0,top+rect.height);}
function offset(){
  if(offsetCache!==null)return offsetCache;var bottom=0;['.topBar','.topShop',S.categoryToolbar,N.selectors.mobileWrapper].forEach(function(selector){if(!selector)return;each(document.querySelectorAll(selector),function(node){var style=getComputedStyle(node),rect=node.getBoundingClientRect(),candidate=0;if(rect.height<=0||style.display==='none'||style.visibility==='hidden')return;if(style.position==='fixed'&&rect.top<=CFG.currentMarkOffset&&rect.bottom>0)candidate=rect.bottom;else candidate=persistentSticky(node,style,rect);bottom=Math.max(bottom,candidate);});});offsetCache=Math.ceil(Math.max(0,bottom))+CFG.offsetGap;return offsetCache;
}

/* Cierra estados legacy y limpia hashes técnicos. */
function closeLegacy(){if(SC.mutations&&SC.mutations.closeLegacyCategoryMenus)return SC.mutations.closeLegacyCategoryMenus();each(document.querySelectorAll(S.legacyPullDownOpen),function(node){node.classList.remove('open');});each(document.querySelectorAll(S.legacyMobileOpen),function(node){node.classList.remove('_open');});}
function cleanHash(){if(SC.mutations&&SC.mutations.cleanCategoryHash)return SC.mutations.cleanCategoryHash();if(/^#anchor/i.test(location.hash||''))try{history.replaceState(history.state,document.title,location.pathname+location.search);}catch(_){} }

/* Coordina scroll directo y pausa temporal del scroll-spy. */
function setProgrammatic(on,grace){scrollState.programmatic=!!on;scrollState.suppressRevealUntil=on?Infinity:(grace?performance.now()+CFG.programmaticGraceMs:0);}
function cancelAutoScroll(userInterrupt){autoToken++;if(autoRaf){cancelAnimationFrame(autoRaf);autoRaf=0;}if(userInterrupt){setProgrammatic(false,false);if(N.releaseSpyHold)N.releaseSpyHold();if(N.scheduleSpy)N.scheduleSpy();}}
function targetYFromCurrentOffset(target){var y=target.getBoundingClientRect().top+(pageYOffset||document.documentElement.scrollTop||0)-offset(),max=Math.max(0,document.documentElement.scrollHeight-innerHeight);return Math.max(0,Math.min(max,y));}
function targetY(target){invalidateOffset();return targetYFromCurrentOffset(target);}
function scrollPlan(target){return{y:targetY(target)};}

/* El componente no define una trayectoria vertical; se posiciona y corrige el offset al estabilizar layout. */
function finishAutoScroll(token,target){
  if(token!==autoToken)return;autoRaf=requestAnimationFrame(function(){if(token!==autoToken)return;autoRaf=requestAnimationFrame(function(){autoRaf=0;if(token!==autoToken)return;var finalY=targetY(target),currentY=pageYOffset||document.documentElement.scrollTop||0;if(Math.abs(finalY-currentY)>CFG.settleTolerance)scrollTo(0,finalY);if(N.refreshMetrics)N.refreshMetrics();setProgrammatic(false,true);if(N.releaseSpyHold)N.releaseSpyHold();if(N.scheduleSpy)N.scheduleSpy();});});
}
function scrollToTarget(target,plan){invalidateOffset();plan=plan||scrollPlan(target);cancelAutoScroll(false);var token=++autoToken;setProgrammatic(true,false);scrollTo(0,plan.y);finishAutoScroll(token,target);}
function activateAndScroll(target,activeTarget){activeTarget=activeTarget||target;invalidateOffset();var plan=scrollPlan(target);if(N.holdSpy)N.holdSpy(activeTarget);if(N.setActive)N.setActive(activeTarget,true);scrollToTarget(target,plan);}

/* Maneja click/tap de categorías y subcategorías. */
function onCategory(event){
  if(event.defaultPrevented||event.button>0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;var link=event.target&&event.target.closest?event.target.closest('a.anchorLink, a.anchorLinkSub, a.sc-category-submenu-link'):null;if(!link)return;var submenuLink=link.classList.contains('sc-category-submenu-link'),nestedLegacy=!!link.closest('.topPullDown,.dropdown-menu');if(nestedLegacy&&!submenuLink)return;if(!(link.closest(S.categoryToolbar)||link.closest(N.selectors.mobileWrapper+' '+N.selectors.mobileRail)||link.closest('.sc-category-submenu')))return;var target=anchor(link.getAttribute('href'));if(!target)return;var owner=submenuLink?subcategoryOwner(link):null,hasChildren=!submenuLink&&N.categorySubmenu&&N.categorySubmenu.has(link),compact=!N.mq.matches;event.preventDefault();event.stopImmediatePropagation();closeLegacy();cleanHash();if(submenuLink){if(N.categorySubmenu)N.categorySubmenu.close(false);activateAndScroll(target,owner||target);return;}if(hasChildren&&compact){N.categorySubmenu.open(link,true);return;}if(hasChildren)N.categorySubmenu.open(link,true);activateAndScroll(target,target);
}
function onSelect(event){var select=event.target;if(!select||!select.matches||!select.matches(N.selectors.select))return;var target=anchor(select.value);if(!target)return;event.preventDefault();event.stopImmediatePropagation();closeLegacy();cleanHash();if(N.categorySubmenu)N.categorySubmenu.close(false);activateAndScroll(target,target);}
function interrupt(){if(scrollState.programmatic)cancelAutoScroll(true);}
N.interruptAutoScroll=interrupt;N.resolveAnchor=N.anchor=anchor;N.parentLink=parentLink;N.links=links;N.subcategoryOwner=subcategoryOwner;N.offset=offset;N.invalidateOffset=invalidateOffset;N.closeLegacy=closeLegacy;N.cleanHash=cleanHash;N.scrollToTarget=scrollToTarget;N.onCategory=onCategory;N.onSelect=onSelect;N.isAutoScrolling=function(){return!!scrollState.programmatic;};
})();