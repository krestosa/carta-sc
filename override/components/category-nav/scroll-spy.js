(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,K=C&&C.classes,N=SC&&SC.categoryNav,A=N&&N.categoryActive,I=N&&N.categoryIndicator,scrollState=SC&&SC.scrollState;
if(!SC||!C||!N||!A||!I||SC.__categoryNavScrollSpyBooted)return;SC.__categoryNavScrollSpyBooted=true;
var metrics=[],spyRaf=0,heldTarget=null,heldUntil=0,SPY_HOLD_MS=2200;
function locked(){return document.body.classList.contains(K.catalogSearching);}
function refreshMetrics(){
  if(locked()){I.markDirty();return;}var seen=[];metrics=[];
  N.links().forEach(function(link){var target=N.anchor(link.getAttribute('href'));if(!target||seen.indexOf(target)>=0)return;seen.push(target);metrics.push(target);});
  I.markDirty();scheduleSpy();
}
function current(){
  if(!metrics.length)return null;if(N.invalidateOffset)N.invalidateOffset();var mark=N.offset()+N.currentMarkOffset,best=null,bestTop=-Infinity,first=null,firstTop=Infinity;
  for(var i=0;i<metrics.length;i++){
    var node=metrics[i];if(!document.documentElement.contains(node))continue;var top=node.getBoundingClientRect().top;
    if(top<firstTop){firstTop=top;first=node;}if(top<=mark&&top>bestTop){bestTop=top;best=node;}
  }
  return best||first;
}
function hold(target){heldTarget=target||null;heldUntil=heldTarget?performance.now()+SPY_HOLD_MS:0;}
function release(){heldTarget=null;heldUntil=0;}
function spy(){
  spyRaf=0;if(locked())return;var target=current(),active=A.current();
  if(heldTarget){
    if(scrollState&&scrollState.programmatic){if(active!==heldTarget)A.set(heldTarget,false);else if(I.isDirty())I.move(heldTarget,false);return;}
    if(target===heldTarget||performance.now()>=heldUntil)release();else{if(active&&I.isDirty())I.move(active,false);return;}
  }
  if(target&&target!==active)A.set(target,true);else if(target&&I.isDirty())I.move(target,false);
}
function scheduleSpy(){if(locked())return;if(!spyRaf)spyRaf=requestAnimationFrame(spy);}
function stop(){if(spyRaf)cancelAnimationFrame(spyRaf);spyRaf=0;metrics=[];release();}
N.holdSpy=hold;N.releaseSpyHold=release;N.refreshMetrics=refreshMetrics;N.refreshSections=refreshMetrics;N.current=current;N.scheduleSpy=scheduleSpy;N.stopSpy=stop;
})();
