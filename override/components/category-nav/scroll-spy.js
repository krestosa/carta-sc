(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,K=C&&C.classes,N=SC&&SC.categoryNav,A=N&&N.categoryActive,I=N&&N.categoryIndicator,scrollState=SC&&SC.scrollState;
if(!SC||!C||!N||!A||!I||SC.__categoryNavScrollSpyBooted)return;SC.__categoryNavScrollSpyBooted=true;
var metrics=[],spyOffset=0,spyRaf=0,measureRaf=0,heldTarget=null,heldUntil=0,SPY_HOLD_MS=2200;
function locked(){return document.body.classList.contains(K.catalogSearching);}
function pageY(){return window.pageYOffset||document.documentElement.scrollTop||0;}
function measureMetrics(){
  measureRaf=0;if(locked()){I.markDirty();return;}var seen=[],next=[],y=pageY();
  N.links().forEach(function(link){var target=N.anchor(link.getAttribute('href')),rect;if(!target||seen.indexOf(target)>=0)return;seen.push(target);rect=target.getBoundingClientRect();next.push({node:target,top:rect.top+y});});
  next.sort(function(a,b){return a.top-b.top;});metrics=next;
  /* Prime the sticky offset in the same settled read phase. Scroll frames then
     need no geometry reads at all. */
  spyOffset=N.offset();I.markDirty();scheduleSpy();
}
function refreshMetrics(){
  if(locked()){I.markDirty();return;}if(measureRaf)cancelAnimationFrame(measureRaf);
  /* Layout/card/tool mutations often call refresh synchronously. Measure only
     after two frames so style writes have been committed and cannot force a
     write -> layout-read flush. */
  measureRaf=requestAnimationFrame(function(){measureRaf=requestAnimationFrame(measureMetrics);});
}
function current(){
  if(!metrics.length)return null;var mark=pageY()+spyOffset+N.currentMarkOffset,lo=0,hi=metrics.length-1,best=-1;
  while(lo<=hi){var mid=(lo+hi)>>1;if(metrics[mid].top<=mark){best=mid;lo=mid+1;}else hi=mid-1;}
  var item=metrics[best>=0?best:0];
  if(!item||!document.documentElement.contains(item.node)){refreshMetrics();return null;}
  return item.node;
}
function hold(target){heldTarget=target||null;heldUntil=heldTarget?performance.now()+SPY_HOLD_MS:0;}
function release(){heldTarget=null;heldUntil=0;}
function spy(){
  spyRaf=0;if(locked())return;var active=A.current(),target;
  if(heldTarget&&scrollState&&scrollState.programmatic){if(active!==heldTarget)A.set(heldTarget,false);else if(I.isDirty())I.move(heldTarget,false);return;}
  target=current();
  if(heldTarget){
    if(target===heldTarget||performance.now()>=heldUntil)release();else{if(active&&I.isDirty())I.move(active,false);return;}
  }
  if(target&&target!==active)A.set(target,true);else if(target&&I.isDirty())I.move(target,false);
}
function scheduleSpy(){if(locked())return;if(!spyRaf)spyRaf=requestAnimationFrame(spy);}
function stop(){if(spyRaf)cancelAnimationFrame(spyRaf);if(measureRaf)cancelAnimationFrame(measureRaf);spyRaf=measureRaf=0;metrics=[];release();}
N.holdSpy=hold;N.releaseSpyHold=release;N.refreshMetrics=refreshMetrics;N.refreshSections=refreshMetrics;N.current=current;N.scheduleSpy=scheduleSpy;N.stopSpy=stop;
})();
