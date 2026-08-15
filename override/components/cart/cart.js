(function(){
'use strict';
var SC=window.SCOverride;if(!SC||SC.__cartComponentBooted)return;SC.__cartComponentBooted=true;
if(!SC.motion||typeof SC.motion.whenReady!=='function')return;

SC.motion.whenReady(function(deps){
  var gsap=deps.gsap,ST=deps.ScrollTrigger;
  var mm=gsap.matchMedia();
  mm.add({
    mobile:'(max-width: 767px)',
    tablet:'(min-width: 768px) and (max-width: 992px)',
    desktop:'(min-width: 993px)',
    reduceMotion:'(prefers-reduced-motion: reduce)'
  },function(ctx){
    var tablet=!!ctx.conditions.tablet,desktop=!!ctx.conditions.desktop,reduce=!!ctx.conditions.reduceMotion;
    var profile=desktop?{maxLag:14,velocityScale:.0032}:tablet?{maxLag:10,velocityScale:.0028}:{maxLag:8,velocityScale:.0024};
    var cleanList=setupCartList(gsap,ST,reduce);
    var cleanScroll=setupCartScroll(gsap,ST,profile,reduce);
    var observers=[];

    gsap.utils.toArray('.shopMenuRightIcon .badge, .shopMenuRightIcon .badget').forEach(function(badge){
      var observer=new MutationObserver(function(){
        gsap.killTweensOf(badge);
        if(reduce)gsap.fromTo(badge,{autoAlpha:.72},{autoAlpha:1,duration:.12,ease:'power2.out',clearProps:'opacity,visibility'});
        else gsap.timeline().to(badge,{scale:1.08,duration:.07,ease:'power2.out'}).to(badge,{scale:1,duration:.10,ease:'power2.out'});
      });
      observer.observe(badge,{childList:true,characterData:true,subtree:true});observers.push(observer);
    });

    return function(){cleanList();cleanScroll();observers.forEach(function(observer){observer.disconnect();});};
  });

  function setupCartList(gsap,ST,reduce){
    var animated=new WeakSet(),observer,raf=0,timer=0;
    function root(table){return table.closest('.carritoFixedContent, .carritoBox, .shop_carrito')||table;}
    function rows(table){return Array.prototype.filter.call(table.querySelectorAll('tr'),function(row){return!row.matches('.total, .subtotal, .ahorro')&&(row.offsetParent!==null||row.getClientRects().length>0);});}
    function scan(){
      raf=0;var changed=false;
      gsap.utils.toArray('.carritoTable').forEach(function(table){
        var host=root(table);if(animated.has(host))return;
        var list=rows(table);if(!list.length)return;
        animated.add(host);changed=true;
        gsap.fromTo(list,{autoAlpha:0,y:reduce?0:4},{autoAlpha:1,y:0,duration:reduce?.12:.18,stagger:reduce?.018:.028,ease:'power2.out',overwrite:'auto',clearProps:'transform,opacity,visibility'});
      });
      if(changed){if(timer)clearTimeout(timer);timer=setTimeout(function(){ST.refresh();},80);}
    }
    function schedule(){if(!raf)raf=requestAnimationFrame(scan);}
    scan();
    if(document.body){
      observer=new MutationObserver(function(mutations){
        for(var i=0;i<mutations.length;i+=1){if(mutations[i].addedNodes&&mutations[i].addedNodes.length){schedule();break;}}
      });
      observer.observe(document.body,{childList:true,subtree:true});
    }
    return function(){if(observer)observer.disconnect();if(raf)cancelAnimationFrame(raf);if(timer)clearTimeout(timer);};
  }

  function setupCartScroll(gsap,ST,profile,reduce){
    var entries=[],observer,raf=0,settle=0,clamp=gsap.utils.clamp(-profile.maxLag,profile.maxLag);
    function target(wrapper){return wrapper.querySelector('.carritoBox')||wrapper.querySelector('.shop_carrito')||wrapper.firstElementChild||wrapper;}
    function has(el){return entries.some(function(entry){return entry.target===el;});}
    function discover(){
      raf=0;entries=entries.filter(function(entry){return document.documentElement.contains(entry.target);});
      gsap.utils.toArray('.carritoFixed').forEach(function(wrapper){
        var el=target(wrapper);if(!el||has(el))return;
        el.classList.add('sc-cart-scroll-motion');
        entries.push({target:el,move:reduce?null:gsap.quickTo(el,'y',{duration:.14,ease:'power3.out',overwrite:'auto'})});
      });
    }
    function schedule(){if(!raf)raf=requestAnimationFrame(discover);}
    function move(y){entries.forEach(function(entry){if(entry.move)entry.move(y);});}
    discover();
    if(document.body){
      observer=new MutationObserver(function(mutations){
        for(var i=0;i<mutations.length;i+=1){if(mutations[i].addedNodes&&mutations[i].addedNodes.length){schedule();break;}}
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
      entries.forEach(function(entry){gsap.killTweensOf(entry.target);gsap.set(entry.target,{y:0,clearProps:'transform'});entry.target.classList.remove('sc-cart-scroll-motion');});
    };
  }
});
})();
