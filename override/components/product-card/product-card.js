(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,D=SC&&SC.productCardData,A=SC&&SC.productCardA11y,P=SC&&SC.productCardContent;
if(!SC||!U||!C||!D||!A||!P||SC.__productCardBooted)return;SC.__productCardBooted=true;
var ready=U.ready,S=C.selectors,M=C.motion,desktopQuery=C.queries.desktop,resizeObserver=null,cardObserver=null,cardRaf=0,geometryTimer=0,lastWidth=-1,resizeFallback=false,initialized=false,RESIZE_WIDTH_TOLERANCE=.5;

function needsEnhancement(card){return!!(card&&(!card.querySelector('.sc-product-flavors')||!card.querySelector('.sc-product-price-traits')||!card.querySelector('.sc-card-a11y-meta')));}
function addedNeedsEnhancement(node){if(!node||node.nodeType!==1)return false;if(node.matches&&node.matches(S.productCard))return needsEnhancement(node);if(!node.querySelectorAll)return false;var cards=node.querySelectorAll(S.productCard);for(var i=0;i<cards.length;i++)if(needsEnhancement(cards[i]))return true;return false;}
function observeCards(){var root=document.querySelector(S.container)||document.body;if(!initialized||!root||!window.MutationObserver)return;if(!cardObserver)cardObserver=new MutationObserver(function(mutations){for(var i=0;i<mutations.length;i++){var mutation=mutations[i],target=mutation.target&&mutation.target.nodeType===1?mutation.target:mutation.target&&mutation.target.parentElement,card=target&&target.closest?target.closest(S.productCard):null;if(needsEnhancement(card)){scheduleCardRefresh();return;}for(var j=0;j<(mutation.addedNodes||[]).length;j++){if(addedNeedsEnhancement(mutation.addedNodes[j])){scheduleCardRefresh();return;}}for(var k=0;k<(mutation.removedNodes||[]).length;k++){var removed=mutation.removedNodes[k];if(removed&&removed.nodeType===1&&(removed.matches('.sc-product-flavors,.sc-product-price-traits,.sc-card-a11y-meta')||(removed.querySelector&&removed.querySelector('.sc-product-flavors,.sc-product-price-traits,.sc-card-a11y-meta')))){scheduleCardRefresh();return;}}}});cardObserver.disconnect();cardObserver.observe(root,{childList:true,subtree:true});}
function refreshCards(){if(cardObserver)cardObserver.disconnect();A.enhanceAll();P.installFlavorRows();P.scheduleDescriptionMeasure();observeCards();}
function runCardRefresh(){cardRaf=0;if(initialized)refreshCards();}
function scheduleCardRefresh(){if(initialized&&!cardRaf)cardRaf=requestAnimationFrame(runCardRefresh);}
function installResizeTracking(){
  var root=document.querySelector(S.container)||document.body;if(!root)return;
  if(!window.ResizeObserver){window.addEventListener('resize',P.scheduleDescriptionMeasure,{passive:true});resizeFallback=true;return;}
  lastWidth=-1;
  resizeObserver=new ResizeObserver(function(entries){var entry=entries[0],width=entry&&entry.contentRect?entry.contentRect.width:root.clientWidth;if(lastWidth>=0&&Math.abs(width-lastWidth)<RESIZE_WIDTH_TOLERANCE)return;lastWidth=width;P.scheduleDescriptionMeasure();});
  resizeObserver.observe(root);
}
function breakpoint(){if(initialized)refreshCards();}
function init(){
  if(initialized)return;initialized=true;refreshCards();installResizeTracking();
  if(desktopQuery.addEventListener)desktopQuery.addEventListener('change',breakpoint);else desktopQuery.addListener(breakpoint);
  geometryTimer=window.setTimeout(function(){geometryTimer=0;if(!initialized)return;A.enhanceAll();P.scheduleDescriptionMeasure();},M.geometryRefreshDelay);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){if(initialized)P.scheduleDescriptionMeasure();}).catch(function(){});
}
function destroy(){
  if(!initialized)return;initialized=false;
  if(cardObserver)cardObserver.disconnect();if(resizeObserver){resizeObserver.disconnect();resizeObserver=null;}if(resizeFallback){window.removeEventListener('resize',P.scheduleDescriptionMeasure);resizeFallback=false;}
  if(cardRaf){cancelAnimationFrame(cardRaf);cardRaf=0;}if(geometryTimer){clearTimeout(geometryTimer);geometryTimer=0;}if(P.cancelDescriptionMeasure)P.cancelDescriptionMeasure();
  if(desktopQuery.removeEventListener)desktopQuery.removeEventListener('change',breakpoint);else desktopQuery.removeListener(breakpoint);
}
ready(init);
SC.productCard={imageSource:D.imageSource,traitLabels:D.traitLabels,buildTraitGroup:D.buildTraitGroup,enhanceProductLinks:A.enhanceAll,refresh:refreshCards,repair:scheduleCardRefresh,init:init,destroy:destroy};
})();
