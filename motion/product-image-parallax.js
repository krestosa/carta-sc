(function(){
'use strict';
if(window.__scProductImageParallaxBooted)return;
window.__scProductImageParallaxBooted=true;

var attempts=0;
var mm=null;

function boot(){
  if(!window.gsap||!window.ScrollTrigger){
    if(attempts++<120)window.setTimeout(boot,50);
    return;
  }

  var gsap=window.gsap;
  var ST=window.ScrollTrigger;
  mm=gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)',function(){
    var desktop=window.matchMedia('(min-width: 993px)').matches;
    var distance=desktop?8:6;
    var images=gsap.utils.toArray('.listadoShop .productoShop .imgShop > img');
    var tweens=[];

    images.forEach(function(img){
      var frame=img.closest('.imgShop');
      if(!frame)return;

      frame.style.setProperty('overflow','hidden','important');
      img.style.setProperty('transform','translate3d(0,var(--sc-image-parallax-y,0px),0) scale(1.04)','important');
      img.style.setProperty('transform-origin','50% 50%','important');
      img.style.setProperty('backface-visibility','hidden');

      var tween=gsap.fromTo(img,
        {'--sc-image-parallax-y':(-distance)+'px'},
        {
          '--sc-image-parallax-y':distance+'px',
          ease:'none',
          overwrite:'auto',
          scrollTrigger:{
            trigger:frame,
            start:'top bottom',
            end:'bottom top',
            scrub:0.75,
            invalidateOnRefresh:true
          }
        }
      );
      tweens.push(tween);
    });

    var refreshTimer=window.setTimeout(function(){ST.refresh();},80);

    return function(){
      window.clearTimeout(refreshTimer);
      tweens.forEach(function(tween){
        if(tween&&tween.scrollTrigger)tween.scrollTrigger.kill();
        if(tween)tween.kill();
      });
      images.forEach(function(img){
        img.style.removeProperty('--sc-image-parallax-y');
        img.style.removeProperty('transform');
        img.style.removeProperty('transform-origin');
        img.style.removeProperty('backface-visibility');
      });
    };
  });
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
