(function(){
'use strict';
if(window.__scStickyRailMotionBooted)return;
window.__scStickyRailMotionBooted=true;

var retryTimer=0;
var attempts=0;
var mediaContext=null;

function boot(){
  if(!window.gsap||!window.ScrollTrigger){
    if(attempts++<120)retryTimer=window.setTimeout(boot,50);
    return;
  }

  var gsap=window.gsap;
  var ST=window.ScrollTrigger;
  gsap.registerPlugin(ST);

  mediaContext=gsap.matchMedia();
  mediaContext.add({
    desktop:'(min-width: 993px)',
    compact:'(max-width: 992px)',
    reduceMotion:'(prefers-reduced-motion: reduce)'
  },function(ctx){
    var desktop=!!ctx.conditions.desktop;
    var reduce=!!ctx.conditions.reduceMotion;
    var host=desktop
      ? document.querySelector('.sc-catalog-toolbar')
      : document.querySelector('.fixedTopShop.wtopShopMenuMobile');
    var surface=desktop
      ? host&&host.querySelector('.sc-catalog-categories')
      : host&&host.querySelector('.topShopMenuMobileScroller');

    if(!host||!surface)return function(){};

    function settle(sticking){
      gsap.killTweensOf(surface);

      if(reduce){
        gsap.set(surface,{clearProps:'transform'});
        surface.style.willChange='';
        return;
      }

      surface.style.willChange='transform';
      gsap.fromTo(surface,{
        y:sticking?-6:3,
        scaleY:sticking?0.985:1.008,
        transformOrigin:'50% 0%'
      },{
        y:0,
        scaleY:1,
        duration:sticking?0.34:0.22,
        ease:sticking?'power3.out':'power2.out',
        overwrite:'auto',
        clearProps:'transform',
        onComplete:function(){surface.style.willChange='';}
      });
    }

    var trigger=ST.create({
      id:'sc-category-sticky-motion-'+(desktop?'desktop':'compact'),
      trigger:host,
      start:'top top',
      end:'max',
      invalidateOnRefresh:true,
      onEnter:function(){settle(true);},
      onLeaveBack:function(){settle(false);}
    });

    return function(){
      trigger.kill();
      gsap.killTweensOf(surface);
      gsap.set(surface,{clearProps:'transform'});
      surface.style.willChange='';
    };
  });
}

function ready(){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}

ready();
})();
