(function(){
'use strict';
if(window.__scSectionLinesMotionBooted)return;
window.__scSectionLinesMotionBooted=true;

var SPLIT_SRC='https://cdn.jsdelivr.net/npm/gsap@3/dist/SplitText.min.js';
var attempts=0;

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

function isInitiallyVisible(el){
  var r=el.getBoundingClientRect();
  return r.bottom>0&&r.top<window.innerHeight*0.94;
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

  var gsap=window.gsap;
  var ST=window.ScrollTrigger;
  var SplitText=window.SplitText;
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var elements=targets();
  var splits=[];
  var tweens=[];

  if(!elements.length)return;

  elements.forEach(function(el){
    el.classList.add('sc-section-rule-host');

    if(reduce){
      gsap.set(el,{'--sc-section-rule-scale':1});
      return;
    }

    var initial=isInitiallyVisible(el);
    gsap.set(el,{'--sc-section-rule-scale':0});

    var ruleConfig={
      '--sc-section-rule-scale':1,
      duration:0.95,
      ease:'power3.out',
      overwrite:'auto'
    };
    if(!initial){
      ruleConfig.scrollTrigger={
        trigger:el,
        start:'clamp(top 90%)',
        once:true
      };
    }
    tweens.push(gsap.to(el,ruleConfig));

    splits.push(SplitText.create(el,{
      type:'lines',
      mask:'lines',
      linesClass:'sc-section-text-line',
      autoSplit:true,
      onSplit:function(self){
        var config={
          yPercent:108,
          autoAlpha:0,
          duration:0.68,
          ease:'power3.out',
          stagger:0.055,
          overwrite:'auto'
        };
        if(!isInitiallyVisible(el)){
          config.scrollTrigger={
            trigger:el,
            start:'clamp(top 90%)',
            once:true,
            invalidateOnRefresh:true
          };
        }
        return gsap.from(self.lines,config);
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

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
