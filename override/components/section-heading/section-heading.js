/* Reveal de headings con SplitText. Cada unidad confirma posición documental estable antes
   de entrar a la cola; un reflow no puede consumir la animación fuera del viewport. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,M=C&&C.motion;
if(!SC||!C||!SC.motion||typeof SC.motion.whenLoaded!=='function'||SC.__sectionHeadingBooted)return;SC.__sectionHeadingBooted=true;
var initialized=false,motionDeps=null,generation=0,observer=null,mutationObserver=null,pending=null,elements=[],splits=[],tweens=[],triggers=[],headingStates=new WeakMap(),RULE_PROPERTY='--sc-section-rule-scale',CFG={ruleDuration:.20,textDuration:.20,textStagger:.018,triggerStart:'clamp(top 90%)',triggerRatio:.90,lineOffsetPercent:64,stableDelta:1.5,stableFrames:1,maxChecks:5,refreshDelay:60};

/* El prepaint se libera sólo cuando headings y cards ya dejaron preparados sus estados GSAP. */
function ensureGate(){
  if(SC.catalogRevealGate)return SC.catalogRevealGate;
  var root=document.documentElement,gate={headings:false,cards:false,released:false};
  gate.release=function(){if(gate.released)return;gate.released=true;if(root){root.setAttribute('data-sc-catalog-reveal-ready','true');root.classList.remove('sc-catalog-reveal-prepaint');}};
  gate.mark=function(part){if(part==='headings')gate.headings=true;if(part==='cards')gate.cards=true;if(gate.headings&&gate.cards)gate.release();};
  return SC.catalogRevealGate=gate;
}
var gate=ensureGate();

/* Cola única del catálogo. Sólo contiene unidades ya confirmadas cerca del viewport. */
var queue=SC.catalogRevealQueue;
if(!queue){
  var waiting=[],active=null,states=new WeakMap();
  function state(node){var value=states.get(node);if(!value){value={queued:false,running:false,done:false};states.set(node,value);}return value;}
  function before(a,b){if(a===b)return 0;var relation=a.compareDocumentPosition(b);return relation&(window.Node?Node.DOCUMENT_POSITION_FOLLOWING:4)?-1:1;}
  function sort(){waiting.sort(function(a,b){return before(a.node,b.node);});}
  function pump(){if(active||!waiting.length)return;sort();var item=waiting.shift(),value=state(item.node);value.queued=false;if(value.done){pump();return;}active=item;value.running=true;var settled=false;function done(){if(settled)return;settled=true;value.running=false;value.done=true;if(active===item)active=null;pump();}try{item.run(done);}catch(error){if(window.console&&console.error)console.error('[SushiClub catalog reveal]',error);done();}}
  function enqueue(node,run){if(!node||typeof run!=='function')return;var value=state(node);if(value.done||value.queued||value.running)return;value.queued=true;waiting.push({node:node,run:run});pump();}
  function complete(node){if(!node)return;var value=state(node);value.done=true;value.queued=false;value.running=false;waiting=waiting.filter(function(item){return item.node!==node;});if(active&&active.node===node)active=null;pump();}
  function cancel(node){if(!node)return;var value=state(node);value.queued=false;value.running=false;waiting=waiting.filter(function(item){return item.node!==node;});if(active&&active.node===node)active=null;pump();}
  function isDone(node){return!!(node&&state(node).done);}
  queue=SC.catalogRevealQueue={enqueue:enqueue,complete:complete,cancel:cancel,isDone:isDone,pump:pump};
}

function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}
function targets(){return Array.prototype.filter.call(document.querySelectorAll('.listadoShop .titleShopSeccion > div, .listadoShop .subTitleShopSeccion'),function(el){return(el.textContent||'').replace(/\s+/g,' ').trim().length>0;});}
function isParentCategory(el){return!!(el.parentElement&&el.parentElement.classList.contains(S.sectionTitle.slice(1)));}
function host(el){return el&&el.parentElement&&el.parentElement.matches&&el.parentElement.matches(S.sectionTitle)?el.parentElement:el;}
function headingUnit(node){if(!node||!node.matches)return null;if(node.matches(S.sectionSubtitle))return node;if(node.matches(S.sectionTitle))return node.querySelector(':scope > div');return null;}
function clearInvalidHostAria(el){if(el&&el.classList&&el.classList.contains('sc-section-rule-host'))el.removeAttribute('aria-label');}
function refresh(token){if(initialized&&token===generation)SC.motion.refresh(CFG.refreshDelay);}
function stateFor(el){var value=headingStates.get(el);if(!value){value={split:null,revealed:false,prepared:false,checking:false,trigger:null};headingStates.set(el,value);}return value;}
function renderable(el){var target=host(el);return!!(target&&!target.hidden&&target.offsetParent!==null&&target.getBoundingClientRect().height>0);}
function nearViewport(el){var rect=host(el).getBoundingClientRect();return rect.bottom>=0&&rect.top<=innerHeight*CFG.triggerRatio;}
function documentY(el){return host(el).getBoundingClientRect().top+(window.scrollY||window.pageYOffset||0);}

function prepare(gsap,SplitText,el){
  var value=stateFor(el);if(value.prepared)return;value.prepared=true;value.revealed=false;
  if(isParentCategory(el)){el.classList.add('sc-section-rule-host');clearInvalidHostAria(el);gsap.set(el,{[RULE_PROPERTY]:0});}
  var split=SplitText.create(el,{type:'lines',mask:'lines',linesClass:'sc-section-text-line',autoSplit:true,aria:'none',onSplit:function(self){value.split=self;clearInvalidHostAria(el);if(!value.revealed&&self.lines&&self.lines.length)gsap.set(self.lines,{yPercent:CFG.lineOffsetPercent,autoAlpha:0});}});
  value.split=split;splits.push(split);clearInvalidHostAria(el);
}
function clearHeading(gsap,el){var value=stateFor(el),lines=value.split&&value.split.lines&&value.split.lines.length?value.split.lines:[el];gsap.set(lines,{clearProps:'transform,opacity,visibility,willChange'});if(isParentCategory(el))gsap.set(el,{clearProps:RULE_PROPERTY});}
function showNow(gsap,el){var value=stateFor(el),lines=value.split&&value.split.lines&&value.split.lines.length?value.split.lines:[el];value.revealed=true;gsap.killTweensOf(lines);gsap.set(lines,{yPercent:0,autoAlpha:1});if(isParentCategory(el))gsap.set(el,{[RULE_PROPERTY]:1});clearHeading(gsap,el);queue.complete(el);}
function reveal(gsap,el,done){var value=stateFor(el),lines=value.split&&value.split.lines&&value.split.lines.length?value.split.lines:[el],parent=isParentCategory(el);value.revealed=true;gsap.killTweensOf(lines);var tl=gsap.timeline({onComplete:function(){clearHeading(gsap,el);done();}});tl.to(lines,{yPercent:0,autoAlpha:1,duration:CFG.textDuration,ease:M.easings.strongOut,stagger:CFG.textStagger,overwrite:'auto'},0);if(parent)tl.to(el,{[RULE_PROPERTY]:1,duration:CFG.ruleDuration,ease:M.easings.strongOut,overwrite:'auto'},0);tweens.push(tl);}
function consume(gsap,el){var value=stateFor(el);if(!pending||!pending.has(el)||queue.isDone(el))return;pending.delete(el);value.checking=false;if(observer)observer.unobserve(host(el));if(value.trigger){value.trigger.kill();value.trigger=null;}queue.enqueue(el,function(done){reveal(gsap,el,done);});}

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
  if(window.IntersectionObserver)observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(!entry.isIntersecting)return;var el=entry.target.matches(S.sectionTitle)?entry.target.querySelector(':scope > div'):entry.target;if(el)confirm(gsap,el,false);});},{root:null,rootMargin:'0px 0px -10% 0px',threshold:0});
  elements.forEach(function(el){arm(gsap,SplitText,ST,el);});
  var container=document.querySelector(S.container);if(container&&window.MutationObserver){mutationObserver=new MutationObserver(function(mutations){mutations.forEach(function(mutation){if(mutation.type==='attributes'&&mutation.attributeName==='hidden'&&!mutation.target.hidden)armNode(gsap,SplitText,ST,mutation.target);});});mutationObserver.observe(container,{subtree:true,attributes:true,attributeFilter:['hidden']});}
  gate.mark('headings');refresh(token);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){refresh(token);}).catch(function(){});
}
function init(){if(initialized||!motionDeps)return;initMotion(motionDeps,++generation);}
function destroy(){generation++;if(observer){observer.disconnect();observer=null;}if(mutationObserver){mutationObserver.disconnect();mutationObserver=null;}elements.forEach(function(el){var value=stateFor(el);value.checking=false;if(!queue.isDone(el))queue.cancel(el);if(value.trigger){value.trigger.kill();value.trigger=null;}});if(pending){pending.clear();pending=null;}tweens.forEach(function(tween){if(tween&&tween.kill)tween.kill();});if(motionDeps){var gsap=motionDeps.gsap;elements.forEach(function(el){clearHeading(gsap,el);el.classList.remove('sc-section-rule-host');stateFor(el).prepared=false;});splits.forEach(function(split){if(split&&split.revert)split.revert();});}initialized=false;elements=[];splits=[];tweens=[];triggers=[];}
SC.sectionHeading={init:init,destroy:destroy,cleanup:destroy,queue:queue,requestBefore:requestBefore};
SC.motion.whenLoaded(function(deps){motionDeps=deps;ready(init);});
})();
