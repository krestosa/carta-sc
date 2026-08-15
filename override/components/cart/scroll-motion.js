(function(){
'use strict';
var SC=window.SCOverride;if(!SC||SC.__cartScrollMotionBooted)return;SC.__cartScrollMotionBooted=true;
var parts=SC.cartParts=SC.cartParts||{};

parts.setupScroll=function(gsap,ST,profile,reduce){
  var entries=[],observer,raf=0,settle=0,clamp=gsap.utils.clamp(-profile.maxLag,profile.maxLag);
  function target(wrapper){return wrapper.querySelector('.carritoBox')||wrapper.querySelector('.shop_carrito')||wrapper.firstElementChild||wrapper;}
  function entryFor(wrapper){return entries.find(function(entry){return entry.wrapper===wrapper;});}
  function clearTarget(el){
    if(!el)return;
    gsap.killTweensOf(el);gsap.set(el,{y:0,clearProps:'transform'});el.classList.remove('sc-cart-scroll-motion');
  }
  function configure(entry,el){
    if(entry.target&&entry.target!==el)clearTarget(entry.target);
    entry.target=el;entry.move=reduce?null:gsap.quickTo(el,'y',{duration:0.14,ease:'power3.out',overwrite:'auto'});
    el.classList.add('sc-cart-scroll-motion');
  }
  function discover(){
    raf=0;
    entries=entries.filter(function(entry){
      if(document.documentElement.contains(entry.wrapper))return true;
      clearTarget(entry.target);return false;
    });
    gsap.utils.toArray('.carritoFixed').forEach(function(wrapper){
      var el=target(wrapper);if(!el)return;
      var entry=entryFor(wrapper);
      if(!entry){entry={wrapper:wrapper,target:null,move:null};entries.push(entry);}
      if(entry.target!==el)configure(entry,el);
    });
  }
  function affectsCart(mutation){
    var targetNode=mutation.target&&mutation.target.nodeType===1?mutation.target:mutation.target&&mutation.target.parentElement;
    if(targetNode&&targetNode.closest&&targetNode.closest('.carritoFixed'))return true;
    for(var i=0;i<(mutation.addedNodes||[]).length;i+=1){
      var node=mutation.addedNodes[i];if(!node||node.nodeType!==1)continue;
      if(node.matches('.carritoFixed')||(node.querySelector&&node.querySelector('.carritoFixed')))return true;
    }
    return false;
  }
  function schedule(){if(!raf)raf=requestAnimationFrame(discover);}
  function move(y){entries.forEach(function(entry){if(entry.move)entry.move(y);});}
  discover();
  if(document.body){
    observer=new MutationObserver(function(mutations){
      for(var i=0;i<mutations.length;i+=1){if(affectsCart(mutations[i])){schedule();break;}}
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }
  if(reduce)return function(){
    if(observer)observer.disconnect();if(raf)cancelAnimationFrame(raf);entries.forEach(function(entry){clearTarget(entry.target);});
  };
  var tracker=ST.create({start:0,end:'max',onUpdate:function(self){
    var velocity=self.getVelocity();move(Math.abs(velocity)<55?0:clamp(velocity*profile.velocityScale));
    if(settle)clearTimeout(settle);settle=setTimeout(function(){settle=0;move(0);},70);
  },onRefresh:function(){move(0);}});
  return function(){
    if(observer)observer.disconnect();if(raf)cancelAnimationFrame(raf);if(settle)clearTimeout(settle);tracker.kill();
    entries.forEach(function(entry){clearTarget(entry.target);});
  };
};
})();
