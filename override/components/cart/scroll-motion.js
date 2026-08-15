(function(){
'use strict';
var SC=window.SCOverride;if(!SC||SC.__cartScrollMotionBooted)return;SC.__cartScrollMotionBooted=true;
var parts=SC.cartParts=SC.cartParts||{};

parts.setupScroll=function(gsap,ST,profile,reduce){
  var entries=[],observer,raf=0,settle=0,clamp=gsap.utils.clamp(-profile.maxLag,profile.maxLag);
  function target(wrapper){return wrapper.querySelector('.carritoBox')||wrapper.querySelector('.shop_carrito')||wrapper.firstElementChild||wrapper;}
  function has(el){return entries.some(function(entry){return entry.target===el;});}
  function discover(){
    raf=0;entries=entries.filter(function(entry){return document.documentElement.contains(entry.target);});
    gsap.utils.toArray('.carritoFixed').forEach(function(wrapper){
      var el=target(wrapper);if(!el||has(el))return;
      el.classList.add('sc-cart-scroll-motion');
      entries.push({target:el,move:reduce?null:gsap.quickTo(el,'y',{duration:0.14,ease:'power3.out',overwrite:'auto'})});
    });
  }
  function schedule(){if(!raf)raf=requestAnimationFrame(discover);}
  function move(y){entries.forEach(function(entry){if(entry.move)entry.move(y);});}
  discover();
  if(document.body){
    observer=new MutationObserver(function(mutations){
      for(var i=0;i<mutations.length;i+=1){
        if(mutations[i].addedNodes&&mutations[i].addedNodes.length){schedule();break;}
      }
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }
  if(reduce)return function(){if(observer)observer.disconnect();if(raf)cancelAnimationFrame(raf);};
  var tracker=ST.create({start:0,end:'max',onUpdate:function(self){
    var velocity=self.getVelocity();move(Math.abs(velocity)<55?0:clamp(velocity*profile.velocityScale));
    if(settle)clearTimeout(settle);settle=setTimeout(function(){settle=0;move(0);},70);
  },onRefresh:function(){move(0);}});
  return function(){
    if(observer)observer.disconnect();if(raf)cancelAnimationFrame(raf);if(settle)clearTimeout(settle);tracker.kill();
    entries.forEach(function(entry){
      gsap.killTweensOf(entry.target);gsap.set(entry.target,{y:0,clearProps:'transform'});entry.target.classList.remove('sc-cart-scroll-motion');
    });
  };
};
})();