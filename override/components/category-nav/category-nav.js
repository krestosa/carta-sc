(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,S=C&&C.selectors,M=C&&C.motion,N=SC&&SC.categoryNav;
if(!SC||!U||!N||!N.layout||!N.scheduleRail||!N.refreshMetrics||SC.__categoryNavBooted)return;SC.__categoryNavBooted=true;
var each=U.each,ready=U.ready,mq=N.mq,boundScrollers=new WeakSet(),resizeRaf=0,structureObserver=null,structureRaf=0;

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
function syncStructure(){
  structureRaf=0;invalidateOffset();N.layout();N.semantics();bindRailScrollers();
}
function breakpoint(){syncStructure();}
function refreshGeometry(){invalidateOffset();N.refreshMetrics();N.scheduleRail();}
function scheduleStructure(){if(!structureRaf)structureRaf=requestAnimationFrame(syncStructure);}
function structural(node){if(!node||node.nodeType!==1)return false;var selector=S.container+', '+S.categoryToolbar+', '+N.selectors.mobileWrapper+', .wrapp-nav-tabsTopShop';return node.matches(selector)||!!(node.querySelector&&node.querySelector(selector));}
function watchStructure(){if(structureObserver||!window.MutationObserver||!document.body)return;structureObserver=new MutationObserver(function(mutations){for(var i=0;i<mutations.length;i++){var mutation=mutations[i],nodes=Array.prototype.concat.call([],Array.from(mutation.addedNodes||[]),Array.from(mutation.removedNodes||[]));if(nodes.some(structural)){scheduleStructure();return;}}});structureObserver.observe(document.body,{childList:true,subtree:true});}

document.addEventListener('click',N.onCategory,true);
document.addEventListener('change',N.onSelect,true);
window.addEventListener('scroll',windowScroll,{passive:true});
window.addEventListener('resize',resize,{passive:true});

ready(function(){
  syncStructure();watchStructure();
  if(N.installMotion)N.installMotion();
  setTimeout(function(){N.semantics();refreshGeometry();},M.geometryRefreshDelay);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(refreshGeometry).catch(function(){});
});
if(mq.addEventListener)mq.addEventListener('change',breakpoint);else mq.addListener(breakpoint);

N.syncLayout=N.layout;
N.scheduleRailState=N.scheduleRail;
N.resolveAnchor=N.anchor;
N.refreshSections=N.refreshMetrics;
N.repairStructure=scheduleStructure;
})();
