(function(){
'use strict';
/* Añade una respuesta vertical mínima al carrito fijo según la velocidad de scroll. */
var SC=window.SCOverride,C=SC&&SC.config,M=C&&C.motion,CFG={scrollQuickDuration:.14,scrollVelocityFloor:55,scrollSettleDelay:70};if(!SC||!C||SC.__cartScrollMotionBooted)return;SC.__cartScrollMotionBooted=true;
var parts=SC.cartParts=SC.cartParts||{};
interface CartScrollProfile{maxLag:number;velocityScale:number}
interface CartScrollEntry{wrapper:HTMLElement;target:HTMLElement|null;move:GsapQuickTo|null}

parts.setupScroll=function(gsap:GsapLike,ST:ScrollTriggerLike,profile:CartScrollProfile,reduce:boolean):()=>void{
  var entries:CartScrollEntry[]=[],observer:MutationObserver|null=null,raf=0,settleCall:GsapTween|null=null,tracker:ScrollTriggerInstance|null=null,clamp=gsap.utils.clamp(-profile.maxLag,profile.maxLag);
  function target(wrapper:HTMLElement):HTMLElement{return (wrapper.querySelector<HTMLElement>('.carritoBox')||wrapper.querySelector<HTMLElement>('.shop_carrito')||wrapper.firstElementChild||wrapper) as HTMLElement;}
  function entryFor(wrapper:HTMLElement):CartScrollEntry|undefined{return entries.find(function(entry:CartScrollEntry):boolean{return entry.wrapper===wrapper;});}
  function clearTarget(el:HTMLElement|null):void{if(!el)return;gsap.killTweensOf(el);gsap.set(el,{y:0,clearProps:'transform'});el.classList.remove('sc-cart-scroll-motion');}
  function configure(entry:CartScrollEntry,el:HTMLElement):void{if(entry.target&&entry.target!==el)clearTarget(entry.target);entry.target=el;entry.move=reduce?null:gsap.quickTo(el,'y',{duration:CFG.scrollQuickDuration,ease:M.easings.strongOut,overwrite:'auto'});el.classList.add('sc-cart-scroll-motion');}
  function move(y:number):void{entries.forEach(function(entry:CartScrollEntry):void{if(entry.move)entry.move(y);});}
  function settleNow():void{move(0);}
  function scheduleSettle():void{if(!settleCall)settleCall=gsap.delayedCall(CFG.scrollSettleDelay/1000,settleNow).pause();settleCall.restart(true);}
  function stopTracker():void{if(settleCall){settleCall.kill();settleCall=null;}if(tracker){tracker.kill();tracker=null;}}
  function ensureTracker():void{
    if(reduce||!entries.length){stopTracker();return;}if(tracker)return;
    tracker=ST.create({start:0,end:'max',onUpdate:function(self:ScrollTriggerInstance):void{var velocity=self.getVelocity();move(Math.abs(velocity)<CFG.scrollVelocityFloor?0:clamp(velocity*profile.velocityScale));scheduleSettle();},onRefresh:function():void{move(0);}});
  }
  function discover():void{
    raf=0;entries=entries.filter(function(entry:CartScrollEntry):boolean{if(document.documentElement.contains(entry.wrapper))return true;clearTarget(entry.target);return false;});
    gsap.utils.toArray<HTMLElement>('.carritoFixed').forEach(function(wrapper:HTMLElement):void{var el=target(wrapper),entry=entryFor(wrapper);if(!entry){entry={wrapper:wrapper,target:null,move:null};entries.push(entry);}if(entry.target!==el)configure(entry,el);});ensureTracker();
  }
  function containsCart(node:Node):boolean{return node instanceof Element&&(node.matches('.carritoFixed')!==false||!!node.querySelector('.carritoFixed'));}
  function affectsCart(mutation:MutationRecord):boolean{var targetNode=mutation.target instanceof Element?mutation.target:mutation.target.parentElement;if(targetNode&&targetNode.closest('.carritoFixed'))return true;for(var i=0;i<mutation.addedNodes.length;i+=1){var added=mutation.addedNodes[i];if(added&&containsCart(added))return true;}for(var j=0;j<mutation.removedNodes.length;j+=1){var removed=mutation.removedNodes[j];if(removed&&containsCart(removed))return true;}return false;}
  function schedule():void{if(!raf)raf=requestAnimationFrame(discover);}
  discover();
  if(document.body){observer=new MutationObserver(function(mutations:MutationRecord[]):void{for(var i=0;i<mutations.length;i+=1){var mutation=mutations[i];if(mutation&&affectsCart(mutation)){schedule();break;}}});observer.observe(document.body,{childList:true,subtree:true});}
  return function():void{if(observer)observer.disconnect();if(raf)cancelAnimationFrame(raf);stopTracker();entries.forEach(function(entry:CartScrollEntry):void{clearTarget(entry.target);});};
};
})();
