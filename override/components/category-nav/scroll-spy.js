(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,K=C&&C.classes,CFG=C&&C.categoryNav,N=SC&&SC.categoryNav,A=N&&N.categoryActive,I=N&&N.categoryIndicator;
if(!SC||!C||!N||!A||!I||SC.__categoryNavScrollSpyBooted)return;SC.__categoryNavScrollSpyBooted=true;
var metrics=[],spyRaf=0,heldTarget=null,heldUntil=0;
function locked(){return document.body.classList.contains(K.catalogSearching);}
function refreshMetrics(){if(locked()){I.markDirty();return;}var seen=[];metrics=[];N.links().forEach(function(link){var target=N.anchor(link.getAttribute('href'));if(!target||seen.indexOf(target)>=0)return;seen.push(target);metrics.push({target:target,top:target.getBoundingClientRect().top+(pageYOffset||document.documentElement.scrollTop||0)});});metrics.sort(function(a,b){return a.top-b.top;});I.markDirty();scheduleSpy();}
function current(){if(!metrics.length)return null;var mark=(pageYOffset||document.documentElement.scrollTop||0)+N.offset()+CFG.currentMarkOffset,target=metrics[0].target;for(var i=0;i<metrics.length;i++){if(metrics[i].top<=mark)target=metrics[i].target;else break;}return target;}
function hold(target){heldTarget=target||null;heldUntil=heldTarget?performance.now()+CFG.spyHoldMs:0;}
function release(){heldTarget=null;heldUntil=0;}
function spy(){spyRaf=0;if(locked())return;var target=current(),active=A.current();if(heldTarget){if(target===heldTarget||performance.now()>=heldUntil)release();else{if(active&&I.isDirty())I.move(active,false);return;}}if(target&&target!==active)A.set(target,true);else if(target&&I.isDirty())I.move(target,false);}
function scheduleSpy(){if(locked())return;if(!spyRaf)spyRaf=requestAnimationFrame(spy);}
window.addEventListener('wheel',release,{passive:true});window.addEventListener('touchstart',release,{passive:true});
N.holdSpy=hold;N.releaseSpyHold=release;N.refreshMetrics=refreshMetrics;N.refreshSections=refreshMetrics;N.current=current;N.scheduleSpy=scheduleSpy;
})();
