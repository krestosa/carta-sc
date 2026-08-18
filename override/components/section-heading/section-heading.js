/* Reveal de headings con SplitText y una cola compartida de unidades ya activadas.
   La cola ordena por DOM, pero nunca espera elementos que todavía no entraron al viewport. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,M=C&&C.motion;
if(!SC||!C||!SC.motion||typeof SC.motion.whenReady!=='function'||SC.__sectionHeadingBooted)return;SC.__sectionHeadingBooted=true;
var initialized=false,motionDeps=null,generation=0,rafA=0,rafB=0,observer=null,pending=null,elements=[],splits=[],tweens=[],triggers=[],headingStates=new WeakMap(),RULE_PROPERTY='--sc-section-rule-scale',CFG={initialThreshold:.96,ruleDuration:.40,textDuration:.32,textStagger:.028,triggerStart:'clamp(top 90%)',lineOffsetPercent:68,refreshDelay:60};

/* Una sola animación corre a la vez. Sólo entran unidades cuyo trigger ya se activó. */
var queue=SC.catalogRevealQueue;
if(!queue){
  var waiting=[],active=null,states=new WeakMap();
  function state(node){var value=states.get(node);if(!value){value={queued:false,running:false,done:false};states.set(node,value);}return value;}
  function before(a,b){if(a===b)return 0;var relation=a.compareDocumentPosition(b);return relation&(window.Node?Node.DOCUMENT_POSITION_FOLLOWING:4)?-1:1;}
  function sort(){waiting.sort(function(a,b){return before(a.node,b.node);});}
  function pump(){
    if(active||!waiting.length)return;sort();var item=waiting.shift(),value=state(item.node);value.queued=false;
    if(value.done){pump();return;}active=item;value.running=true;var settled=false;
    function done(){if(settled)return;settled=true;value.running=false;value.done=true;if(active===item)active=null;pump();}
    try{item.run(done);}catch(error){if(window.console&&console.error)console.error('[SushiClub catalog reveal]',error);done();}
  }
  function enqueue(node,run){if(!node||typeof run!=='function')return;var value=state(node);if(value.done||value.queued||value.running)return;value.queued=true;waiting.push({node:node,run:run});pump();}
  function complete(node){if(!node)return;var value=state(node);value.done=true;value.queued=false;value.running=false;waiting=waiting.filter(function(item){return item.node!==node;});if(active&&active.node===node)active=null;pump();}
  function cancel(node){if(!node)return;var value=state(node);value.queued=false;value.running=false;waiting=waiting.filter(function(item){return item.node!==node;});if(active&&active.node===node)active=null;pump();}
  function isDone(node){return!!(node&&state(node).done);}
  queue=SC.catalogRevealQueue={enqueue:enqueue,complete:complete,cancel:cancel,isDone:isDone,pump:pump};
}

function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}
function targets(){return Array.prototype.filter.call(document.querySelectorAll('.listadoShop .titleShopSeccion > div, .listadoShop .subTitleShopSeccion'),function(el){return(el.textContent||'').replace(/\s+/g,' ').trim().length>0;});}
function isParentCategory(el){return!!(el.parentElement&&el.parentElement.classList.contains(S.sectionTitle.slice(1)));}
function clearInvalidHostAria(el){if(el&&el.classList&&el.classList.contains('sc-section-rule-host'))el.removeAttribute('aria-label');}
function refresh(token){if(initialized&&token===generation)SC.motion.refresh(CFG.refreshDelay);}
function stateFor(el){var value=headingStates.get(el);if(!value){value={split:null,revealed:false};headingStates.set(el,value);}return value;}

/* SplitText prepara todas las líneas, incluso headings de una sola línea. */
function prepare(gsap,SplitText,el){
  var value=stateFor(el);value.revealed=false;
  if(isParentCategory(el)){el.classList.add('sc-section-rule-host');clearInvalidHostAria(el);gsap.set(el,{[RULE_PROPERTY]:0});}
  var split=SplitText.create(el,{type:'lines',mask:'lines',linesClass:'sc-section-text-line',autoSplit:true,aria:'none',onSplit:function(self){value.split=self;clearInvalidHostAria(el);if(!value.revealed&&self.lines&&self.lines.length)gsap.set(self.lines,{yPercent:CFG.lineOffsetPercent,autoAlpha:0});}});
  value.split=split;splits.push(split);clearInvalidHostAria(el);
}
function clearHeading(gsap,el){var value=stateFor(el),lines=value.split&&value.split.lines&&value.split.lines.length?value.split.lines:[el];gsap.set(lines,{clearProps:'transform,opacity,visibility,willChange'});if(isParentCategory(el))gsap.set(el,{clearProps:RULE_PROPERTY});}
function showNow(gsap,el){var value=stateFor(el),lines=value.split&&value.split.lines&&value.split.lines.length?value.split.lines:[el];value.revealed=true;gsap.killTweensOf(lines);gsap.set(lines,{yPercent:0,autoAlpha:1});if(isParentCategory(el))gsap.set(el,{[RULE_PROPERTY]:1});clearHeading(gsap,el);queue.complete(el);}
function reveal(gsap,el,done){
  var value=stateFor(el),lines=value.split&&value.split.lines&&value.split.lines.length?value.split.lines:[el],parent=isParentCategory(el);value.revealed=true;gsap.killTweensOf(lines);
  var tl=gsap.timeline({onComplete:function(){clearHeading(gsap,el);done();}});
  tl.to(lines,{yPercent:0,autoAlpha:1,duration:CFG.textDuration,ease:M.easings.strongOut,stagger:CFG.textStagger,overwrite:'auto'},0);
  if(parent)tl.to(el,{[RULE_PROPERTY]:1,duration:CFG.ruleDuration,ease:M.easings.strongOut,overwrite:'auto'},0);
  tweens.push(tl);
}
function request(gsap,el){if(!pending||!pending.has(el))return;pending.delete(el);if(observer)observer.unobserve(el);queue.enqueue(el,function(done){reveal(gsap,el,done);});}

function initMotion(deps,token){
  var SplitText=deps&&deps.SplitText;if(initialized||token!==generation||!SplitText)return;initialized=true;var gsap=deps.gsap,ST=deps.ScrollTrigger,initial=[],deferred=[];elements=targets();splits=[];tweens=[];triggers=[];pending=new Set();
  if(SC.motion.reduced()){elements.forEach(function(el){queue.complete(el);gsap.set(el,{clearProps:'transform,opacity,visibility'});});return;}
  elements.forEach(function(el){
    if(queue.isDone(el)){gsap.set(el,{clearProps:'transform,opacity,visibility'});return;}
    var host=el.parentElement&&el.parentElement.matches&&el.parentElement.matches(S.sectionTitle)?el.parentElement:el;
    if(!host||host.hidden||host.offsetParent===null){queue.complete(el);return;}
    var rect=host.getBoundingClientRect();if(rect.bottom<0){queue.complete(el);return;}
    prepare(gsap,SplitText,el);pending.add(el);if(rect.top<=innerHeight*CFG.initialThreshold)initial.push(el);else deferred.push(el);
  });
  if(initial.length){rafA=requestAnimationFrame(function(){rafA=0;rafB=requestAnimationFrame(function(){rafB=0;initial.forEach(function(el){request(gsap,el);});});});}
  deferred.forEach(function(el){triggers.push(ST.create({trigger:el,start:CFG.triggerStart,once:true,invalidateOnRefresh:true,onEnter:function(){request(gsap,el);},onEnterBack:function(){request(gsap,el);}}));});
  if(deferred.length&&window.IntersectionObserver){observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting)request(gsap,entry.target);});},{root:null,rootMargin:'0px',threshold:0});deferred.forEach(function(el){observer.observe(el);});}
  refresh(token);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){refresh(token);}).catch(function(){});
}
function init(){if(initialized||!motionDeps)return;initMotion(motionDeps,++generation);}
function destroy(){
  generation++;if(rafA){cancelAnimationFrame(rafA);rafA=0;}if(rafB){cancelAnimationFrame(rafB);rafB=0;}if(observer){observer.disconnect();observer=null;}if(pending){pending.forEach(function(el){queue.cancel(el);});pending.clear();pending=null;}
  triggers.forEach(function(trigger){if(trigger&&trigger.kill)trigger.kill();});tweens.forEach(function(tween){if(tween&&tween.kill)tween.kill();});
  if(motionDeps){var gsap=motionDeps.gsap;elements.forEach(function(el){clearHeading(gsap,el);el.classList.remove('sc-section-rule-host');});splits.forEach(function(split){if(split&&split.revert)split.revert();});}
  initialized=false;elements=[];splits=[];tweens=[];triggers=[];
}
SC.sectionHeading={init:init,destroy:destroy,cleanup:destroy,queue:queue};
SC.motion.whenReady(function(deps){motionDeps=deps;ready(init);});
})();
