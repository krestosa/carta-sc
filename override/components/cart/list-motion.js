(function(){
'use strict';
var SC=window.SCOverride;if(!SC||SC.__cartListMotionBooted)return;SC.__cartListMotionBooted=true;
var parts=SC.cartParts=SC.cartParts||{};

parts.setupList=function(gsap,ST,reduce){
  var animated=new WeakSet(),observer,raf=0;
  function root(table){return table.closest('.carritoFixedContent, .carritoBox, .shop_carrito')||table;}
  function rows(table){
    return Array.prototype.filter.call(table.querySelectorAll('tr'),function(row){
      return !row.matches('.total, .subtotal, .ahorro')&&(row.offsetParent!==null||row.getClientRects().length>0);
    });
  }
  function affectsCart(mutation){
    var target=mutation.target&&mutation.target.nodeType===1?mutation.target:mutation.target&&mutation.target.parentElement;
    var table=target&&target.closest&&target.closest('.carritoTable');
    if(table&&!animated.has(root(table)))return true;
    for(var i=0;i<(mutation.addedNodes||[]).length;i+=1){
      var node=mutation.addedNodes[i];if(!node||node.nodeType!==1)continue;
      if(node.matches('.carritoTable,.carritoFixedContent,.carritoBox,.shop_carrito'))return true;
      if(node.querySelector&&node.querySelector('.carritoTable'))return true;
    }
    return false;
  }
  function scan(){
    raf=0;var changed=false;
    gsap.utils.toArray('.carritoTable').forEach(function(table){
      var host=root(table);if(animated.has(host))return;
      var list=rows(table);if(!list.length)return;
      animated.add(host);changed=true;
      gsap.fromTo(list,{autoAlpha:0,y:reduce?0:4},{
        autoAlpha:1,y:0,duration:reduce?0.12:0.18,stagger:reduce?0.018:0.028,
        ease:'power2.out',overwrite:'auto',clearProps:'transform,opacity,visibility'
      });
    });
    if(changed&&SC.motion&&SC.motion.refresh)SC.motion.refresh(80);
  }
  function schedule(){if(!raf)raf=requestAnimationFrame(scan);}
  scan();
  if(document.body){
    observer=new MutationObserver(function(mutations){
      for(var i=0;i<mutations.length;i+=1){if(affectsCart(mutations[i])){schedule();break;}}
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }
  return function(){if(observer)observer.disconnect();if(raf)cancelAnimationFrame(raf);};
};
})();