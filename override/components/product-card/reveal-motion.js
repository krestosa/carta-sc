/* Reveal in-view de tarjetas con aparición lineal y stagger breve por fila. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,OPEN=.5,ITEM=.25;
if(!SC||!C||SC.__productCardRevealMotionBooted)return;SC.__productCardRevealMotionBooted=true;
var parts=SC.productCardMotionParts=SC.productCardMotionParts||{};
parts.setupReveal=function(gsap,ST,profile,reduce){
  var cards=gsap.utils.toArray(S.productCards),states=new WeakMap(),observer=null,mutationObserver=null,fallbackTriggers=[],lastY=window.scrollY||window.pageYOffset||0,direction=1;
  function noop(){}
  function state(card){var value=states.get(card);if(!value){value={prepared:false,done:false,started:false,tween:null,observed:false};states.set(card,value);}return value;}
  function renderable(card){return!!(card&&!card.hidden&&card.offsetParent!==null&&card.getBoundingClientRect().height>0);}
  function programmatic(){var scroll=SC.scrollState;return!!(scroll&&(scroll.programmatic||performance.now()<(scroll.suppressRevealUntil||0)));}
  function clear(card){gsap.set(card,{clearProps:'opacity,visibility,willChange'});}
  function rowDelay(card){var parent=card.parentElement;if(!parent)return 0;var top=card.offsetTop,row=Array.prototype.filter.call(parent.children,function(node){return node.matches&&node.matches(S.productCard)&&Math.abs(node.offsetTop-top)<=3&&!node.hidden;});var index=row.indexOf(card),count=Math.max(1,row.length);return Math.max(0,index)*(OPEN-ITEM)/count;}
  function syncSkeleton(card){var preloader=SC.imagePreloader;if(preloader&&typeof preloader.scan==='function')preloader.scan(card);}
  function finish(card){var value=state(card);if(value.done)return;value.done=true;value.started=true;if(observer&&value.observed){observer.unobserve(card);value.observed=false;}if(value.tween){value.tween.progress(1);value.tween.kill();value.tween=null;}gsap.set(card,{autoAlpha:1});clear(card);}
  function reveal(card){var value=state(card);if(value.done||value.started)return;value.started=true;if(observer&&value.observed){observer.unobserve(card);value.observed=false;}syncSkeleton(card);if(reduce||programmatic()){finish(card);return;}value.tween=gsap.to(card,{autoAlpha:1,duration:ITEM,delay:rowDelay(card),ease:'none',overwrite:'auto',onComplete:function(){value.tween=null;finish(card);}});}
  function prepare(card){var value=state(card);if(value.prepared||value.done||!renderable(card))return false;var rect=card.getBoundingClientRect();value.prepared=true;if(rect.bottom<=0){finish(card);return false;}gsap.set(card,{autoAlpha:0,willChange:'opacity'});return true;}
  function arm(card){var value=state(card);if(!prepare(card)||value.done)return;if(reduce){finish(card);return;}if(observer){observer.observe(card);value.observed=true;return;}fallbackTriggers.push(ST.create({trigger:card,start:'top 100%',once:true,onEnter:function(self){if(self.direction>0)reveal(card);else finish(card);},onEnterBack:function(){finish(card);}}));}
  function armNode(node){if(!node||node.hidden)return;if(node.matches&&node.matches(S.productList)){node.querySelectorAll(S.productCard).forEach(arm);return;}if(node.matches&&node.matches(S.productCard))arm(node);}
  function revealViewport(){cards.forEach(function(card){var value=state(card);if(!value.prepared)arm(card);if(value.done||value.started||!renderable(card))return;if(card.getBoundingClientRect().bottom<=0)finish(card);});}
  function trackScroll(){var y=window.scrollY||window.pageYOffset||0;if(Math.abs(y-lastY)>.5)direction=y>lastY?1:-1;lastY=y;}
  if(!cards.length){parts.revealViewport=null;return noop;}parts.revealViewport=revealViewport;window.addEventListener('scroll',trackScroll,{passive:true});
  if(window.IntersectionObserver)observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(!entry.isIntersecting)return;var card=entry.target,value=state(card);if(value.done||value.started)return;if(direction<0||programmatic()){finish(card);return;}if(entry.intersectionRatio+1e-4<(Number(profile.threshold)||.05))return;reveal(card);});},{root:null,rootMargin:'0px',threshold:[0,Number(profile.threshold)||.05]});
  cards.forEach(arm);var container=document.querySelector(S.container);if(container&&window.MutationObserver){mutationObserver=new MutationObserver(function(mutations){mutations.forEach(function(mutation){if(mutation.type==='attributes'&&mutation.attributeName==='hidden'&&!mutation.target.hidden)armNode(mutation.target);});});mutationObserver.observe(container,{subtree:true,attributes:true,attributeFilter:['hidden']});}
  return function(){if(parts.revealViewport===revealViewport)parts.revealViewport=null;window.removeEventListener('scroll',trackScroll);if(observer)observer.disconnect();if(mutationObserver)mutationObserver.disconnect();fallbackTriggers.forEach(function(trigger){if(trigger&&trigger.kill)trigger.kill();});cards.forEach(function(card){var value=state(card);if(value.tween)value.tween.kill();gsap.killTweensOf(card);clear(card);});fallbackTriggers=[];};
};
})();