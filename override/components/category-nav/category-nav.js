(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,S=C&&C.selectors,M=C&&C.motion,N=SC&&SC.categoryNav;
if(!SC||!U||!N||!N.layout||!N.scheduleRail||!N.refreshMetrics||SC.__categoryNavBooted)return;SC.__categoryNavBooted=true;
var each=U.each,ready=U.ready,mq=N.mq,boundScrollers=new Set(),resizeRaf=0,structureObserver=null,structureRaf=0,motionRefreshRaf=0,geometryTimer=0,initialized=false;

function pruneRailScrollers(){boundScrollers.forEach(function(scroller){if(document.documentElement.contains(scroller))return;scroller.removeEventListener('scroll',N.scheduleRail);boundScrollers.delete(scroller);});}
function bindRailScrollers(){
  pruneRailScrollers();
  each(document.querySelectorAll(N.selectors.scroller+','+N.selectors.mobileScroller),function(scroller){
    if(boundScrollers.has(scroller))return;boundScrollers.add(scroller);scroller.addEventListener('scroll',N.scheduleRail,{passive:true});
  });
}
function unbindRailScrollers(){boundScrollers.forEach(function(scroller){scroller.removeEventListener('scroll',N.scheduleRail);});boundScrollers.clear();}
function invalidateOffset(){if(N.invalidateOffset)N.invalidateOffset();}
function runResize(){resizeRaf=0;if(!initialized)return;invalidateOffset();N.refreshMetrics();N.scheduleRail();}
function resize(){if(initialized&&!resizeRaf)resizeRaf=requestAnimationFrame(runResize);}
function windowScroll(){(N.scheduleSticky||N.scheduleRail)();N.scheduleSpy();}
function interrupt(){if(N.interruptAutoScroll)N.interruptAutoScroll();if(N.releaseSpyHold)N.releaseSpyHold();}
function observeStructure(){if(structureObserver&&document.body)structureObserver.observe(document.body,{childList:true,subtree:true});}
function refreshMotionSafely(){
  if(!initialized||motionRefreshRaf)return;
  motionRefreshRaf=requestAnimationFrame(function(){
    motionRefreshRaf=0;if(!initialized||!SC.motion||typeof SC.motion.run!=='function')return;
    if(structureObserver)structureObserver.disconnect();
    SC.motion.run(function(deps){
      if(!deps||!deps.ScrollTrigger)return;
      try{deps.ScrollTrigger.refresh();}catch(error){if(!(error&&error.name==='SecurityError')&&window.console&&console.error)console.error('[SushiClub motion]',error);}
    });
    if(structureObserver){structureObserver.takeRecords();observeStructure();}
  });
}
function syncStructure(){
  structureRaf=0;if(!initialized)return;invalidateOffset();N.layout();N.semantics();bindRailScrollers();
  if(structureObserver)structureObserver.takeRecords();
  refreshMotionSafely();
}
function breakpoint(){syncStructure();}
function refreshGeometry(){if(!initialized)return;invalidateOffset();N.refreshMetrics();N.scheduleRail();}
function scheduleStructure(){if(initialized&&!structureRaf)structureRaf=requestAnimationFrame(syncStructure);}
function structural(node){
  if(!node||node.nodeType!==1)return false;
  var selector=S.container+', '+S.categoryToolbar+', '+N.selectors.mobileWrapper+', .wrapp-nav-tabsTopShop';
  if(node.matches&&node.matches(selector))return true;
  return !!(node.querySelector&&node.querySelector(S.container));
}
function watchStructure(){
  if(structureObserver||!window.MutationObserver||!document.body)return;
  structureObserver=new MutationObserver(function(mutations){for(var i=0;i<mutations.length;i++){var mutation=mutations[i],nodes=Array.prototype.concat.call([],Array.from(mutation.addedNodes||[]),Array.from(mutation.removedNodes||[]));if(nodes.some(structural)){scheduleStructure();return;}}});
  observeStructure();
}
function addListeners(){
  document.addEventListener('click',N.onCategory,true);document.addEventListener('change',N.onSelect,true);
  window.addEventListener('scroll',windowScroll,{passive:true});window.addEventListener('resize',resize,{passive:true});
  window.addEventListener('wheel',interrupt,{passive:true});window.addEventListener('touchstart',interrupt,{passive:true});
  if(mq.addEventListener)mq.addEventListener('change',breakpoint);else mq.addListener(breakpoint);
}
function removeListeners(){
  document.removeEventListener('click',N.onCategory,true);document.removeEventListener('change',N.onSelect,true);
  window.removeEventListener('scroll',windowScroll);window.removeEventListener('resize',resize);window.removeEventListener('wheel',interrupt);window.removeEventListener('touchstart',interrupt);
  if(mq.removeEventListener)mq.removeEventListener('change',breakpoint);else mq.removeListener(breakpoint);
}
function init(){
  if(initialized)return;initialized=true;addListeners();syncStructure();if(N.categoryIndicator&&N.categoryIndicator.resume)N.categoryIndicator.resume();watchStructure();if(N.installMotion)N.installMotion();
  geometryTimer=window.setTimeout(function(){geometryTimer=0;if(!initialized)return;N.semantics();refreshGeometry();},M.geometryRefreshDelay);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(refreshGeometry).catch(function(){});
}
function destroy(){
  if(!initialized)return;initialized=false;removeListeners();unbindRailScrollers();
  if(structureObserver){structureObserver.disconnect();structureObserver=null;}
  if(resizeRaf){cancelAnimationFrame(resizeRaf);resizeRaf=0;}if(structureRaf){cancelAnimationFrame(structureRaf);structureRaf=0;}if(motionRefreshRaf){cancelAnimationFrame(motionRefreshRaf);motionRefreshRaf=0;}if(geometryTimer){clearTimeout(geometryTimer);geometryTimer=0;}
  if(N.cancelRailState)N.cancelRailState();if(N.stopSpy)N.stopSpy();if(N.interruptAutoScroll)N.interruptAutoScroll();if(N.categoryIndicator&&N.categoryIndicator.pause)N.categoryIndicator.pause();
}

ready(init);
N.syncLayout=N.layout;N.scheduleRailState=N.scheduleRail;N.resolveAnchor=N.anchor;N.refreshSections=N.refreshMetrics;N.repairStructure=scheduleStructure;N.init=init;N.destroy=destroy;
})();
