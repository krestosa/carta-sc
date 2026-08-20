(function(){
'use strict';
/* Revela únicamente filas nuevas del carrito. */
var SC=window.SCOverride,C=SC&&SC.config,M=C&&C.motion,CFG={listOffsetY:4,listDuration:.18,listReducedDuration:.12,listStagger:.028,listReducedStagger:.018},REFRESH_DELAY=80;if(!SC||!C||SC.__cartListMotionBooted)return;SC.__cartListMotionBooted=true;
var parts=SC.cartParts=SC.cartParts||{};

parts.setupList=function(gsap:GsapLike,ST:ScrollTriggerLike,reduce:boolean):()=>void{
  void ST;
  var animatedRows=new WeakSet<HTMLTableRowElement>(),observer:MutationObserver|null=null,raf=0;
  function rows(table:HTMLElement):HTMLTableRowElement[]{return Array.prototype.filter.call(table.querySelectorAll<HTMLTableRowElement>('tr'),function(row:HTMLTableRowElement):boolean{return !row.matches('.total, .subtotal, .ahorro')&&(row.offsetParent!==null||row.getClientRects().length>0);}) as HTMLTableRowElement[];}
  function scan():void{
    raf=0;var changed=false;
    gsap.utils.toArray<HTMLElement>('.carritoTable').forEach(function(table:HTMLElement):void{
      var fresh=rows(table).filter(function(row:HTMLTableRowElement):boolean{return!animatedRows.has(row);});if(!fresh.length)return;fresh.forEach(function(row:HTMLTableRowElement):void{animatedRows.add(row);});changed=true;
      gsap.fromTo(fresh,{autoAlpha:0,y:reduce?0:CFG.listOffsetY},{autoAlpha:1,y:0,duration:reduce?CFG.listReducedDuration:CFG.listDuration,stagger:reduce?CFG.listReducedStagger:CFG.listStagger,ease:M.easings.out,overwrite:'auto',clearProps:'transform,opacity,visibility'});
    });
    if(changed&&SC.motion&&SC.motion.refresh)SC.motion.refresh(REFRESH_DELAY);
  }
  function schedule():void{if(!raf)raf=requestAnimationFrame(scan);}
  function elementFromNode(node:Node|null):Element|null{return node instanceof Element?node:node&&node.parentElement?node.parentElement:null;}
  function affectsCart(mutation:MutationRecord):boolean{
    var target=elementFromNode(mutation.target);if(target&&target.closest('.carritoTable'))return true;
    for(var i=0;i<mutation.addedNodes.length;i+=1){var node=mutation.addedNodes[i];if(!(node instanceof Element))continue;if(node.matches('.carritoTable,tr,.carritoFixedContent,.carritoBox,.shop_carrito')||node.querySelector('.carritoTable,tr'))return true;}return false;
  }
  scan();
  if(document.body){observer=new MutationObserver(function(mutations:MutationRecord[]):void{for(var i=0;i<mutations.length;i+=1){var mutation=mutations[i];if(mutation&&affectsCart(mutation)){schedule();break;}}});observer.observe(document.body,{childList:true,subtree:true});}
  return function():void{if(observer)observer.disconnect();if(raf)cancelAnimationFrame(raf);};
};
})();
