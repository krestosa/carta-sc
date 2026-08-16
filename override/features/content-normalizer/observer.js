(function(){
'use strict';
var SC=window.SCOverride,CFG=SC&&SC.config,S=CFG&&CFG.selectors,C=SC&&SC.contentNormalizer,D=C&&C.dom;
if(!SC||!C||!D||SC.__contentNormalizerObserverBooted)return;SC.__contentNormalizerObserverBooted=true;
var observer=null,raf=0,pending=new Set();
function flush(){raf=0;var hosts=Array.from(pending);pending.clear();hosts.forEach(D.normalizeHost);if(observer)observer.takeRecords();}
function schedule(){if(raf)return;raf=requestAnimationFrame(flush);}
function collect(node){D.collect(node,pending);}
function disconnect(){if(observer)observer.disconnect();observer=null;if(raf)cancelAnimationFrame(raf);raf=0;pending.clear();}
function observe(){
  disconnect();var root=document.querySelector(S.container)||document.body;if(!root)return;
  observer=new MutationObserver(function(mutations){mutations.forEach(function(mutation){collect(mutation.target);Array.prototype.forEach.call(mutation.addedNodes||[],collect);});if(pending.size)schedule();});
  observer.observe(root,{subtree:true,childList:true,characterData:true});
}
C.observer={observe:observe,disconnect:disconnect};
})();
