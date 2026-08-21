/* Reveal in-view de cada tarjeta completa. IntersectionObserver es la fuente de verdad:
   una card sólo anima al entrar realmente al viewport bajando; al subir queda visible. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,CFG={baseDuration:.56,fastDuration:.20,velocityFloor:180,velocityCeil:2800,rowDelay:.045,rowDelayMax:.14};
if(!SC||!C||SC.__productCardRevealMotionBooted)return;
SC.__productCardRevealMotionBooted=true;
var parts=SC.productCardMotionParts=SC.productCardMotionParts||{};
interface RevealProfile { initialY?:number; revealY?:number; threshold?:number; }
interface RevealState { prepared:boolean; done:boolean; started:boolean; handles:MotionHandle[]; observed:boolean; }

parts.setupReveal=function(engine:MotionEngine,profile:RevealProfile,reduce:boolean):()=>void{
  var cards=Array.from(document.querySelectorAll<HTMLElement>(S.productCards)),states=new WeakMap<HTMLElement,RevealState>();
  var observer:IntersectionObserver|null=null,mutationObserver:MutationObserver|null=null;
  var lastY=window.scrollY||window.pageYOffset||0,lastT=performance.now(),velocity=0,direction=1,scrollRaf=0;
  function noop():void{}
  function state(card:HTMLElement):RevealState{var value=states.get(card);if(!value){value={prepared:false,done:false,started:false,handles:[],observed:false};states.set(card,value);}return value;}
  function renderable(card:HTMLElement):boolean{return!card.hidden&&card.offsetParent!==null&&card.getBoundingClientRect().height>0;}
  function programmatic():boolean{var scroll=SC.scrollState;return!!(scroll&&(scroll.programmatic||performance.now()<(scroll.suppressRevealUntil||0)));}
  function stop(card:HTMLElement):void{var value=state(card);value.handles.forEach(function(handle){handle.cancel();});value.handles=[];}
  function clear(card:HTMLElement):void{card.style.removeProperty('top');card.style.removeProperty('opacity');card.style.removeProperty('visibility');card.style.removeProperty('will-change');}
  function phase(card:HTMLElement):number{var top=card.offsetTop,count=0,node=card.previousElementSibling;while(node){if(node.matches(S.productCard)){var sibling=node as HTMLElement;if(Math.abs(sibling.offsetTop-top)<=3)count++;else break;}node=node.previousElementSibling;}return Math.min(count,5);}
  function durationFor(speed:number):number{var factor=Math.max(0,Math.min(1,(Math.abs(speed)-CFG.velocityFloor)/(CFG.velocityCeil-CFG.velocityFloor)));return CFG.baseDuration+(CFG.fastDuration-CFG.baseDuration)*factor;}
  function delayFor(card:HTMLElement,speed:number):number{var factor=Math.max(0,Math.min(1,(Math.abs(speed)-CFG.velocityFloor)/(CFG.velocityCeil-CFG.velocityFloor)));return Math.min(CFG.rowDelayMax,phase(card)*CFG.rowDelay)*(1-.8*factor);}
  function syncSkeleton(card:HTMLElement):void{var preloader=SC.imagePreloader;if(preloader&&typeof preloader.scan==='function')preloader.scan(card);}
  function finish(card:HTMLElement):void{var value=state(card);if(value.done)return;value.done=true;value.started=true;if(observer&&value.observed){observer.unobserve(card);value.observed=false;}stop(card);card.style.opacity='1';card.style.visibility='visible';card.style.top='0px';clear(card);}
  function reveal(card:HTMLElement,speed:number):void{
    var value=state(card);if(value.done||value.started)return;value.started=true;if(observer&&value.observed){observer.unobserve(card);value.observed=false;}syncSkeleton(card);if(reduce||programmatic()){finish(card);return;}
    var duration=durationFor(speed),delay=delayFor(card,speed),startTop=parseFloat(card.style.top)||0;stop(card);
    var opacityHandle=engine.tween(duration*.92,'quad.out',function(p){card.style.opacity=String(p);},{delay:delay});
    var topHandle=engine.tween(duration,'quart.out',function(p){card.style.top=(startTop*(1-p))+'px';},{delay:delay,onComplete:function(){value.handles=[];finish(card);}});value.handles=[opacityHandle,topHandle];
  }
  function prepare(card:HTMLElement):boolean{var value=state(card);if(value.prepared||value.done||!renderable(card))return false;var rect=card.getBoundingClientRect();value.prepared=true;if(rect.bottom<=0){finish(card);return false;}card.style.opacity='0';card.style.visibility='visible';card.style.top=(rect.top<innerHeight?(Number(profile.initialY)||14):(Number(profile.revealY)||18))+'px';card.style.willChange='top,opacity';return true;}
  function arm(card:HTMLElement):void{var value=state(card);if(!prepare(card)||value.done)return;if(reduce){finish(card);return;}if(observer){observer.observe(card);value.observed=true;}}
  function armNode(node:Node):void{if(node.nodeType!==1)return;var element=node as HTMLElement;if(element.hidden)return;if(element.matches(S.productList)){element.querySelectorAll<HTMLElement>(S.productCard).forEach(arm);return;}if(element.matches(S.productCard))arm(element);}
  function revealViewport():void{cards.forEach(function(card){var value=state(card);if(!value.prepared)arm(card);if(value.done||value.started||!renderable(card))return;var rect=card.getBoundingClientRect();if(rect.bottom<=0)finish(card);else if(!observer&&rect.top<innerHeight){if(direction<0||programmatic())finish(card);else reveal(card,velocity);}});}
  function trackScroll():void{var now=performance.now(),y=window.scrollY||window.pageYOffset||0,dt=Math.max(16,now-lastT),dy=y-lastY;if(Math.abs(dy)>.5)direction=dy>0?1:-1;velocity=Math.abs(dy)*1000/dt;lastY=y;lastT=now;if(scrollRaf)cancelAnimationFrame(scrollRaf);scrollRaf=requestAnimationFrame(function(){scrollRaf=0;cards.forEach(function(card){var value=state(card);if(value.done||value.started||!value.prepared)return;var rect=card.getBoundingClientRect();if(rect.bottom<=0)finish(card);else if(!observer&&rect.top<innerHeight){if(direction<0||programmatic())finish(card);else reveal(card,velocity);}});});}
  if(!cards.length){parts.revealViewport=null;return noop;}parts.revealViewport=revealViewport;window.addEventListener('scroll',trackScroll,{passive:true});
  if(window.IntersectionObserver){observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(!entry.isIntersecting)return;var card=entry.target as HTMLElement,value=state(card);if(value.done||value.started)return;if(direction<0||programmatic()){finish(card);return;}if(entry.intersectionRatio+1e-4<(Number(profile.threshold)||.05))return;reveal(card,velocity);});},{root:null,rootMargin:'0px',threshold:[0,Number(profile.threshold)||.05]});}
  cards.forEach(arm);var container=document.querySelector<HTMLElement>(S.container);if(container&&window.MutationObserver){mutationObserver=new MutationObserver(function(mutations){mutations.forEach(function(mutation){if(mutation.type==='attributes'&&mutation.attributeName==='hidden'){var target=mutation.target as HTMLElement;if(!target.hidden)armNode(target);}});});mutationObserver.observe(container,{subtree:true,attributes:true,attributeFilter:['hidden']});}
  return function(){if(parts.revealViewport===revealViewport)parts.revealViewport=null;window.removeEventListener('scroll',trackScroll);if(scrollRaf)cancelAnimationFrame(scrollRaf);if(observer)observer.disconnect();if(mutationObserver)mutationObserver.disconnect();cards.forEach(function(card){stop(card);clear(card);});};
};
})();
