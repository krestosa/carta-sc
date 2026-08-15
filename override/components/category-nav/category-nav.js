(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,S=C&&C.selectors,M=C&&C.motion,N=SC&&SC.categoryNav;
if(!SC||!U||!N||!N.layout||!N.scheduleRail||!N.refreshMetrics||SC.__categoryNavBooted)return;SC.__categoryNavBooted=true;
var each=U.each,ready=U.ready,mq=N.mq,boundScrollers=new WeakSet(),resizeRaf=0;

function bindRailScrollers(){
  each(document.querySelectorAll(N.selectors.scroller+','+N.selectors.mobileScroller),function(scroller){
    if(boundScrollers.has(scroller))return;
    boundScrollers.add(scroller);
    scroller.addEventListener('scroll',N.scheduleRail,{passive:true});
  });
}
function invalidateOffset(){if(N.invalidateOffset)N.invalidateOffset();}
function runResize(){
  resizeRaf=0;invalidateOffset();N.refreshMetrics();N.scheduleRail();
}
function resize(){if(!resizeRaf)resizeRaf=requestAnimationFrame(runResize);}
function windowScroll(){(N.scheduleSticky||N.scheduleRail)();N.scheduleSpy();}
function breakpoint(){
  invalidateOffset();N.layout();N.semantics();bindRailScrollers();
}
function refreshGeometry(){invalidateOffset();N.refreshMetrics();N.scheduleRail();}

document.addEventListener('click',N.onCategory,true);
document.addEventListener('change',N.onSelect,true);
window.addEventListener('scroll',windowScroll,{passive:true});
window.addEventListener('resize',resize,{passive:true});

ready(function(){
  invalidateOffset();N.semantics();N.layout();bindRailScrollers();
  if(N.installMotion)N.installMotion();
  setTimeout(function(){N.semantics();refreshGeometry();},M.geometryRefreshDelay);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(refreshGeometry).catch(function(){});
});
if(mq.addEventListener)mq.addEventListener('change',breakpoint);else mq.addListener(breakpoint);

N.syncLayout=N.layout;
N.scheduleRailState=N.scheduleRail;
N.resolveAnchor=N.anchor;
N.refreshSections=N.refreshMetrics;
})();