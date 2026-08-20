(function(){
'use strict';
var SC=window.SCOverride,CFG=SC&&SC.config,S=CFG&&CFG.selectors,C=SC&&SC.contentNormalizer,D=C&&C.dom;
if(!SC||!C||!D||SC.__contentNormalizerObserverBooted)return;SC.__contentNormalizerObserverBooted=true;

/* Agrupa hosts mutados y los procesa una vez por frame. */
var observer:MutationObserver|null=null,raf=0,pending=new Set<Element>();
function flush():void{raf=0;var hosts=Array.from(pending);pending.clear();hosts.forEach(function(host:Element):void{D.normalizeHost(host);});if(observer)observer.takeRecords();}
function schedule():void{if(raf)return;raf=requestAnimationFrame(flush);}
function collect(node:Node):void{D.collect(node,pending);}
function collectHost(node:Node):void{var el=node.nodeType===1?node as Element:node.parentElement,host:Element|null;if(!el||!el.closest)return;host=el.closest(D.selector);if(host)pending.add(host);}

/* Desconecta y limpia trabajo pendiente. */
function disconnect():void{if(observer)observer.disconnect();observer=null;if(raf)cancelAnimationFrame(raf);raf=0;pending.clear();}

/* Observa solo el contenedor del catálogo. */
function observe():void{
  disconnect();var root=document.querySelector(S.container)||document.body;if(!root)return;
  observer=new MutationObserver(function(mutations:MutationRecord[]):void{mutations.forEach(function(mutation:MutationRecord):void{collectHost(mutation.target);if(mutation.type==='childList')Array.prototype.forEach.call(mutation.addedNodes||[],collect);});if(pending.size)schedule();});
  observer.observe(root,{subtree:true,childList:true,characterData:true});
}
C.observer={observe:observe,disconnect:disconnect};
})();
