(function(){
'use strict';
if(window.__scSectionLinesMotionBooted)return;
window.__scSectionLinesMotionBooted=true;

var SPLIT_SRC='https://cdn.jsdelivr.net/npm/gsap@3/dist/SplitText.min.js';
var attempts=0;
var mediaContext=null;

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
  return Array.prototype.slice.call(document.querySelectorAll(
    '.listadoShop .titleShopSeccion > div, .listadoShop .subTitleShopSeccion'
  ));
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
  gsap.registerPlugin(ST,SplitText);

  mediaContext=gsap.matchMedia();
  mediaContext.add({
    motion:'(prefers-reduced-motion: no-preference)',
    reduceMotion:'(prefers-reduced-motion: reduce)'
  },function(ctx){
    var reduce=!!ctx.conditions.reduceMotion;
    var elements=targets();
    var splits=[];
    var ruleTweens=[];

    if(!elements.length)return function(){};

    if(reduce){
      gsap.set(elements,{'--sc-section-rule-scale':1});
      return function(){gsap.set(elements,{clearProps:'--sc-section-rule-scale'});};
    }

    elements.forEach(function(el){
      gsap.set(el,{'--sc-section-rule-scale':0});

      ruleTweens.push(gsap.to(el,{
        '--sc-section-rule-scale':1,
        duration:0.86,
        ease:'power3.out',
        overwrite:'auto',
        scrollTrigger:{
          trigger:el,
          start:'clamp(top 88%)',
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
            yPercent:112,
            autoAlpha:0,
            duration:0.72,
            ease:'power3.out',
            stagger:0.07,
            overwrite:'auto',
            scrollTrigger:{
              trigger:el,
              start:'clamp(top 88%)',
              once:true,
              invalidateOnRefresh:true
            }
          });
        }
      }));
    });

    return function(){
      ruleTweens.forEach(function(tween){if(tween&&tween.scrollTrigger)tween.scrollTrigger.kill();if(tween)tween.kill();});
      splits.forEach(function(split){if(split&&split.revert)split.revert();});
      gsap.set(elements,{clearProps:'--sc-section-rule-scale'});
    };
  });

  window.setTimeout(function(){ST.refresh();},80);
  if(document.fonts&&document.fonts.ready){
    document.fonts.ready.then(function(){ST.refresh();}).catch(function(){});
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
