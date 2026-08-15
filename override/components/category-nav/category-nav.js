(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,N=SC&&SC.categoryNav;
if(!SC||!U||!N||!N.layout||!N.scheduleRail||!N.refreshMetrics||SC.__categoryNavBooted)return;SC.__categoryNavBooted=true;
var each=U.each,ready=U.ready,mq=N.mq;

function resize(){N.refreshMetrics();N.scheduleRail();}
function breakpoint(){N.layout();N.semantics();resize();}

document.addEventListener('click',N.onCategory,true);
document.addEventListener('change',N.onSelect,true);
window.addEventListener('scroll',N.scheduleRail,{passive:true});
window.addEventListener('scroll',N.scheduleSpy,{passive:true});
document.addEventListener('scroll',N.scheduleRail,true);
window.addEventListener('resize',resize,{passive:true});

ready(function(){
  N.semantics();N.layout();N.refreshMetrics();N.scheduleRail();
  if(N.installMotion)N.installMotion();
  each(document.querySelectorAll('.sc-catalog-categories,.topShopMenuMobileScroller'),function(scroller){scroller.addEventListener('scroll',N.scheduleRail,{passive:true});});
  setTimeout(function(){N.semantics();N.refreshMetrics();},180);
});
if(mq.addEventListener)mq.addEventListener('change',breakpoint);else mq.addListener(breakpoint);

N.syncLayout=N.layout;
N.scheduleRailState=N.scheduleRail;
N.resolveAnchor=N.anchor;
N.refreshSections=N.refreshMetrics;
})();