/* Reveal de headings con SplitText. Cada unidad confirma posición documental estable antes
   de entrar a la secuencia y comparte el handoff adaptativo con las cards. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,M=C&&C.motion;
if(!SC||!C||!SC.motion||typeof SC.motion.whenLoaded!=='function'||SC.__sectionHeadingBooted)return;SC.__sectionHeadingBooted=true;
var initialized=false,motionDeps=null,generation=0,observer=null,mutationObserver=null,pending=null,elements=[],splits=[],tweens=[],triggers=[],headingStates=new WeakMap(),RULE_PROPERTY='--sc-section-rule-scale',CFG={ruleDuration:.34,textDuration:.36,textStagger:.012,triggerStart:'clamp(top 94%)',triggerRatio:.94,lineOffsetPercent:34,stableDelta:1.5,stableFrames:1,maxChecks:5,refreshDelay:60};

/* El prepaint se libera sólo cuando headings y cards ya dejaron preparados sus estados GSAP. */
function ensureGate(){
  if(SC.catalogRevealGate)return SC.catalogRevealGate;
  var root=document.documentElement,gate={headings:false,cards:false,released:false};
  gate.release=function(){if(gate.released)return;gate.released=true;if(root){root.setAttribute('data-sc-catalog-reveal-ready','true');root.classList.remove('sc-catalog-reveal-prepaint');}};
  gate.mark=function(part){if(part==='headings')gate.headings=true;if(part==='cards')gate.cards=true;if(gate.headings&&gate.cards)gate.release();};
  return SC.catalogRevealGate=gate;
}
var gate=ensureGate();

/* Secuencia DOM con handoff solapado. La velocidad de scroll acorta duración y adelanta
   el handoff de forma continua; nunca espera a que termine por completo el elemento anterior. */
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
var queue=ensureQueue();

function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}
function targets(){return Array.prototype.filter.call(document.querySelectorAll('.listadoShop .titleShopSeccion > div, .listadoShop .subTitleShopSeccion'),function(el){return(el.textContent||'').replace(/\s+/g,' ').trim().length>0;});}
function isParentCategory(el){return!!(el.parentElement&&el.parentElement.classList.contains(S.sectionTitle.slice(1)));}
function host(el){return el&&el.parentElement&&el.parentElement.matches&&el.parentElement.matches(S.sectionTitle)?el.parentElement:el;}
function headingUnit(node){if(!node||!node.matches)return null;if(node.matches(S.sectionSubtitle))return node;if(node.matches(S.sectionTitle))return node.querySelector(':scope > div');return null;}
function clearInvalidHostAria(el){if(el&&el.classList&&el.classList.contains('sc-section-rule-host'))el.removeAttribute('aria-label');}
function refresh(token){if(initialized&&token===generation)SC.motion.refresh(CFG.refreshDelay);}
function stateFor(el){var value=headingStates.get(el);if(!value){value={split:null,revealed:false,prepared:false,checking:false,trigger:null};headingStates.set(el,value);}return value;}
function renderable(el){var target=host(el);return!!(target&&!target.hidden&&target.offsetParent!==null&&target.getBoundingClientRect().height>0);}
function nearViewport(el){var rect=host(el).getBoundingClientRect(),timing=queue.motion?queue.motion(CFG.textDuration):{aheadPx:0};return rect.bottom>=-timing.aheadPx&&rect.top<=innerHeight*CFG.triggerRatio+timing.aheadPx;}
function documentY(el){return host(el).getBoundingClientRect().top+(window.scrollY||window.pageYOffset||0);}

function prepare(gsap,SplitText,el){
  var value=stateFor(el);if(value.prepared)return;value.prepared=true;value.revealed=false;
  if(isParentCategory(el)){el.classList.add('sc-section-rule-host');clearInvalidHostAria(el);gsap.set(el,{[RULE_PROPERTY]:0});}
  var split=SplitText.create(el,{type:'lines',mask:'lines',linesClass:'sc-section-text-line',autoSplit:true,aria:'none',onSplit:function(self){value.split=self;clearInvalidHostAria(el);if(!value.revealed&&self.lines&&self.lines.length)gsap.set(self.lines,{yPercent:CFG.lineOffsetPercent,autoAlpha:0});}});
  value.split=split;splits.push(split);clearInvalidHostAria(el);
}
function clearHeading(gsap,el){var value=stateFor(el),lines=value.split&&value.split.lines&&value.split.lines.length?value.split.lines:[el];gsap.set(lines,{clearProps:'transform,opacity,visibility,willChange'});if(isParentCategory(el))gsap.set(el,{clearProps:RULE_PROPERTY});}
function showNow(gsap,el){var value=stateFor(el),lines=value.split&&value.split.lines&&value.split.lines.length?value.split.lines:[el];value.revealed=true;gsap.killTweensOf(lines);gsap.set(lines,{yPercent:0,autoAlpha:1});if(isParentCategory(el))gsap.set(el,{[RULE_PROPERTY]:1});clearHeading(gsap,el);queue.complete(el);}
function reveal(gsap,el,done,timing){var value=stateFor(el),lines=value.split&&value.split.lines&&value.split.lines.length?value.split.lines:[el],parent=isParentCategory(el),duration=timing&&timing.duration||CFG.textDuration,ruleDuration=Math.max(.12,Math.min(CFG.ruleDuration,duration*.94));value.revealed=true;gsap.killTweensOf(lines);var tl=gsap.timeline({onComplete:function(){clearHeading(gsap,el);done();}});tl.to(lines,{yPercent:0,autoAlpha:1,duration:duration,ease:(M.easings&&M.easings.out)||'power2.out',stagger:CFG.textStagger,overwrite:'auto'},0);if(parent)tl.to(el,{[RULE_PROPERTY]:1,duration:ruleDuration,ease:(M.easings&&M.easings.out)||'power2.out',overwrite:'auto'},0);tweens.push(tl);}
function consume(gsap,el){var value=stateFor(el);if(!pending||!pending.has(el)||queue.isDone(el))return;pending.delete(el);value.checking=false;if(observer)observer.unobserve(host(el));if(value.trigger){value.trigger.kill();value.trigger=null;}queue.enqueue(el,{duration:CFG.textDuration},function(done,timing){reveal(gsap,el,done,timing);});}

/* Confirma estabilidad en coordenadas de documento: el scroll cambia rect.top, pero no docY. */
function confirm(gsap,el,force){
  var value=stateFor(el),token=generation;if(!pending||!pending.has(el)||value.checking)return;value.checking=true;var checks=0,stable=0,lastY=null;
  function sample(){requestAnimationFrame(function(){if(token!==generation||!pending||!pending.has(el)){value.checking=false;return;}if(!renderable(el)){value.checking=false;return;}if(!force&&!nearViewport(el)){value.checking=false;return;}var y=documentY(el);if(lastY!==null&&Math.abs(y-lastY)<=CFG.stableDelta)stable++;else stable=0;lastY=y;checks++;if(stable>=CFG.stableFrames){consume(gsap,el);return;}if(checks<CFG.maxChecks){sample();return;}value.checking=false;});}
  sample();
}
function arm(gsap,SplitText,ST,el){
  var value=stateFor(el);if(queue.isDone(el)||value.prepared||!renderable(el))return;var target=host(el);if(target.getBoundingClientRect().bottom<0){queue.complete(el);return;}prepare(gsap,SplitText,el);pending.add(el);
  value.trigger=ST.create({trigger:target,start:CFG.triggerStart,invalidateOnRefresh:true,onEnter:function(){confirm(gsap,el,false);},onEnterBack:function(){confirm(gsap,el,false);}});triggers.push(value.trigger);if(observer)observer.observe(target);if(nearViewport(el))confirm(gsap,el,false);
}
function armNode(gsap,SplitText,ST,node){
  if(!node||node.hidden)return;if(node.matches&&node.matches(S.productList)){node.querySelectorAll(S.sectionTitle+','+S.sectionSubtitle).forEach(function(item){var el=headingUnit(item);if(el)arm(gsap,SplitText,ST,el);});return;}var el=headingUnit(node);if(el)arm(gsap,SplitText,ST,el);
}

/* Cuando una card está confirmada, cualquier heading anterior pendiente se encola primero. */
function requestBefore(node){
  if(!initialized||!motionDeps||!node)return;var gsap=motionDeps.gsap,SplitText=motionDeps.SplitText,ST=motionDeps.ScrollTrigger,list=node.closest&&node.closest(S.productList),sibling=node.previousElementSibling,headings=[];if(!list)return;
  while(sibling&&sibling.parentElement===list){var heading=headingUnit(sibling);if(heading){headings.unshift(heading);if(sibling.matches(S.sectionTitle))break;}sibling=sibling.previousElementSibling;}
  headings.forEach(function(el){if(queue.isDone(el))return;if(!stateFor(el).prepared)arm(gsap,SplitText,ST,el);if(!pending||!pending.has(el))return;var rect=host(el).getBoundingClientRect();if(rect.bottom<0){showNow(gsap,el);return;}consume(gsap,el);});
}

function initMotion(deps,token){
  var SplitText=deps&&deps.SplitText;if(initialized||token!==generation||!SplitText)return;initialized=true;var gsap=deps.gsap,ST=deps.ScrollTrigger;elements=targets();splits=[];tweens=[];triggers=[];pending=new Set();
  if(SC.motion.reduced()){elements.forEach(function(el){queue.complete(el);gsap.set(el,{clearProps:'transform,opacity,visibility'});});gate.mark('headings');return;}
  if(window.IntersectionObserver)observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(!entry.isIntersecting)return;var el=entry.target.matches(S.sectionTitle)?entry.target.querySelector(':scope > div'):entry.target;if(el)confirm(gsap,el,false);});},{root:null,rootMargin:'0px 0px 35% 0px',threshold:0});
  elements.forEach(function(el){arm(gsap,SplitText,ST,el);});
  var container=document.querySelector(S.container);if(container&&window.MutationObserver){mutationObserver=new MutationObserver(function(mutations){mutations.forEach(function(mutation){if(mutation.type==='attributes'&&mutation.attributeName==='hidden'&&!mutation.target.hidden)armNode(gsap,SplitText,ST,mutation.target);});});mutationObserver.observe(container,{subtree:true,attributes:true,attributeFilter:['hidden']});}
  gate.mark('headings');refresh(token);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){refresh(token);}).catch(function(){});
}
function init(){if(initialized||!motionDeps)return;initMotion(motionDeps,++generation);}
function destroy(){generation++;if(observer){observer.disconnect();observer=null;}if(mutationObserver){mutationObserver.disconnect();mutationObserver=null;}elements.forEach(function(el){var value=stateFor(el);value.checking=false;if(!queue.isDone(el))queue.cancel(el);if(value.trigger){value.trigger.kill();value.trigger=null;}});if(pending){pending.clear();pending=null;}tweens.forEach(function(tween){if(tween&&tween.kill)tween.kill();});if(motionDeps){var gsap=motionDeps.gsap;elements.forEach(function(el){clearHeading(gsap,el);el.classList.remove('sc-section-rule-host');stateFor(el).prepared=false;});splits.forEach(function(split){if(split&&split.revert)split.revert();});}initialized=false;elements=[];splits=[];tweens=[];triggers=[];}
SC.sectionHeading={init:init,destroy:destroy,cleanup:destroy,queue:queue,requestBefore:requestBefore};
SC.motion.whenLoaded(function(deps){motionDeps=deps;ready(init);});
})();
