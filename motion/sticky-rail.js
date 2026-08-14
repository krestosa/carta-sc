(function(){
'use strict';
if(window.__scStickyRailMotionBooted)return;
window.__scStickyRailMotionBooted=true;

var attempts=0;
var mediaContext=null;

function boot(){
  if(!window.gsap){
    if(attempts++<120)window.setTimeout(boot,50);
    return;
  }

  var gsap=window.gsap;
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

    var lastStuck=host.classList.contains('sc-is-stuck');
    var observer=null;

    function clearMotion(){
      gsap.killTweensOf(surface);
      gsap.set(surface,{clearProps:'transform,opacity,visibility'});
      surface.style.willChange='';
    }

    function animateState(stuck){
      gsap.killTweensOf(surface);

      if(reduce){
        clearMotion();
        return;
      }

      surface.style.willChange='transform,opacity';

      if(stuck){
        gsap.fromTo(surface,{
          y:-10,
          autoAlpha:0.78,
          scaleY:0.972,
          transformOrigin:'50% 0%'
        },{
          y:0,
          autoAlpha:1,
          scaleY:1,
          duration:0.40,
          ease:'power3.out',
          overwrite:true,
          clearProps:'transform,opacity,visibility',
          onComplete:function(){surface.style.willChange='';}
        });
      }else{
        gsap.fromTo(surface,{
          y:4,
          autoAlpha:0.90,
          scaleY:1.008,
          transformOrigin:'50% 0%'
        },{
          y:0,
          autoAlpha:1,
          scaleY:1,
          duration:0.22,
          ease:'power2.out',
          overwrite:true,
          clearProps:'transform,opacity,visibility',
          onComplete:function(){surface.style.willChange='';}
        });
      }
    }

    function sync(){
      var stuck=host.classList.contains('sc-is-stuck');
      if(stuck===lastStuck)return;
      lastStuck=stuck;
      animateState(stuck);
    }

    observer=new MutationObserver(sync);
    observer.observe(host,{attributes:true,attributeFilter:['class']});

    /* Covers restored scroll positions where the page starts already stuck. */
    if(lastStuck&&!reduce)requestAnimationFrame(function(){animateState(true);});

    return function(){
      if(observer)observer.disconnect();
      clearMotion();
    };
  });
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
