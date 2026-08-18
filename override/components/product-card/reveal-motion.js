/* Reveal in-view de cada tarjeta completa. IntersectionObserver es la fuente de verdad:
   una card sólo anima al entrar realmente al viewport bajando; al subir queda visible. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,CFG={baseDuration:.56,fastDuration:.20,velocityFloor:180,velocityCeil:2800,rowDelay:.045,rowDelayMax:.14};
if(!SC||!C||SC.__productCardRevealMotionBooted)return;SC.__productCardRevealMotionBooted=true;
var parts=SC.productCardMotionParts=SC.productCardMotionParts||{};

parts.setupReveal=function(gsap,ST,profile,reduce){
  var cards=gsap.utils.toArray(S.productCards),states=new WeakMap(),observer=null,mutationObserver=null,fallbackTriggers=[],lastY=window.scrollY||window.pageYOffset||0,lastT=performance.now(),velocity=0,direction=1,scrollRaf=0;
  function noop(){}
  function state(card){var value=states.get(card);if(!value){value={prepared:false,done:false,started:false,tween:null,observed:false};states.set(card,value);}return value;}
  function renderable(card){return!!(card&&!card.hidden&&card.offsetParent!==null&&card.getBoundingClientRect().height>0);}
  function programmatic(){var scroll=SC.scrollState;return!!(scroll&&(scroll.programmatic||performance.now()<(scroll.suppressRevealUntil||0)));}
  function clear(card){gsap.set(card,{clearProps:'top,opacity,visibility,willChange'});}
  function phase(card){var top=card.offsetTop,count=0,node=card.previousElementSibling;while(node){if(node.matches&&node.matches(S.productCard)){if(Math.abs(node.offsetTop-top)<=3)count++;else break;}node=node.previousElementSibling;}return Math.min(count,5);}
  function durationFor(speed){var factor=Math.max(0,Math.min(1,(Math.abs(speed)-CFG.velocityFloor)/(CFG.velocityCeil-CFG.velocityFloor)));return CFG.baseDuration+(CFG.fastDuration-CFG.baseDuration)*factor;}
  function delayFor(card,speed){var factor=Math.max(0,Math.min(1,(Math.abs(speed)-CFG.velocityFloor)/(CFG.velocityCeil-CFG.velocityFloor)));return Math.min(CFG.rowDelayMax,phase(card)*CFG.rowDelay)*(1-.8*factor);}
  function syncSkeleton(card){var preloader=SC.imagePreloader;if(preloader&&typeof preloader.scan==='function')preloader.scan(card);}
  function finish(card){var value=state(card);if(value.done)return;value.done=true;value.started=true;if(observer&&value.observed){observer.unobserve(card);value.observed=false;}if(value.tween){value.tween.progress(1);value.tween.kill();value.tween=null;}gsap.set(card,{opacity:1,visibility:'visible',top:0});clear(card);}
  function reveal(card,speed){
    var value=state(card);if(value.done||value.started)return;value.started=true;if(observer&&value.observed){observer.unobserve(card);value.observed=false;}syncSkeleton(card);
    if(reduce||programmatic()){finish(card);return;}
    var duration=durationFor(speed),delay=delayFor(card,speed);
    value.tween=gsap.timeline({delay:delay,onComplete:function(){value.tween=null;finish(card);}})
      .to(card,{opacity:1,duration:duration*.92,ease:'power1.out',overwrite:'auto'},0)
      .to(card,{top:0,duration:duration,ease:'power3.out',overwrite:'auto'},0);
  }
  function prepare(card){var value=state(card);if(value.prepared||value.done||!renderable(card))return false;var rect=card.getBoundingClientRect();value.prepared=true;if(rect.bottom<=0){finish(card);return false;}gsap.set(card,{opacity:0,visibility:'visible',top:rect.top<innerHeight?(Number(profile.initialY)||14):(Number(profile.revealY)||18),willChange:'top,opacity'});return true;}
  function arm(card){var value=state(card);if(!prepare(card)||value.done)return;if(reduce){finish(card);return;}if(observer){observer.observe(card);value.observed=true;return;}var trigger=ST.create({trigger:card,start:'top 100%',once:true,onEnter:function(self){if(self.direction>0)reveal(card,self.getVelocity?self.getVelocity():velocity);else finish(card);},onEnterBack:function(){finish(card);}});fallbackTriggers.push(trigger);}
  function armNode(node){if(!node||node.hidden)return;if(node.matches&&node.matches(S.productList)){node.querySelectorAll(S.productCard).forEach(arm);return;}if(node.matches&&node.matches(S.productCard))arm(node);}
  function revealViewport(){cards.forEach(function(card){var value=state(card);if(!value.prepared)arm(card);if(value.done||value.started||!renderable(card))return;var rect=card.getBoundingClientRect();if(rect.bottom<=0)finish(card);});}
  function trackScroll(){var now=performance.now(),y=window.scrollY||window.pageYOffset||0,dt=Math.max(16,now-lastT),dy=y-lastY;if(Math.abs(dy)>.5)direction=dy>0?1:-1;velocity=Math.abs(dy)*1000/dt;lastY=y;lastT=now;if(scrollRaf)cancelAnimationFrame(scrollRaf);scrollRaf=requestAnimationFrame(function(){scrollRaf=0;cards.forEach(function(card){var value=state(card);if(value.done||value.started||!value.prepared)return;var rect=card.getBoundingClientRect();if(rect.bottom<=0)finish(card);});});}

  if(!cards.length){parts.revealViewport=null;return noop;}parts.revealViewport=revealViewport;
  window.addEventListener('scroll',trackScroll,{passive:true});
  if(window.IntersectionObserver){observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(!entry.isIntersecting)return;var card=entry.target,value=state(card);if(value.done||value.started)return;if(direction<0){finish(card);return;}if(programmatic()){finish(card);return;}if(entry.intersectionRatio+1e-4<(Number(profile.threshold)||.05))return;reveal(card,velocity);});},{root:null,rootMargin:'0px',threshold:[0,Number(profile.threshold)||.05]});}
  cards.forEach(arm);
  var container=document.querySelector(S.container);if(container&&window.MutationObserver){mutationObserver=new MutationObserver(function(mutations){mutations.forEach(function(mutation){if(mutation.type==='attributes'&&mutation.attributeName==='hidden'&&!mutation.target.hidden)armNode(mutation.target);});});mutationObserver.observe(container,{subtree:true,attributes:true,attributeFilter:['hidden']});}

  return function(){if(parts.revealViewport===revealViewport)parts.revealViewport=null;window.removeEventListener('scroll',trackScroll);if(scrollRaf)cancelAnimationFrame(scrollRaf);if(observer)observer.disconnect();if(mutationObserver)mutationObserver.disconnect();fallbackTriggers.forEach(function(trigger){if(trigger&&trigger.kill)trigger.kill();});cards.forEach(function(card){var value=state(card);if(value.tween)value.tween.kill();gsap.killTweensOf(card);clear(card);});fallbackTriggers=[];};
};
})();
