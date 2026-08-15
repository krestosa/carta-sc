(function(){
'use strict';
var SC=window.SCOverride;if(!SC||SC.__productCardMotionBooted)return;SC.__productCardMotionBooted=true;

function setupProductReveal(gsap,ST,profile,reduce){
  var cards=gsap.utils.toArray('.listadoShop .productoShop'),triggers=[],timer=0,rafA=0,rafB=0;
  function noop(){}
  if(!cards.length)return noop;
  if(reduce){gsap.set(cards,{clearProps:'opacity,visibility'});return noop;}
  var initial=[],deferred=[];
  cards.forEach(function(card){
    var rect=card.getBoundingClientRect();
    if(rect.bottom<-20)gsap.set(card,{autoAlpha:1,clearProps:'opacity,visibility'});
    else if(rect.top<=window.innerHeight*.96)initial.push(card);
    else deferred.push(card);
  });
  if(initial.length){
    gsap.set(initial,{autoAlpha:0});
    rafA=requestAnimationFrame(function(){rafA=0;rafB=requestAnimationFrame(function(){
      rafB=0;gsap.to(initial,{autoAlpha:1,duration:.34,stagger:.032,ease:'power2.out',overwrite:'auto',onComplete:function(){gsap.set(initial,{clearProps:'opacity,visibility'});}});
    });});
  }
  function reveal(batch){
    gsap.to(batch,{autoAlpha:1,duration:.34,stagger:.03,ease:'power2.out',overwrite:'auto',onComplete:function(){gsap.set(batch,{clearProps:'opacity,visibility'});}});
  }
  if(deferred.length){
    gsap.set(deferred,{autoAlpha:0});
    triggers=ST.batch(deferred,{start:profile.start,once:true,interval:.06,batchMax:profile.batchMax,onEnter:reveal,onEnterBack:reveal})||[];
    timer=window.setTimeout(function(){
      deferred.forEach(function(card){
        var rect=card.getBoundingClientRect(),style=getComputedStyle(card);
        if(rect.top<=innerHeight*1.03&&rect.bottom>=-30&&(style.visibility==='hidden'||parseFloat(style.opacity)<.05)){
          gsap.killTweensOf(card);gsap.to(card,{autoAlpha:1,duration:.20,ease:'power2.out',overwrite:true,clearProps:'opacity,visibility'});
        }
      });
      ST.refresh();
    },900);
  }
  return function(){
    if(rafA)cancelAnimationFrame(rafA);if(rafB)cancelAnimationFrame(rafB);if(timer)clearTimeout(timer);
    triggers.forEach(function(trigger){if(trigger&&trigger.kill)trigger.kill();});
    gsap.killTweensOf(cards);gsap.set(cards,{clearProps:'opacity,visibility'});
  };
}
function installImageParallax(gsap,ST){
  var mm=gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)',function(){
    var desktop=window.matchMedia('(min-width: 993px)').matches,distance=desktop?8:6;
    var images=gsap.utils.toArray('.listadoShop .productoShop .imgShop > img'),tweens=[];
    images.forEach(function(img){
      var frame=img.closest('.imgShop');if(!frame)return;
      frame.style.setProperty('overflow','hidden','important');
      img.style.setProperty('transform','translate3d(0,var(--sc-image-parallax-y,0px),0) scale(1.04)','important');
      img.style.setProperty('transform-origin','50% 50%','important');
      img.style.setProperty('backface-visibility','hidden');
      var tween=gsap.fromTo(img,{'--sc-image-parallax-y':(-distance)+'px'},{
        '--sc-image-parallax-y':distance+'px',ease:'none',overwrite:'auto',
        scrollTrigger:{trigger:frame,start:'top bottom',end:'bottom top',scrub:.75,invalidateOnRefresh:true}
      });
      tweens.push(tween);
    });
    var refreshTimer=window.setTimeout(function(){ST.refresh();},80);
    return function(){
      window.clearTimeout(refreshTimer);
      tweens.forEach(function(tween){if(tween&&tween.scrollTrigger)tween.scrollTrigger.kill();if(tween)tween.kill();});
      images.forEach(function(img){
        img.style.removeProperty('--sc-image-parallax-y');img.style.removeProperty('transform');
        img.style.removeProperty('transform-origin');img.style.removeProperty('backface-visibility');
      });
    };
  });
}
function install(){
  if(!SC.motion||typeof SC.motion.whenReady!=='function')return;
  SC.motion.whenReady(function(deps){
    var gsap=deps.gsap,ST=deps.ScrollTrigger,mm=gsap.matchMedia();
    mm.add({mobile:'(max-width: 767px)',tablet:'(min-width: 768px) and (max-width: 992px)',desktop:'(min-width: 993px)',reduceMotion:'(prefers-reduced-motion: reduce)'},function(ctx){
      var tablet=!!ctx.conditions.tablet,desktop=!!ctx.conditions.desktop,reduce=!!ctx.conditions.reduceMotion;
      var profile=desktop?{batchMax:8,start:'clamp(top 91%)'}:tablet?{batchMax:6,start:'clamp(top 92%)'}:{batchMax:4,start:'clamp(top 93%)'};
      return setupProductReveal(gsap,ST,profile,reduce);
    });
    installImageParallax(gsap,ST);
  });
}
install();
SC.productCardMotion={install:install};
})();