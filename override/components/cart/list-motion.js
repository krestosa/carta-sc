(function(){
'use strict';
/* Revela filas nuevas con una secuencia lineal breve. */
var SC=window.SCOverride,C=SC&&SC.config,REFRESH_DELAY=80,OPEN=.5,ITEM=.25;if(!SC||!C||SC.__cartListMotionBooted)return;SC.__cartListMotionBooted=true;
var parts=SC.cartParts=SC.cartParts||{};
parts.setupList=function(gsap,ST,reduce){
  var animatedRows=new WeakSet(),observer,raf=0;
  function rows(table){return Array.prototype.filter.call(table.querySelectorAll('tr'),function(row){return !row.matches('.total, .subtotal, .ahorro')&&(row.offsetParent!==null||row.getClientRects().length>0);});}
  function scan(){raf=0;var changed=false;gsap.utils.toArray('.carritoTable').forEach(function(table){var fresh=rows(table).filter(function(row){return!animatedRows.has(row);});if(!fresh.length)return;fresh.forEach(function(row){animatedRows.add(row);});changed=true;if(reduce){gsap.set(fresh,{autoAlpha:1,clearProps:'opacity,visibility'});return;}var step=(OPEN-ITEM)/Math.max(1,fresh.length);gsap.fromTo(fresh,{autoAlpha:0},{autoAlpha:1,duration:ITEM,stagger:{each:step,from:'start'},ease:'none',overwrite:'auto',clearProps:'opacity,visibility'});});if(changed&&SC.motion&&SC.motion.refresh)SC.motion.refresh(REFRESH_DELAY);}
  function schedule(){if(!raf)raf=requestAnimationFrame(scan);}
  function affectsCart(mutation){var target=mutation.target&&mutation.target.nodeType===1?mutation.target:mutation.target&&mutation.target.parentElement;if(target&&target.closest&&target.closest('.carritoTable'))return true;for(var i=0;i<(mutation.addedNodes||[]).length;i++){var node=mutation.addedNodes[i];if(!node||node.nodeType!==1)continue;if(node.matches('.carritoTable,tr,.carritoFixedContent,.carritoBox,.shop_carrito')||(node.querySelector&&node.querySelector('.carritoTable,tr')))return true;}return false;}
  scan();if(document.body){observer=new MutationObserver(function(mutations){for(var i=0;i<mutations.length;i++){if(affectsCart(mutations[i])){schedule();break;}}});observer.observe(document.body,{childList:true,subtree:true});}
  return function(){if(observer)observer.disconnect();if(raf)cancelAnimationFrame(raf);};
};
})();