/* Calcula qué sección está activa según el scroll y sincroniza el riel sin leer geometría
   en cada frame. Las métricas se recalculan solo cuando cambia el layout o la estructura. */
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
  /* Calcula el offset sticky en la misma fase de lectura. Los frames de scroll siguientes
     trabajan con métricas cacheadas y no necesitan volver a consultar geometría. */
  spyOffset=N.offset();I.markDirty();scheduleSpy();
}
function refreshMetrics(){
  if(locked()){I.markDirty();return;}if(measureRaf)cancelAnimationFrame(measureRaf);
  /* Las mutaciones de layout suelen pedir refresh de forma síncrona. Esperar dos frames
     permite que las escrituras terminen antes de medir y evita forzar un layout inmediato. */
  measureRaf=requestAnimationFrame(function(){measureRaf=requestAnimationFrame(measureMetrics);});
}
/* Busca por binaria la última sección cuyo inicio ya cruzó la marca visual del viewport. */
function current(){
  if(!metrics.length)return null;var mark=pageY()+spyOffset+N.currentMarkOffset,lo=0,hi=metrics.length-1,best=-1;
  while(lo<=hi){var mid=(lo+hi)>>1;if(metrics[mid].top<=mark){best=mid;lo=mid+1;}else hi=mid-1;}
  var item=metrics[best>=0?best:0];
  if(!item||!document.documentElement.contains(item.node)){refreshMetrics();return null;}
  return item.node;
}
/* Durante scroll programático mantiene el destino elegido y evita rebotes del estado activo. */
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
