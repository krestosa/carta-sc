(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,M=C&&C.motion,CFG=C&&C.cart;if(!SC||!C||SC.__cartListMotionBooted)return;SC.__cartListMotionBooted=true;
var parts=SC.cartParts=SC.cartParts||{};

parts.setupList=function(gsap,ST,reduce){
  var animated=new WeakSet(),observer,raf=0;
  function root(table){return table.closest(S.cartContent)||table;}
  function rows(table){
    return Array.prototype.filter.call(table.querySelectorAll(S.cartRow),function(row){
      return !row.matches(S.cartTotalRow)&&(row.offsetParent!==null||row.getClientRects().length>0);
    });
  }
  function affectsCart(mutation){
    var target=mutation.target&&mutation.target.nodeType===1?mutation.target:mutation.target&&mutation.target.parentElement;
    var table=target&&target.closest&&target.closest(S.cartTable);
    if(table&&!animated.has(root(table)))return true;
    for(var i=0;i<(mutation.addedNodes||[]).length;i+=1){
      var node=mutation.addedNodes[i];if(!node||node.nodeType!==1)continue;
      if(node.matches(S.cartTable+','+S.cartContent))return true;
      if(node.querySelector&&node.querySelector(S.cartTable))return true;
    }
    return false;
  }
  function scan(){
    raf=0;var changed=false;
    gsap.utils.toArray(S.cartTable).forEach(function(table){
      var host=root(table);if(animated.has(host))return;
      var list=rows(table);if(!list.length)return;
      animated.add(host);changed=true;
      gsap.fromTo(list,{autoAlpha:0,y:reduce?0:CFG.listOffsetY},{
        autoAlpha:1,y:0,duration:reduce?CFG.listReducedDuration:CFG.listDuration,stagger:reduce?CFG.listReducedStagger:CFG.listStagger,
        ease:M.easings.out,overwrite:'auto',clearProps:'transform,opacity,visibility'
      });
    });
    if(changed&&SC.motion&&SC.motion.refresh)SC.motion.refresh(M.cartRefreshDelay);
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