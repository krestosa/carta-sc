(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,D=SC&&SC.productCardData,A=SC&&SC.productCardA11y,P=SC&&SC.productCardContent;
if(!SC||!U||!C||!D||!A||!P||SC.__productCardBooted)return;SC.__productCardBooted=true;
var ready=U.ready,desktopQuery=C.desktopQuery;

function refreshCards(){
  A.enhanceAll();
  P.installFlavorRows();
  P.scheduleDescriptionMeasure();
}
ready(function(){
  refreshCards();
  window.setTimeout(function(){A.enhanceAll();P.scheduleDescriptionMeasure();},180);
  window.addEventListener('resize',P.scheduleDescriptionMeasure,{passive:true});
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