(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,D=SC&&SC.productCardData,A=SC&&SC.productCardA11y,P=SC&&SC.productCardContent;
if(!SC||!U||!C||!D||!A||!P||SC.__productCardBooted)return;SC.__productCardBooted=true;
var ready=U.ready,S=C.selectors,M=C.motion,desktopQuery=C.queries.desktop,resizeObserver=null,cardObserver=null,cardRaf=0,lastWidth=-1,RESIZE_WIDTH_TOLERANCE=.5;

function observeCards(){var root=document.querySelector(S.container)||document.body;if(!root||!window.MutationObserver)return;if(!cardObserver)cardObserver=new MutationObserver(function(mutations){for(var i=0;i<mutations.length;i++){var mutation=mutations[i],target=mutation.target&&mutation.target.nodeType===1?mutation.target:mutation.target&&mutation.target.parentElement;if(target&&target.closest&&target.closest(S.productCard)&&(!target.closest(S.productCard).querySelector('.sc-product-flavors')||!target.closest(S.productCard).querySelector('.sc-card-a11y-meta'))){scheduleCardRefresh();return;}for(var j=0;j<(mutation.addedNodes||[]).length;j++){var added=mutation.addedNodes[j];if(added&&added.nodeType===1&&(added.matches(S.productCard)||(added.querySelector&&added.querySelector(S.productCard)))){scheduleCardRefresh();return;}}for(var k=0;k<(mutation.removedNodes||[]).length;k++){var removed=mutation.removedNodes[k];if(removed&&removed.nodeType===1&&(removed.matches('.sc-product-flavors,.sc-card-a11y-meta')||(removed.querySelector&&removed.querySelector('.sc-product-flavors,.sc-card-a11y-meta')))){scheduleCardRefresh();return;}}}});cardObserver.disconnect();cardObserver.observe(root,{childList:true,subtree:true});}
function refreshCards(){
  if(cardObserver)cardObserver.disconnect();
  A.enhanceAll();
  P.installFlavorRows();
  P.scheduleDescriptionMeasure();
  observeCards();
}
function runCardRefresh(){cardRaf=0;refreshCards();}
function scheduleCardRefresh(){if(!cardRaf)cardRaf=requestAnimationFrame(runCardRefresh);}
function installResizeTracking(){
  var root=document.querySelector(S.container)||document.body;
  if(!root||!window.ResizeObserver){
    window.addEventListener('resize',P.scheduleDescriptionMeasure,{passive:true});
    return;
  }
  lastWidth=root.getBoundingClientRect().width;
  resizeObserver=new ResizeObserver(function(entries){
    var width=entries[0]&&entries[0].contentRect?entries[0].contentRect.width:root.getBoundingClientRect().width;
    if(Math.abs(width-lastWidth)<RESIZE_WIDTH_TOLERANCE)return;
    lastWidth=width;
    P.scheduleDescriptionMeasure();
  });
  resizeObserver.observe(root);
}
ready(function(){
  refreshCards();
  installResizeTracking();
  window.setTimeout(function(){A.enhanceAll();P.scheduleDescriptionMeasure();},M.geometryRefreshDelay);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(P.scheduleDescriptionMeasure).catch(function(){});
});
var breakpoint=function(){P.installFlavorRows();P.scheduleDescriptionMeasure();};
if(desktopQuery.addEventListener)desktopQuery.addEventListener('change',breakpoint);else desktopQuery.addListener(breakpoint);

SC.productCard={
  imageSource:D.imageSource,
  traitLabels:D.traitLabels,
  buildTraitGroup:D.buildTraitGroup,
  enhanceProductLinks:A.enhanceAll,
  refresh:refreshCards,
  repair:scheduleCardRefresh
};
})();
