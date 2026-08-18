(function(){
'use strict';
/* Revela únicamente filas nuevas del carrito. Un WeakSet evita reanimar filas existentes
   y el observer dispara trabajo solo cuando una mutación realmente afecta la tabla. */
var SC=window.SCOverride,C=SC&&SC.config,M=C&&C.motion,CFG={listOffsetY:4,listDuration:.18,listReducedDuration:.12,listStagger:.028,listReducedStagger:.018},REFRESH_DELAY=80;if(!SC||!C||SC.__cartListMotionBooted)return;SC.__cartListMotionBooted=true;
var parts=SC.cartParts=SC.cartParts||{};

parts.setupList=function(gsap,ST,reduce){
  var animatedRows=new WeakSet(),observer,raf=0;
  function rows(table){return Array.prototype.filter.call(table.querySelectorAll('tr'),function(row){return !row.matches('.total, .subtotal, .ahorro')&&(row.offsetParent!==null||row.getClientRects().length>0);});}
  function scan(){
    raf=0;var changed=false;
    gsap.utils.toArray('.carritoTable').forEach(function(table){
      var fresh=rows(table).filter(function(row){return!animatedRows.has(row);});if(!fresh.length)return;fresh.forEach(function(row){animatedRows.add(row);});changed=true;
      gsap.fromTo(fresh,{autoAlpha:0,y:reduce?0:CFG.listOffsetY},{autoAlpha:1,y:0,duration:reduce?CFG.listReducedDuration:CFG.listDuration,stagger:reduce?CFG.listReducedStagger:CFG.listStagger,ease:M.easings.out,overwrite:'auto',clearProps:'transform,opacity,visibility'});
    });
    if(changed&&SC.motion&&SC.motion.refresh)SC.motion.refresh(REFRESH_DELAY);
  }
  function schedule(){if(!raf)raf=requestAnimationFrame(scan);}
  /* Filtra mutaciones ajenas al carrito para no recorrer tablas ante cualquier cambio global. */
  function affectsCart(mutation){
    var target=mutation.target&&mutation.target.nodeType===1?mutation.target:mutation.target&&mutation.target.parentElement;if(target&&target.closest&&target.closest('.carritoTable'))return true;
    for(var i=0;i<(mutation.addedNodes||[]).length;i+=1){var node=mutation.addedNodes[i];if(!node||node.nodeType!==1)continue;if(node.matches('.carritoTable,tr,.carritoFixedContent,.carritoBox,.shop_carrito')||(node.querySelector&&node.querySelector('.carritoTable,tr')))return true;}return false;
  }
  scan();
  if(document.body){observer=new MutationObserver(function(mutations){for(var i=0;i<mutations.length;i+=1){if(affectsCart(mutations[i])){schedule();break;}}});observer.observe(document.body,{childList:true,subtree:true});}
  return function(){if(observer)observer.disconnect();if(raf)cancelAnimationFrame(raf);};
};
})();