(function(){
'use strict';
var SC=window.SCOverride,N=SC&&SC.categoryNav;if(!SC||!N||SC.__categoryNavMotionBooted)return;SC.__categoryNavMotionBooted=true;
var installed=false;

function install(){
  if(installed||!SC.motion||!SC.motion.whenReady)return;
  installed=true;
  SC.motion.whenReady(function(deps){
    var gsap=deps.gsap,mm=gsap.matchMedia();
    mm.add({desktop:'(min-width: 993px)',compact:'(max-width: 992px)',reduce:'(prefers-reduced-motion: reduce)'},function(ctx){
      var desktop=!!ctx.conditions.desktop,reduce=!!ctx.conditions.reduce;
      var host=desktop?document.querySelector('.sc-catalog-toolbar'):document.querySelector('.fixedTopShop.wtopShopMenuMobile');
      var surface=desktop?host&&host.querySelector('.sc-catalog-categories'):host&&host.querySelector('.topShopMenuMobileScroller');
      if(!host||!surface)return function(){};
      var last=host.classList.contains('sc-is-stuck'),observer;
      function clear(){gsap.killTweensOf(surface);gsap.set(surface,{clearProps:'transform,opacity,visibility'});surface.style.willChange='';}
      function animate(on){
        gsap.killTweensOf(surface);if(reduce)return clear();surface.style.willChange='transform,opacity';
        gsap.fromTo(surface,on?{y:-10,autoAlpha:0.78,scaleY:0.972,transformOrigin:'50% 0%'}:{y:4,autoAlpha:0.9,scaleY:1.008,transformOrigin:'50% 0%'},{
          y:0,autoAlpha:1,scaleY:1,duration:on ? 0.40 : 0.22,ease:on?'power3.out':'power2.out',overwrite:true,clearProps:'transform,opacity,visibility',onComplete:function(){surface.style.willChange='';}
        });
      }
      observer=new MutationObserver(function(){var now=host.classList.contains('sc-is-stuck');if(now!==last){last=now;animate(now);}});
      observer.observe(host,{attributes:true,attributeFilter:['class']});
      if(last&&!reduce)requestAnimationFrame(function(){animate(true);});
      return function(){if(observer)observer.disconnect();clear();};
    });
  });
}

N.installMotion=install;
})();