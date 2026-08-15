(function(){
'use strict';
var SC=window.SCOverride;if(!SC||SC.__productCardParallaxMotionBooted)return;SC.__productCardParallaxMotionBooted=true;
var parts=SC.productCardMotionParts=SC.productCardMotionParts||{};

parts.installParallax=function(gsap,ST){
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
        scrollTrigger:{trigger:frame,start:'top bottom',end:'bottom top',scrub:0.75,invalidateOnRefresh:true}
      });
      tweens.push(tween);
    });
    var refreshTimer=window.setTimeout(function(){ST.refresh();},80);
    return function(){
      window.clearTimeout(refreshTimer);
      tweens.forEach(function(tween){if(tween&&tween.scrollTrigger)tween.scrollTrigger.kill();if(tween)tween.kill();});
      images.forEach(function(img){
        img.style.removeProperty('--sc-image-parallax-y');
        img.style.removeProperty('transform');
        img.style.removeProperty('transform-origin');
        img.style.removeProperty('backface-visibility');
      });
    };
  });
};
})();