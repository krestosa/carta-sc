/* Reveal individual de la tarjeta completa. Cada card confirma posición documental estable
   antes de entrar a la secuencia; skeleton e imagen no participan de la decisión. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,M=C&&C.motion,CFG={duration:.32,reflowDuration:.22,stableDelta:1.5,stableFrames:1,maxChecks:5,rescueDelay:650};if(!SC||!C||SC.__productCardRevealMotionBooted)return;SC.__productCardRevealMotionBooted=true;

/* Secuencia DOM con handoff solapado. La velocidad de scroll acorta duración y adelanta
   el handoff de forma continua, sin convertir las cards en un batch. */
function ensureQueue(){
  if(SC.catalogRevealQueue)return SC.catalogRevealQueue;
  var waiting=[],states=new WeakMap(),gateOpen=true,pumpScheduled=false,lastY=window.scrollY||window.pageYOffset||0,lastT=performance.now(),velocity=0;
  function state(node){var value=states.get(node);if(!value){value={queued:false,running:false,done:false,timer:0,release:null};states.set(node,value);}return value;}
  function before(a,b){if(a===b)return 0;var relation=a.compareDocumentPosition(b);return relation&(window.Node?Node.DOCUMENT_POSITION_FOLLOWING:4)?-1:1;}
  function sort(){waiting.sort(function(a,b){return before(a.node,b.node);});}
  function track(){var now=performance.now(),y=window.scrollY||window.pageYOffset||0,dt=Math.max(16,now-lastT),instant=Math.abs(y-lastY)*1000/dt;velocity=velocity*.55+instant*.45;lastY=y;lastT=now;}
  window.addEventListener('scroll',track,{passive:true});
  function motion(base){var age=Math.max(0,performance.now()-lastT),speed=velocity*Math.exp(-age/220),factor=Math.max(0,Math.min(1,(speed-180)/2200)),duration=Math.max(base*.46,base*(1-.54*factor));return{speed:speed,factor:factor,duration:duration,handoffRatio:.68-.38*factor,aheadPx:Math.round(innerHeight*.30*factor)};}
  function schedulePump(){if(pumpScheduled)return;pumpScheduled=true;Promise.resolve().then(function(){pumpScheduled=false;pump();});}
  function pump(){
    if(!gateOpen||!waiting.length)return;sort();var item=waiting.shift(),value=state(item.node);value.queued=false;if(value.done){schedulePump();return;}gateOpen=false;value.running=true;var timing=motion(item.duration||.3),settled=false,released=false;
    function release(){if(released)return;released=true;if(value.timer){clearTimeout(value.timer);value.timer=0;}value.release=null;gateOpen=true;schedulePump();}
    function done(){if(settled)return;settled=true;value.running=false;value.done=true;release();}
    value.release=release;value.timer=setTimeout(release,Math.max(36,timing.duration*timing.handoffRatio*1000));
    try{item.run(done,timing);}catch(error){if(window.console&&console.error)console.error('[SushiClub catalog reveal]',error);done();}
  }
  function enqueue(node,options,run){if(typeof options==='function'){run=options;options={};}if(!node||typeof run!=='function')return;var value=state(node);if(value.done||value.queued||value.running)return;value.queued=true;waiting.push({node:node,run:run,duration:options&&Number(options.duration)||.3});schedulePump();}
  function complete(node){if(!node)return;var value=state(node);value.done=true;value.queued=false;value.running=false;waiting=waiting.filter(function(item){return item.node!==node;});if(value.release)value.release();else schedulePump();}
  function cancel(node){if(!node)return;var value=state(node);value.queued=false;value.running=false;waiting=waiting.filter(function(item){return item.node!==node;});if(value.timer){clearTimeout(value.timer);value.timer=0;}if(value.release)value.release();else schedulePump();}
  function isDone(node){return!!(node&&state(node).done);}
  return SC.catalogRevealQueue={enqueue:enqueue,complete:complete,cancel:cancel,isDone:isDone,pump:schedulePump,motion:motion};
}
ensureQueue();

var parts=SC.productCardMotionParts=SC.productCardMotionParts||{};
parts.setupReveal=function(gsap,ST,profile,reduce){
  var cards=gsap.utils.toArray(S.productCards),observer=null,mutationObserver=null,pending=new Set(),states=new WeakMap(),triggers=[],timer=0,generation=1,ratio=Math.max(.5,Math.min(1,Number(profile&&profile.triggerRatio)||.92));
  function noop(){}
  function queue(){return ensureQueue();}
  function state(card){var value=states.get(card);if(!value){value={prepared:false,checking:false,trigger:null};states.set(card,value);}return value;}
  function renderable(card){return!!(card&&!card.hidden&&card.offsetParent!==null&&card.getBoundingClientRect().height>0);}
  function nearViewport(card){var rect=card.getBoundingClientRect(),q=queue(),timing=q.motion?q.motion(CFG.duration):{aheadPx:0};return rect.bottom>=-timing.aheadPx&&rect.top<=innerHeight*ratio+timing.aheadPx;}
  function documentY(card){return card.getBoundingClientRect().top+(window.scrollY||window.pageYOffset||0);}
  function clear(card){gsap.set(card,{clearProps:'top,opacity,visibility,willChange'});}
  function showCard(card){var q=queue();gsap.killTweensOf(card);gsap.set(card,{autoAlpha:1,top:0});clear(card);if(q&&q.complete)q.complete(card);}
  function animateCard(card,done,timing){gsap.killTweensOf(card);gsap.to(card,{autoAlpha:1,top:0,duration:timing&&timing.duration||CFG.duration,ease:(M.easings&&M.easings.out)||'power2.out',overwrite:'auto',onComplete:function(){clear(card);done();}});}
  function consume(card,duration){
    var q=queue(),value=state(card);if(!q||!q.enqueue||!pending.has(card)||q.isDone(card))return;pending.delete(card);value.checking=false;if(observer)observer.unobserve(card);if(value.trigger){value.trigger.kill();value.trigger=null;}
    if(SC.sectionHeading&&typeof SC.sectionHeading.requestBefore==='function')SC.sectionHeading.requestBefore(card);
    q.enqueue(card,{duration:duration||CFG.duration},function(done,timing){animateCard(card,done,timing);});
  }
  /* rect.top cambia al scrollear; rect.top + scrollY sólo cambia cuando el layout se mueve. */
  function confirm(card,duration){
    var value=state(card),token=generation;if(!pending.has(card)||value.checking)return;value.checking=true;var checks=0,stable=0,lastY=null;
    function sample(){requestAnimationFrame(function(){if(token!==generation||!pending.has(card)){value.checking=false;return;}if(!renderable(card)){value.checking=false;return;}if(!nearViewport(card)){value.checking=false;return;}var y=documentY(card);if(lastY!==null&&Math.abs(y-lastY)<=CFG.stableDelta)stable++;else stable=0;lastY=y;checks++;if(stable>=CFG.stableFrames){consume(card,duration);return;}if(checks<CFG.maxChecks){sample();return;}value.checking=false;});}
    sample();
  }
  function arm(card){
    var q=queue(),value=state(card);if(!q||q.isDone(card)||value.prepared||!renderable(card))return;var rect=card.getBoundingClientRect();if(rect.bottom<0){showCard(card);return;}value.prepared=true;pending.add(card);gsap.set(card,{autoAlpha:0,top:rect.top<=innerHeight?profile.initialY:profile.revealY,willChange:'top,opacity'});
    value.trigger=ST.create({trigger:card,start:profile.start,invalidateOnRefresh:true,onEnter:function(){confirm(card,CFG.duration);},onEnterBack:function(){confirm(card,CFG.duration);}});triggers.push(value.trigger);if(observer)observer.observe(card);if(nearViewport(card))confirm(card,CFG.duration);
  }
  function armNode(node){if(!node||node.hidden)return;if(node.matches&&node.matches(S.productList)){node.querySelectorAll(S.productCard).forEach(arm);return;}if(node.matches&&node.matches(S.productCard))arm(node);}
  function revealViewport(){cards.forEach(function(card){if(!state(card).prepared)arm(card);if(pending.has(card)&&nearViewport(card))confirm(card,CFG.reflowDuration);});}
  if(!cards.length){parts.revealViewport=null;return noop;}parts.revealViewport=revealViewport;
  if(reduce){cards.forEach(showCard);return function(){if(parts.revealViewport===revealViewport)parts.revealViewport=null;};}
  if(window.IntersectionObserver){observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting)confirm(entry.target,CFG.duration);});},{root:null,rootMargin:'0px 0px 35% 0px',threshold:0});}
  cards.forEach(arm);
  var container=document.querySelector(S.container);if(container&&window.MutationObserver){mutationObserver=new MutationObserver(function(mutations){mutations.forEach(function(mutation){if(mutation.type==='attributes'&&mutation.attributeName==='hidden'&&!mutation.target.hidden)armNode(mutation.target);});});mutationObserver.observe(container,{subtree:true,attributes:true,attributeFilter:['hidden']});}
  timer=setTimeout(revealViewport,CFG.rescueDelay);
  return function(){
    generation++;if(parts.revealViewport===revealViewport)parts.revealViewport=null;if(timer)clearTimeout(timer);if(observer)observer.disconnect();if(mutationObserver)mutationObserver.disconnect();var q=queue();cards.forEach(function(card){var value=state(card);value.checking=false;if(q&&q.isDone&&!q.isDone(card)&&q.cancel)q.cancel(card);if(value.trigger){value.trigger.kill();value.trigger=null;}value.prepared=false;});pending.clear();gsap.killTweensOf(cards);cards.forEach(clear);triggers=[];
  };
};
})();
