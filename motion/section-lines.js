(function(){
'use strict';
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
  document.head.appendChild(script);
}

function targets(){
  return Array.prototype.filter.call(document.querySelectorAll(
    '.listadoShop .titleShopSeccion > div, .listadoShop .subTitleShopSeccion'
  ),function(el){return (el.textContent||'').replace(/\s+/g,' ').trim().length>0;});
}

function isInInitialViewport(el){
  var r=el.getBoundingClientRect();
  return r.top<window.innerHeight&&r.bottom>0;
}

function markInitialViewportCards(){
  Array.prototype.forEach.call(document.querySelectorAll('.listadoShop .productoShop'),function(card){
    var r=card.getBoundingClientRect();
    if(r.top<window.innerHeight&&r.bottom>0)card.classList.add('sc-static-initial-card');
  });
}

function afterSkeleton(done){
  var root=document.documentElement;
  var finished=false;
  var observer=null;
  var timer=0;

  function run(){
    if(finished)return;
    finished=true;
    if(observer)observer.disconnect();
    if(timer)clearTimeout(timer);
    requestAnimationFrame(function(){requestAnimationFrame(done);});
  }

  if(!root.classList.contains('sc-catalog-content-loading')){
    run();
    return;
  }

  observer=new MutationObserver(function(){
    if(!root.classList.contains('sc-catalog-content-loading'))run();
  });
  observer.observe(root,{attributes:true,attributeFilter:['class']});
  timer=setTimeout(run,1900);
}

function initMotion(){
  if(initialized)return;
  initialized=true;

  var gsap=window.gsap;
  var ST=window.ScrollTrigger;
  var SplitText=window.SplitText;
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var elements=targets();
  var splits=[];
  var tweens=[];

  /* Classification happens only after the skeleton has released and layout has
     settled for two frames, so everything initially visible remains static. */
  markInitialViewportCards();

  if(!elements.length)return;

  elements.forEach(function(el){
    el.classList.add('sc-section-rule-host');

    /* Anything already visible when the skeleton is gone stays completely
       static. Only content that starts below the viewport gets reveal motion. */
    if(reduce||isInInitialViewport(el)){
      gsap.set(el,{'--sc-section-rule-scale':1});
      return;
    }

    gsap.set(el,{'--sc-section-rule-scale':0});

    tweens.push(gsap.to(el,{
      '--sc-section-rule-scale':1,
      duration:0.95,
      ease:'power3.out',
      overwrite:'auto',
      scrollTrigger:{
        trigger:el,
        start:'clamp(top 90%)',
        once:true
      }
    }));

    splits.push(SplitText.create(el,{
      type:'lines',
      mask:'lines',
      linesClass:'sc-section-text-line',
      autoSplit:true,
      onSplit:function(self){
        return gsap.from(self.lines,{
          yPercent:108,
          autoAlpha:0,
          duration:0.68,
          ease:'power3.out',
          stagger:0.055,
          overwrite:'auto',
          scrollTrigger:{
            trigger:el,
            start:'clamp(top 90%)',
            once:true,
            invalidateOnRefresh:true
          }
        });
      }
    }));
  });

  function refresh(){window.setTimeout(function(){ST.refresh();},60);}
  refresh();
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(refresh).catch(function(){});

  window.__scSectionLinesCleanup=function(){
    tweens.forEach(function(tween){if(tween&&tween.scrollTrigger)tween.scrollTrigger.kill();if(tween)tween.kill();});
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

  afterSkeleton(initMotion);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();