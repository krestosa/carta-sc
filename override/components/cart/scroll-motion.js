(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,K=C&&C.classes,M=C&&C.motion,CFG={scrollQuickDuration:.14,scrollVelocityFloor:55,scrollSettleDelay:70};if(!SC||!C||SC.__cartScrollMotionBooted)return;SC.__cartScrollMotionBooted=true;
var parts=SC.cartParts=SC.cartParts||{};

parts.setupScroll=function(gsap,ST,profile,reduce){
  var entries=[],observer,raf=0,settle=0,tracker=null,clamp=gsap.utils.clamp(-profile.maxLag,profile.maxLag);
  function target(wrapper){return wrapper.querySelector(".carritoBox")||wrapper.querySelector(".shop_carrito")||wrapper.firstElementChild||wrapper;}
  function entryFor(wrapper){return entries.find(function(entry){return entry.wrapper===wrapper;});}
  function clearTarget(el){
    if(!el)return;
    gsap.killTweensOf(el);gsap.set(el,{y:0,clearProps:'transform'});el.classList.remove("sc-cart-scroll-motion");
  }
  function configure(entry,el){
    if(entry.target&&entry.target!==el)clearTarget(entry.target);
    entry.target=el;entry.move=reduce?null:gsap.quickTo(el,'y',{duration:CFG.scrollQuickDuration,ease:M.easings.strongOut,overwrite:'auto'});
    el.classList.add("sc-cart-scroll-motion");
  }
  function move(y){entries.forEach(function(entry){if(entry.move)entry.move(y);});}
  function stopTracker(){if(settle){clearTimeout(settle);settle=0;}if(tracker){tracker.kill();tracker=null;}}
  function ensureTracker(){
    if(reduce||!entries.length){stopTracker();return;}
    if(tracker)return;
    tracker=ST.create({start:0,end:'max',onUpdate:function(self){
      var velocity=self.getVelocity();move(Math.abs(velocity)<CFG.scrollVelocityFloor?0:clamp(velocity*profile.velocityScale));
      if(settle)clearTimeout(settle);settle=setTimeout(function(){settle=0;move(0);},CFG.scrollSettleDelay);
    },onRefresh:function(){move(0);}});
  }
  function discover(){
    raf=0;
    entries=entries.filter(function(entry){
      if(document.documentElement.contains(entry.wrapper))return true;
      clearTarget(entry.target);return false;
    });
    gsap.utils.toArray(".carritoFixed").forEach(function(wrapper){
      var el=target(wrapper);if(!el)return;
      var entry=entryFor(wrapper);
      if(!entry){entry={wrapper:wrapper,target:null,move:null};entries.push(entry);}
      if(entry.target!==el)configure(entry,el);
    });
    ensureTracker();
  }
  function containsCart(node){return!!(node&&node.nodeType===1&&(node.matches(".carritoFixed")||(node.querySelector&&node.querySelector(".carritoFixed"))));}
  function affectsCart(mutation){
    var targetNode=mutation.target&&mutation.target.nodeType===1?mutation.target:mutation.target&&mutation.target.parentElement;
    if(targetNode&&targetNode.closest&&targetNode.closest(".carritoFixed"))return true;
    for(var i=0;i<(mutation.addedNodes||[]).length;i+=1)if(containsCart(mutation.addedNodes[i]))return true;
    for(var j=0;j<(mutation.removedNodes||[]).length;j+=1)if(containsCart(mutation.removedNodes[j]))return true;
    return false;
  }
  function schedule(){if(!raf)raf=requestAnimationFrame(discover);}
  discover();
  if(document.body){
    observer=new MutationObserver(function(mutations){
      for(var i=0;i<mutations.length;i+=1){if(affectsCart(mutations[i])){schedule();break;}}
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }
  return function(){
    if(observer)observer.disconnect();if(raf)cancelAnimationFrame(raf);stopTracker();
    entries.forEach(function(entry){clearTarget(entry.target);});
  };
};
})();