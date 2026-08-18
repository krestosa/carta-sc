/* Reveal one-shot de cada tarjeta completa. Cada card tiene su propio punto de entrada:
   al bajar anima una sola vez; al subir se deja visible y nunca se reproduce en reversa. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,M=C&&C.motion,CFG={baseDuration:.42,fastDuration:.14,initialDuration:.36,phaseTolerance:3,velocityFloor:180,velocityCeil:2800,initialStep:.038,initialMaxDelay:.19};
if(!SC||!C||SC.__productCardRevealMotionBooted)return;SC.__productCardRevealMotionBooted=true;
var parts=SC.productCardMotionParts=SC.productCardMotionParts||{};

parts.setupReveal=function(gsap,ST,profile,reduce){
  var cards=gsap.utils.toArray(S.productCards),states=new WeakMap(),mutationObserver=null,triggers=[],initialTweens=[],destroyed=false;
  function noop(){}
  function state(card){var value=states.get(card);if(!value){value={prepared:false,done:false,started:false,trigger:null,tween:null};states.set(card,value);}return value;}
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
  function startPoint(card){return Math.max(84,(Number(profile.startPct)||97)-phase(card)*(Number(profile.phaseStep)||2));}
  function durationFor(velocity){
    var speed=Math.abs(Number(velocity)||0),factor=Math.max(0,Math.min(1,(speed-CFG.velocityFloor)/(CFG.velocityCeil-CFG.velocityFloor)));
    return CFG.baseDuration+(CFG.fastDuration-CFG.baseDuration)*factor;
  }
  function killTrigger(value){if(value.trigger){value.trigger.kill();value.trigger=null;}}
  function finish(card){
    var value=state(card);if(value.done)return;value.done=true;value.started=true;killTrigger(value);
    if(value.tween){value.tween.progress(1);value.tween.kill();value.tween=null;}
    gsap.set(card,{autoAlpha:1,top:0});clear(card);
  }
  function reveal(card,velocity,delay,durationOverride){
    var value=state(card);if(value.done||value.started)return;value.started=true;killTrigger(value);
    if(reduce||programmatic()){finish(card);return;}
    var duration=durationOverride||durationFor(velocity);value.tween=gsap.to(card,{autoAlpha:1,top:0,duration:duration,delay:Math.max(0,delay||0),ease:(M.easings&&M.easings.strongOut)||'power3.out',overwrite:'auto',onComplete:function(){value.tween=null;finish(card);}});
  }
  function prepare(card){
    var value=state(card);if(value.prepared||value.done||!renderable(card))return false;var rect=card.getBoundingClientRect();
    if(rect.bottom<=0){value.prepared=true;finish(card);return false;}
    value.prepared=true;gsap.set(card,{autoAlpha:0,top:rect.top<innerHeight?(Number(profile.initialY)||4):(Number(profile.revealY)||7),willChange:'top,opacity'});return true;
  }
  function arm(card,initialIndex){
    var value=state(card);if(!prepare(card)||value.done)return;var rect=card.getBoundingClientRect();
    if(reduce){finish(card);return;}
    if(rect.top<innerHeight&&rect.bottom>0){
      var delay=Math.min(CFG.initialMaxDelay,Math.max(0,initialIndex||0)*CFG.initialStep);reveal(card,0,delay,CFG.initialDuration);return;
    }
    value.trigger=ST.create({
      trigger:card,
      start:function(){return'top '+startPoint(card)+'%';},
      invalidateOnRefresh:true,
      onEnter:function(self){if(self.direction>0)reveal(card,self.getVelocity?self.getVelocity():0,0);},
      onUpdate:function(self){if(self.direction>0&&self.progress>0&&!state(card).started)reveal(card,self.getVelocity?self.getVelocity():0,0);},
      onEnterBack:function(){finish(card);},
      onLeaveBack:function(){finish(card);}
    });
    triggers.push(value.trigger);
  }
  function armNode(node){
    if(!node||node.hidden)return;
    if(node.matches&&node.matches(S.productList)){node.querySelectorAll(S.productCard).forEach(function(card){arm(card,0);});return;}
    if(node.matches&&node.matches(S.productCard))arm(node,0);
  }
  function revealViewport(){
    cards.forEach(function(card){var value=state(card);if(!value.prepared)arm(card,0);if(value.done||value.started||!renderable(card))return;var rect=card.getBoundingClientRect();if(rect.bottom<=0){finish(card);return;}if(rect.top<innerHeight*.985&&rect.bottom>0)reveal(card,0,0);});
  }

  if(!cards.length){parts.revealViewport=null;return noop;}parts.revealViewport=revealViewport;
  var initialIndex=0;cards.forEach(function(card){var rect=card.getBoundingClientRect(),visible=renderable(card)&&rect.top<innerHeight&&rect.bottom>0;arm(card,visible?initialIndex++:0);});
  var container=document.querySelector(S.container);if(container&&window.MutationObserver){mutationObserver=new MutationObserver(function(mutations){mutations.forEach(function(mutation){if(mutation.type==='attributes'&&mutation.attributeName==='hidden'&&!mutation.target.hidden)armNode(mutation.target);});});mutationObserver.observe(container,{subtree:true,attributes:true,attributeFilter:['hidden']});}

  return function(){
    destroyed=true;if(parts.revealViewport===revealViewport)parts.revealViewport=null;if(mutationObserver)mutationObserver.disconnect();
    triggers.forEach(function(trigger){if(trigger&&trigger.kill)trigger.kill();});initialTweens.forEach(function(tween){if(tween&&tween.kill)tween.kill();});
    cards.forEach(function(card){var value=state(card);if(value.tween)value.tween.kill();gsap.killTweensOf(card);clear(card);});triggers=[];initialTweens=[];
  };
};
})();
