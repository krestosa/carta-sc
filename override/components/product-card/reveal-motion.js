/* Reveal forward-only ligado al scroll. Cada tarjeta tiene su propio tramo de progreso:
   al bajar avanza con el viewport; al subir nunca revierte y queda definitivamente visible. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,M=C&&C.motion,CFG={initialDuration:.30,reflowDuration:.18,phaseTolerance:3};
if(!SC||!C||SC.__productCardRevealMotionBooted)return;SC.__productCardRevealMotionBooted=true;
var parts=SC.productCardMotionParts=SC.productCardMotionParts||{};

parts.setupReveal=function(gsap,ST,profile,reduce){
  var cards=gsap.utils.toArray(S.productCards),states=new WeakMap(),observer=null,mutationObserver=null,triggers=[];
  function noop(){}
  function state(card){var value=states.get(card);if(!value){value={prepared:false,done:false,started:false,max:0,tween:null,trigger:null};states.set(card,value);}return value;}
  function renderable(card){return!!(card&&!card.hidden&&card.offsetParent!==null&&card.getBoundingClientRect().height>0);}
  function programmatic(){var scroll=SC.scrollState;return!!(scroll&&(scroll.programmatic||performance.now()<(scroll.suppressRevealUntil||0)));}
  function clear(card){gsap.set(card,{clearProps:'top,opacity,visibility,willChange'});}
  function phase(card){
    var top=card.offsetTop,count=0,node=card.previousElementSibling;
    while(node){
      if(node.matches&&node.matches(S.productCard)){
        if(Math.abs(node.offsetTop-top)<=CFG.phaseTolerance)count++;else break;
      }
      node=node.previousElementSibling;
    }
    return Math.min(count,5);
  }
  function windowFor(card){var p=phase(card),step=Number(profile.phaseStep)||0,start=(Number(profile.startPct)||98)-p*step,end=(Number(profile.endPct)||82)-p*step;return{start:'top '+start+'%',end:'top '+end+'%'};}
  function killTrigger(value){if(value.trigger){value.trigger.kill();value.trigger=null;}}
  function finish(card){
    var value=state(card);if(value.done)return;value.done=true;value.started=true;value.max=1;killTrigger(value);if(observer)observer.unobserve(card);
    if(value.tween){value.tween.progress(1);value.tween.kill();value.tween=null;}
    gsap.set(card,{autoAlpha:1,top:0});clear(card);
  }
  function showNow(card){var value=state(card);if(value.tween){value.tween.kill();value.tween=null;}gsap.killTweensOf(card);value.prepared=true;finish(card);}
  function advance(card,progress,direction){
    var value=state(card);if(value.done||!value.tween)return;
    if(direction<0){if(value.started||progress>0)finish(card);return;}
    if(programmatic()){finish(card);return;}
    if(progress<=0&&!value.started)return;value.started=true;value.max=Math.max(value.max,progress);value.tween.progress(value.max);
    if(value.max>=.995)finish(card);
  }
  function autoplay(card){
    var value=state(card);if(value.done||!value.tween)return;value.started=true;var delay=phase(card)*.025;
    gsap.to(value.tween,{progress:1,duration:CFG.initialDuration,delay:delay,ease:(M.easings&&M.easings.out)||'power2.out',overwrite:true,onComplete:function(){finish(card);}});
  }
  function arm(card,initialPass){
    var value=state(card);if(value.done||value.prepared||!renderable(card))return;var rect=card.getBoundingClientRect();
    if(rect.bottom<=0){showNow(card);return;}
    value.prepared=true;gsap.set(card,{autoAlpha:0,top:rect.top<innerHeight?(Number(profile.initialY)||4):(Number(profile.revealY)||6),willChange:'top,opacity'});
    value.tween=gsap.to(card,{autoAlpha:1,top:0,duration:1,ease:(M.easings&&M.easings.out)||'power2.out',paused:true,overwrite:'auto'});
    if(reduce){finish(card);return;}
    if(initialPass&&rect.top<innerHeight&&rect.bottom>0){autoplay(card);return;}
    value.trigger=ST.create({trigger:card,start:function(){return windowFor(card).start;},end:function(){return windowFor(card).end;},invalidateOnRefresh:true,onUpdate:function(self){advance(card,self.progress,self.direction);},onEnter:function(self){if(self.direction>0)advance(card,self.progress||.001,1);},onLeave:function(self){if(self.direction>0)finish(card);},onLeaveBack:function(){var current=state(card);if(current.started)finish(card);}});
    triggers.push(value.trigger);if(observer)observer.observe(card);
  }
  function armNode(node){if(!node||node.hidden)return;if(node.matches&&node.matches(S.productList)){node.querySelectorAll(S.productCard).forEach(function(card){arm(card,false);});return;}if(node.matches&&node.matches(S.productCard))arm(node,false);}
  function revealViewport(){cards.forEach(function(card){var value=state(card);if(!value.prepared)arm(card,false);if(value.done||!renderable(card))return;var rect=card.getBoundingClientRect();if(rect.bottom<=0||programmatic())finish(card);});}

  if(!cards.length){parts.revealViewport=null;return noop;}parts.revealViewport=revealViewport;
  if(window.IntersectionObserver)observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(!entry.isIntersecting)return;var value=state(entry.target);if(value.done)return;if(programmatic())finish(entry.target);});},{root:null,rootMargin:'0px 0px 12% 0px',threshold:0});
  /* Preparación síncrona: el gate puede liberar el prepaint sin exponer cards sin estado GSAP. */
  cards.forEach(function(card){arm(card,true);});
  var container=document.querySelector(S.container);if(container&&window.MutationObserver){mutationObserver=new MutationObserver(function(mutations){mutations.forEach(function(mutation){if(mutation.type==='attributes'&&mutation.attributeName==='hidden'&&!mutation.target.hidden)armNode(mutation.target);});});mutationObserver.observe(container,{subtree:true,attributes:true,attributeFilter:['hidden']});}

  return function(){
    if(parts.revealViewport===revealViewport)parts.revealViewport=null;if(observer)observer.disconnect();if(mutationObserver)mutationObserver.disconnect();triggers.forEach(function(trigger){if(trigger&&trigger.kill)trigger.kill();});cards.forEach(function(card){var value=state(card);if(value.tween)value.tween.kill();gsap.killTweensOf(card);clear(card);});triggers=[];
  };
};
})();
