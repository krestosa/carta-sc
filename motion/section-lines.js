(function(){
'use strict';
/* Deploy marker: below-fold-motion-v11. */
if(window.__scSectionLinesMotionBooted)return;
window.__scSectionLinesMotionBooted=true;

var SPLIT_SRC='https://cdn.jsdelivr.net/npm/gsap@3/dist/SplitText.min.js';
var attempts=0;
var initialized=false;

function loadScript(src,id,done){
  var old=document.getElementById(id);
  if(old){
    if(old.dataset.loaded==='true'||window.SplitText)return done();
    old.addEventListener('load',done,{once:true});
    return;
  }
  var script=document.createElement('script');
  script.id=id;
  script.src=src;
  script.async=true;
  script.onload=function(){script.dataset.loaded='true';done();};
  script.onerror=function(){done();};
  document.head.appendChild(script);
}

function targets(){
  return Array.prototype.filter.call(document.querySelectorAll(
    '.listadoShop .titleShopSeccion > div, .listadoShop .subTitleShopSeccion'
  ),function(el){return (el.textContent||'').replace(/\s+/g,' ').trim().length>0;});
}

function isInitial(el){
  if(el.classList.contains('sc-static-initial-section'))return true;
  var parent=el.closest('.titleShopSeccion, .subTitleShopSeccion');
  if(parent&&parent.classList.contains('sc-static-initial-section'))return true;
  var r=el.getBoundingClientRect();
  return r.top<window.innerHeight&&r.bottom>0;
}

function initMotion(){
  if(initialized||!window.gsap||!window.ScrollTrigger||!window.SplitText)return;
  initialized=true;

  var gsap=window.gsap;
  var ST=window.ScrollTrigger;
  var SplitText=window.SplitText;
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var elements=targets();
  var splits=[];
  var tweens=[];

  elements.forEach(function(el){
    el.classList.add('sc-section-rule-host');

    if(reduce||isInitial(el)){
      gsap.set(el,{'--sc-section-rule-scale':1});
      return;
    }

    gsap.set(el,{'--sc-section-rule-scale':0});

    var ruleTween=gsap.to(el,{
      '--sc-section-rule-scale':1,
      duration:0.72,
      ease:'power3.out',
      overwrite:'auto',
      scrollTrigger:{
        trigger:el,
        start:'clamp(top 90%)',
        once:true
      }
    });
    tweens.push(ruleTween);

    var split=SplitText.create(el,{
      type:'lines',
      mask:'lines',
      linesClass:'sc-section-text-line',
      autoSplit:true,
      onSplit:function(self){
        return gsap.from(self.lines,{
          yPercent:105,
          autoAlpha:0,
          duration:0.52,
          ease:'power3.out',
          stagger:0.045,
          overwrite:'auto',
          scrollTrigger:{
            trigger:el,
            start:'clamp(top 90%)',
            once:true,
            invalidateOnRefresh:true
          }
        });
      }
    });
    splits.push(split);
  });

  function refresh(){window.setTimeout(function(){ST.refresh();},60);}
  refresh();
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(refresh).catch(function(){});

  window.__scSectionLinesCleanup=function(){
    tweens.forEach(function(tween){
      if(tween&&tween.scrollTrigger)tween.scrollTrigger.kill();
      if(tween)tween.kill();
    });
    splits.forEach(function(split){if(split&&split.revert)split.revert();});
    elements.forEach(function(el){
      el.classList.remove('sc-section-rule-host');
      gsap.set(el,{clearProps:'--sc-section-rule-scale'});
    });
  };
}

function boot(){
  if(!window.gsap||!window.ScrollTrigger){
    if(attempts++<120)window.setTimeout(boot,50);
    return;
  }
  if(!window.SplitText){
    loadScript(SPLIT_SRC,'sc-gsap-splittext',boot);
    return;
  }
  requestAnimationFrame(function(){requestAnimationFrame(initMotion);});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
