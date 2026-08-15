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
      var tween=gsap.fromTo(img,{'--sc-image-parallax-y':(-distance)+'px'},{
        '--sc-image-parallax-y':distance+'px',ease:'none',overwrite:'auto',
        scrollTrigger:{trigger:frame,start:'top bottom',end:'bottom top',scrub:0.75,invalidateOnRefresh:true}
      });
      tweens.push(tween);
    });
    if(SC.motion&&SC.motion.refresh)SC.motion.refresh(80);
    return function(){
      tweens.forEach(function(tween){if(tween&&tween.scrollTrigger)tween.scrollTrigger.kill();if(tween)tween.kill();});
      images.forEach(function(img){img.style.removeProperty('--sc-image-parallax-y');});
    };
  });
};
})();