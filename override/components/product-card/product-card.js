(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,D=SC&&SC.productCardData,A=SC&&SC.productCardA11y,P=SC&&SC.productCardContent;
if(!SC||!U||!C||!D||!A||!P||SC.__productCardBooted)return;SC.__productCardBooted=true;
var ready=U.ready,S=C.selectors,M=C.motion,desktopQuery=C.queries.desktop,resizeObserver=null,cardObserver=null,cardRaf=0,geometryTimer=0,lastWidth=-1,resizeFallback=false,initialized=false,RESIZE_WIDTH_TOLERANCE=.5;

function observeCards(){var root=document.querySelector(S.container)||document.body;if(!initialized||!root||!window.MutationObserver)return;if(!cardObserver)cardObserver=new MutationObserver(function(mutations){for(var i=0;i<mutations.length;i++){var mutation=mutations[i],target=mutation.target&&mutation.target.nodeType===1?mutation.target:mutation.target&&mutation.target.parentElement;if(target&&target.closest&&target.closest(S.productCard)&&(!target.closest(S.productCard).querySelector('.sc-product-flavors')||!target.closest(S.productCard).querySelector('.sc-product-price-traits')||!target.closest(S.productCard).querySelector('.sc-card-a11y-meta'))){scheduleCardRefresh();return;}for(var j=0;j<(mutation.addedNodes||[]).length;j++){var added=mutation.addedNodes[j];if(added&&added.nodeType===1&&(added.matches(S.productCard)||(added.querySelector&&added.querySelector(S.productCard)))){scheduleCardRefresh();return;}}for(var k=0;k<(mutation.removedNodes||[]).length;k++){var removed=mutation.removedNodes[k];if(removed&&removed.nodeType===1&&(removed.matches('.sc-product-flavors,.sc-product-price-traits,.sc-card-a11y-meta')||(removed.querySelector&&removed.querySelector('.sc-product-flavors,.sc-product-price-traits,.sc-card-a11y-meta')))){scheduleCardRefresh();return;}}}});cardObserver.disconnect();cardObserver.observe(root,{childList:true,subtree:true});}
function refreshCards(){if(cardObserver)cardObserver.disconnect();A.enhanceAll();P.installFlavorRows();P.scheduleDescriptionMeasure();observeCards();}
function runCardRefresh(){cardRaf=0;if(initialized)refreshCards();}
function scheduleCardRefresh(){if(initialized&&!cardRaf)cardRaf=requestAnimationFrame(runCardRefresh);}
function installResizeTracking(){
  var root=document.querySelector(S.container)||document.body;if(!root)return;
  if(!window.ResizeObserver){window.addEventListener('resize',P.scheduleDescriptionMeasure,{passive:true});resizeFallback=true;return;}
  lastWidth=root.getBoundingClientRect().width;
  resizeObserver=new ResizeObserver(function(entries){var width=entries[0]&&entries[0].contentRect?entries[0].contentRect.width:root.getBoundingClientRect().width;if(Math.abs(width-lastWidth)<RESIZE_WIDTH_TOLERANCE)return;lastWidth=width;P.scheduleDescriptionMeasure();});
  resizeObserver.observe(root);
}
function breakpoint(){if(!initialized)return;P.installFlavorRows();P.scheduleDescriptionMeasure();}
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
