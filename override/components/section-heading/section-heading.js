/* SplitText responsive con progreso forward-only. Conserva el patrón autoSplit/onSplit del
   texto y al subir nunca revierte una línea que ya entró al viewport. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors;
if(!SC||!C||!SC.motion||typeof SC.motion.whenLoaded!=='function'||SC.__sectionHeadingBooted)return;SC.__sectionHeadingBooted=true;
var initialized=false,motionDeps=null,generation=0,mutationObserver=null,elements=[],splits=[],states=new WeakMap(),RULE_PROPERTY='--sc-section-rule-scale',CFG={startPct:99,endPct:86,lineOffsetPercent:26,refreshDelay:60};

function ensureGate(){
  if(SC.catalogRevealGate)return SC.catalogRevealGate;
  var root=document.documentElement,gate={headings:false,cards:false,released:false};
  gate.release=function(){if(gate.released)return;gate.released=true;if(root){root.setAttribute('data-sc-catalog-reveal-ready','true');root.classList.remove('sc-catalog-reveal-prepaint');}};
  gate.mark=function(part){if(part==='headings')gate.headings=true;if(part==='cards')gate.cards=true;if(gate.headings&&gate.cards)gate.release();};
  return SC.catalogRevealGate=gate;
}
var gate=ensureGate();
function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}
function targets(){return Array.prototype.filter.call(document.querySelectorAll('.listadoShop .titleShopSeccion > div, .listadoShop .subTitleShopSeccion'),function(el){return(el.textContent||'').replace(/\s+/g,' ').trim().length>0;});}
function isParent(el){return!!(el.parentElement&&el.parentElement.classList.contains(S.sectionTitle.slice(1)));}
function host(el){return isParent(el)?el.parentElement:el;}
function headingUnit(node){if(!node||!node.matches)return null;if(node.matches(S.sectionSubtitle))return node;if(node.matches(S.sectionTitle))return node.querySelector(':scope > div');return null;}
function renderable(el){var target=host(el);return!!(target&&!target.hidden&&target.offsetParent!==null&&target.getBoundingClientRect().height>0);}
function programmatic(){var scroll=SC.scrollState;return!!(scroll&&(scroll.programmatic||performance.now()<(scroll.suppressRevealUntil||0)));}
function state(el){var value=states.get(el);if(!value){value={prepared:false,done:false,started:false,max:0,split:null,tween:null,progressTween:null,trigger:null,firstSplit:true,raf:0};states.set(el,value);}return value;}
function lines(el){var value=state(el);return value.split&&value.split.lines&&value.split.lines.length?value.split.lines:[el];}
function killTrigger(value){if(value.trigger){value.trigger.kill();value.trigger=null;}}
function clear(gsap,el){gsap.set(lines(el),{clearProps:'transform,opacity,visibility,willChange'});if(isParent(el))gsap.set(el,{clearProps:RULE_PROPERTY});}
function finish(gsap,el){
  var value=state(el);if(value.done)return;value.done=true;value.started=true;value.max=1;killTrigger(value);if(value.raf){cancelAnimationFrame(value.raf);value.raf=0;}if(value.progressTween){value.progressTween.kill();value.progressTween=null;}
  if(value.tween){value.tween.progress(1);value.tween.kill();value.tween=null;}gsap.set(lines(el),{yPercent:0,autoAlpha:1});if(isParent(el))gsap.set(el,{[RULE_PROPERTY]:1});clear(gsap,el);
}
function advance(gsap,el,progress,direction){
  var value=state(el);if(value.done||!value.tween)return;if(direction<0){if(value.started||progress>0)finish(gsap,el);return;}if(programmatic()){finish(gsap,el);return;}
  if(progress<=0&&!value.started)return;value.started=true;value.max=Math.max(value.max,progress);value.tween.progress(value.max);if(value.max>=.995)finish(gsap,el);
}
function autoplay(gsap,el){var value=state(el);if(value.done||!value.tween)return;var spec=SC.motion.springSpec('spatial','default');value.started=true;value.progressTween=gsap.to(value.tween,{progress:1,duration:spec.duration,ease:spec.ease,overwrite:true,onComplete:function(){value.progressTween=null;finish(gsap,el);}});}
function armTrigger(gsap,ST,el,initialPass){
  var value=state(el);if(value.done||!value.tween||!renderable(el))return;var target=host(el),rect=target.getBoundingClientRect();killTrigger(value);
  if(rect.bottom<=0){finish(gsap,el);return;}if(initialPass&&rect.top<innerHeight&&rect.bottom>0){autoplay(gsap,el);return;}
  value.trigger=ST.create({trigger:target,start:'top '+CFG.startPct+'%',end:'top '+CFG.endPct+'%',invalidateOnRefresh:true,onUpdate:function(self){advance(gsap,el,self.progress,self.direction);},onEnter:function(self){if(self.direction>0)advance(gsap,el,self.progress||.001,1);},onLeave:function(self){if(self.direction>0)finish(gsap,el);},onLeaveBack:function(){if(value.started)finish(gsap,el);}});
}
function prepare(gsap,SplitText,ST,el){
  var value=state(el);if(value.prepared||!renderable(el))return;value.prepared=true;if(isParent(el)){el.classList.add('sc-section-rule-host');el.removeAttribute('aria-label');gsap.set(el,{[RULE_PROPERTY]:0});}
  value.split=SplitText.create(el,{type:'lines',mask:'lines',linesClass:'sc-section-text-line',autoSplit:true,aria:'none',onSplit:function(self){
    var first=value.firstSplit;value.firstSplit=false;value.split=self;if(value.progressTween){value.progressTween.kill();value.progressTween=null;}if(value.tween)value.tween.kill();killTrigger(value);
    if(value.done){gsap.set(self.lines,{yPercent:0,autoAlpha:1});if(isParent(el))gsap.set(el,{[RULE_PROPERTY]:1});return;}
    var step=SC.motion.stagger('default',self.lines.length);
    gsap.set(self.lines,{yPercent:CFG.lineOffsetPercent,autoAlpha:0,willChange:'transform,opacity'});
    value.tween=gsap.timeline({paused:true}).to(self.lines,{yPercent:0,autoAlpha:1,duration:1,ease:'none',stagger:step,overwrite:'auto'},0);
    if(isParent(el))value.tween.to(el,{[RULE_PROPERTY]:1,duration:1,ease:'none',overwrite:'auto'},0);
    value.raf=requestAnimationFrame(function(){value.raf=0;armTrigger(gsap,ST,el,first);});return value.tween;
  }});splits.push(value.split);
}
function armNode(gsap,SplitText,ST,node){if(!node||node.hidden)return;if(node.matches&&node.matches(S.productList)){node.querySelectorAll(S.sectionTitle+','+S.sectionSubtitle).forEach(function(item){var el=headingUnit(item);if(el)prepare(gsap,SplitText,ST,el);});return;}var el=headingUnit(node);if(el)prepare(gsap,SplitText,ST,el);}
function initMotion(deps,token){
  var SplitText=deps&&deps.SplitText;if(initialized||token!==generation||!SplitText)return;initialized=true;var gsap=deps.gsap,ST=deps.ScrollTrigger;elements=targets();splits=[];
  if(SC.motion.reduced()){elements.forEach(function(el){state(el).done=true;gsap.set(el,{clearProps:'transform,opacity,visibility'});});gate.mark('headings');return;}
  elements.forEach(function(el){prepare(gsap,SplitText,ST,el);});var container=document.querySelector(S.container);if(container&&window.MutationObserver){mutationObserver=new MutationObserver(function(mutations){mutations.forEach(function(mutation){if(mutation.type==='attributes'&&mutation.attributeName==='hidden'&&!mutation.target.hidden)armNode(gsap,SplitText,ST,mutation.target);});});mutationObserver.observe(container,{subtree:true,attributes:true,attributeFilter:['hidden']});}
  gate.mark('headings');SC.motion.refresh(CFG.refreshDelay);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){if(initialized&&token===generation)SC.motion.refresh(CFG.refreshDelay);}).catch(function(){});
}
function init(){if(initialized||!motionDeps)return;initMotion(motionDeps,++generation);}
function destroy(){
  generation++;if(mutationObserver){mutationObserver.disconnect();mutationObserver=null;}if(motionDeps){var gsap=motionDeps.gsap;elements.forEach(function(el){var value=state(el);if(value.raf)cancelAnimationFrame(value.raf);if(value.progressTween)value.progressTween.kill();if(value.tween)value.tween.kill();killTrigger(value);clear(gsap,el);el.classList.remove('sc-section-rule-host');value.prepared=false;});splits.forEach(function(split){if(split&&split.revert)split.revert();});}initialized=false;elements=[];splits=[];
}
SC.sectionHeading={init:init,destroy:destroy,cleanup:destroy};SC.motion.whenLoaded(function(deps){motionDeps=deps;ready(init);});
})();