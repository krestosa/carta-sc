(function(){
'use strict';
/* Añade una respuesta vertical mínima al carrito fijo según la velocidad de scroll. */
var SC=window.SCOverride,C=SC&&SC.config,M=C&&C.motion,CFG={scrollQuickDuration:.14,scrollVelocityFloor:55,scrollSettleDelay:70};if(!SC||!C||SC.__cartScrollMotionBooted)return;SC.__cartScrollMotionBooted=true;
var parts=SC.cartParts=SC.cartParts||{};
interface CartScrollProfile{maxLag:number;velocityScale:number}
interface CartScrollEntry{wrapper:HTMLElement;target:HTMLElement|null;move:MotionHandle|null}

parts.setupScroll=function(engine:MotionEngine,profile:CartScrollProfile,reduce:boolean):()=>void{
  var entries:CartScrollEntry[]=[],observer:MutationObserver|null=null,raf=0,settle:MotionHandle|null=null,lastY=window.scrollY||window.pageYOffset||0,lastT=performance.now();
  function clamp(value:number):number{return Math.max(-profile.maxLag,Math.min(profile.maxLag,value));}
  function target(wrapper:HTMLElement):HTMLElement{return (wrapper.querySelector<HTMLElement>('.carritoBox')||wrapper.querySelector<HTMLElement>('.shop_carrito')||wrapper.firstElementChild||wrapper) as HTMLElement;}
  function entryFor(wrapper:HTMLElement):CartScrollEntry|undefined{return entries.find(function(entry){return entry.wrapper===wrapper;});}
  function stopMove(entry:CartScrollEntry):void{if(entry.move){entry.move.cancel();entry.move=null;}}
  function clearTarget(entry:CartScrollEntry):void{if(!entry.target)return;stopMove(entry);entry.target.style.removeProperty('transform');entry.target.style.removeProperty('will-change');entry.target.classList.remove('sc-cart-scroll-motion');}
  function configure(entry:CartScrollEntry,el:HTMLElement):void{if(entry.target&&entry.target!==el)clearTarget(entry);entry.target=el;entry.move=null;el.classList.add('sc-cart-scroll-motion');}
  function move(y:number):void{entries.forEach(function(entry){if(!entry.target)return;stopMove(entry);entry.move=engine.transform(entry.target,{y:y},{duration:CFG.scrollQuickDuration,ease:M.easings.strongOut,onComplete:function(){entry.move=null;}});});}
  function settleNow():void{settle=null;move(0);}
  function scheduleSettle():void{if(settle)settle.cancel();settle=engine.delay(CFG.scrollSettleDelay/1000,settleNow);}
  function onScroll():void{if(reduce)return;var now=performance.now(),y=window.scrollY||window.pageYOffset||0,dt=Math.max(16,now-lastT),velocity=(y-lastY)*1000/dt;lastY=y;lastT=now;move(Math.abs(velocity)<CFG.scrollVelocityFloor?0:clamp(velocity*profile.velocityScale));scheduleSettle();}
  function discover():void{raf=0;entries=entries.filter(function(entry){if(document.documentElement.contains(entry.wrapper))return true;clearTarget(entry);return false;});Array.from(document.querySelectorAll<HTMLElement>('.carritoFixed')).forEach(function(wrapper){var el=target(wrapper),entry=entryFor(wrapper);if(!entry){entry={wrapper:wrapper,target:null,move:null};entries.push(entry);}if(entry.target!==el)configure(entry,el);});}
  function containsCart(node:Node):boolean{return node instanceof Element&&(node.matches('.carritoFixed')||!!node.querySelector('.carritoFixed'));}
  function affectsCart(mutation:MutationRecord):boolean{var targetNode=mutation.target instanceof Element?mutation.target:mutation.target.parentElement;if(targetNode&&targetNode.closest('.carritoFixed'))return true;for(var i=0;i<mutation.addedNodes.length;i+=1){var added=mutation.addedNodes[i];if(added&&containsCart(added))return true;}for(var j=0;j<mutation.removedNodes.length;j+=1){var removed=mutation.removedNodes[j];if(removed&&containsCart(removed))return true;}return false;}
  function schedule():void{if(!raf)raf=requestAnimationFrame(discover);}
  function refresh():void{move(0);lastY=window.scrollY||window.pageYOffset||0;lastT=performance.now();}
  discover();window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('sc:motionrefresh',refresh);
  if(document.body){observer=new MutationObserver(function(mutations){for(var i=0;i<mutations.length;i+=1){var mutation=mutations[i];if(mutation&&affectsCart(mutation)){schedule();break;}}});observer.observe(document.body,{childList:true,subtree:true});}
  return function(){window.removeEventListener('scroll',onScroll);window.removeEventListener('sc:motionrefresh',refresh);if(observer)observer.disconnect();if(raf)cancelAnimationFrame(raf);if(settle)settle.cancel();entries.forEach(clearTarget);};
};
})();
