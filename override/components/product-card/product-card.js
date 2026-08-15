(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,D=SC&&SC.productCardData,A=SC&&SC.productCardA11y,P=SC&&SC.productCardContent;
if(!SC||!U||!C||!D||!A||!P||SC.__productCardBooted)return;SC.__productCardBooted=true;
var ready=U.ready,desktopQuery=C.desktopQuery,resizeObserver=null,lastWidth=-1;

function refreshCards(){
  A.enhanceAll();
  P.installFlavorRows();
  P.scheduleDescriptionMeasure();
}
function installResizeTracking(){
  var root=document.querySelector('.containerShop')||document.body;
  if(!root||!window.ResizeObserver){
    window.addEventListener('resize',P.scheduleDescriptionMeasure,{passive:true});
    return;
  }
  lastWidth=root.getBoundingClientRect().width;
  resizeObserver=new ResizeObserver(function(entries){
    var width=entries[0]&&entries[0].contentRect?entries[0].contentRect.width:root.getBoundingClientRect().width;
    if(Math.abs(width-lastWidth)<0.5)return;
    lastWidth=width;
    P.scheduleDescriptionMeasure();
  });
  resizeObserver.observe(root);
}
ready(function(){
  refreshCards();
  installResizeTracking();
  window.setTimeout(function(){A.enhanceAll();P.scheduleDescriptionMeasure();},180);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(P.scheduleDescriptionMeasure).catch(function(){});
});
var breakpoint=function(){P.installFlavorRows();P.scheduleDescriptionMeasure();};
if(desktopQuery.addEventListener)desktopQuery.addEventListener('change',breakpoint);else desktopQuery.addListener(breakpoint);

SC.productCard={
  imageSource:D.imageSource,
  traitLabels:D.traitLabels,
  buildTraitGroup:D.buildTraitGroup,
  enhanceProductLinks:A.enhanceAll,
  refresh:refreshCards
};
})();