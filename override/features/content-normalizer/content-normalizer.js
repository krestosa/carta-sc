(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.contentNormalizer,D=C&&C.dom,O=C&&C.observer,U=SC&&SC.utils;
if(!SC||!C||!D||!O||!U||window.__scContentNormalizerBooted)return;window.__scContentNormalizerBooted=true;

/* Divide la normalización inicial en trabajo crítico y lotes idle. */
var initialized=false,initialQueue=[],initialIdle=0,initialTimer=0,INITIAL_CRITICAL=12,INITIAL_BATCH=6,INITIAL_BUDGET_MS=4,INITIAL_IDLE_TIMEOUT=1600;
function cancelInitial(){if(initialIdle&&window.cancelIdleCallback)window.cancelIdleCallback(initialIdle);if(initialTimer)clearTimeout(initialTimer);initialIdle=0;initialTimer=0;initialQueue=[];}
function finishInitial(){initialIdle=0;initialTimer=0;initialQueue=[];if(initialized)O.observe();}
function runInitial(deadline){
  initialIdle=0;initialTimer=0;if(!initialized)return;var start=performance.now(),count=0;
  while(initialQueue.length&&count<INITIAL_BATCH&&performance.now()-start<INITIAL_BUDGET_MS&&(!deadline||deadline.didTimeout||deadline.timeRemaining()>2)){D.normalizeHost(initialQueue.shift());count++;}
  if(!initialQueue.length){finishInitial();return;}scheduleInitial();
}
function scheduleInitial(){if(!initialized||initialIdle||initialTimer)return;if(typeof window.requestIdleCallback==='function'){initialIdle=window.requestIdleCallback(runInitial,{timeout:INITIAL_IDLE_TIMEOUT});return;}initialTimer=window.setTimeout(function(){runInitial(null);},32);}

/* Normaliza primero lo visible y luego habilita el observer. */
function init(){
  if(initialized)return;initialized=true;initialQueue=Array.prototype.slice.call(document.querySelectorAll(D.selector));
  var critical=Math.min(INITIAL_CRITICAL,initialQueue.length);while(critical-->0)D.normalizeHost(initialQueue.shift());
  if(initialQueue.length)scheduleInitial();else finishInitial();
}

/* Cancela trabajo pendiente y observación. */
function destroy(){if(!initialized)return;initialized=false;cancelInitial();O.disconnect();}
C.init=init;C.destroy=destroy;
U.ready(init);
})();
