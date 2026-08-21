(function(){
'use strict';
/* Revela únicamente filas nuevas del carrito. */
var SC=window.SCOverride,C=SC&&SC.config,M=C&&C.motion,CFG={listOffsetY:4,listDuration:.18,listReducedDuration:.12,listStagger:.028,listReducedStagger:.018},REFRESH_DELAY=80;if(!SC||!C||SC.__cartListMotionBooted)return;SC.__cartListMotionBooted=true;
var parts=SC.cartParts=SC.cartParts||{};

parts.setupList=function(engine:MotionEngine,reduce:boolean):()=>void{
  var animatedRows=new WeakSet<HTMLTableRowElement>(),active=new WeakMap<HTMLTableRowElement,MotionHandle[]>(),observer:MutationObserver|null=null,raf=0;
  function rows(table:HTMLElement):HTMLTableRowElement[]{return Array.from(table.querySelectorAll<HTMLTableRowElement>('tr')).filter(function(row){return !row.matches('.total, .subtotal, .ahorro')&&(row.offsetParent!==null||row.getClientRects().length>0);});}
  function stop(row:HTMLTableRowElement):void{var handles=active.get(row);if(handles)handles.forEach(function(handle){handle.cancel();});active.delete(row);}
  function clear(row:HTMLTableRowElement):void{row.style.removeProperty('transform');row.style.removeProperty('opacity');row.style.removeProperty('visibility');row.style.removeProperty('will-change');}
  function animateRow(row:HTMLTableRowElement,index:number):void{stop(row);var duration=reduce?CFG.listReducedDuration:CFG.listDuration,delay=index*(reduce?CFG.listReducedStagger:CFG.listStagger);row.style.opacity='0';row.style.visibility='visible';if(!reduce)row.style.transform='translate3d(0,'+CFG.listOffsetY+'px,0)';var handles:MotionHandle[]=[];handles.push(engine.opacity(row,1,{duration:duration,delay:delay,ease:M.easings.out}));if(!reduce)handles.push(engine.transform(row,{y:0},{duration:duration,delay:delay,ease:M.easings.out,clear:true,onComplete:function(){active.delete(row);clear(row);}}));else handles.push(engine.delay(delay+duration,function(){active.delete(row);clear(row);}));active.set(row,handles);}
  function scan():void{raf=0;var changed=false;Array.from(document.querySelectorAll<HTMLElement>('.carritoTable')).forEach(function(table){var fresh=rows(table).filter(function(row){return!animatedRows.has(row);});if(!fresh.length)return;fresh.forEach(function(row){animatedRows.add(row);});changed=true;fresh.forEach(animateRow);});if(changed&&SC.motion&&SC.motion.refresh)SC.motion.refresh(REFRESH_DELAY);}
  function schedule():void{if(!raf)raf=requestAnimationFrame(scan);}
  function elementFromNode(node:Node|null):Element|null{return node instanceof Element?node:node&&node.parentElement?node.parentElement:null;}
  function affectsCart(mutation:MutationRecord):boolean{var target=elementFromNode(mutation.target);if(target&&target.closest('.carritoTable'))return true;for(var i=0;i<mutation.addedNodes.length;i+=1){var node=mutation.addedNodes[i];if(!(node instanceof Element))continue;if(node.matches('.carritoTable,tr,.carritoFixedContent,.carritoBox,.shop_carrito')||node.querySelector('.carritoTable,tr'))return true;}return false;}
  scan();if(document.body){observer=new MutationObserver(function(mutations){for(var i=0;i<mutations.length;i+=1){var mutation=mutations[i];if(mutation&&affectsCart(mutation)){schedule();break;}}});observer.observe(document.body,{childList:true,subtree:true});}
  return function(){if(observer)observer.disconnect();if(raf)cancelAnimationFrame(raf);Array.from(document.querySelectorAll<HTMLTableRowElement>('.carritoTable tr')).forEach(function(row){stop(row);clear(row);});};
};
})();
