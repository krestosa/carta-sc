/* SplitText responsive con progreso forward-only. Conserva el patrón autoSplit/onSplit del
   demo oficial, pero al subir nunca revierte una línea que ya entró al viewport. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,M=C&&C.motion;
if(!SC||!C||!SC.motion||typeof SC.motion.whenLoaded!=='function'||SC.__sectionHeadingBooted)return;
SC.__sectionHeadingBooted=true;
interface RevealGate { headings:boolean; cards:boolean; released:boolean; release():void; mark(part:'headings'|'cards'):void; }
interface HeadingState {
  prepared:boolean;done:boolean;started:boolean;max:number;split:SplitTextInstance|null;
  tween:GsapTimeline|null;progressTween:GsapTween|null;trigger:ScrollTriggerInstance|null;firstSplit:boolean;raf:number;
}
var initialized=false,motionDeps:MotionDeps|null=null,generation=0,mutationObserver:MutationObserver|null=null,elements:HTMLElement[]=[],splits:SplitTextInstance[]=[],states=new WeakMap<HTMLElement,HeadingState>();
var RULE_PROPERTY='--sc-section-rule-scale',CFG={startPct:99,endPct:86,initialDuration:.30,lineOffsetPercent:30,lineStagger:.045,refreshDelay:60};

function ensureGate():RevealGate{
  if(SC.catalogRevealGate)return SC.catalogRevealGate as RevealGate;
  var root=document.documentElement;
  var gate:RevealGate={headings:false,cards:false,released:false,release:function(){},mark:function(){}};
  gate.release=function():void{if(gate.released)return;gate.released=true;root.setAttribute('data-sc-catalog-reveal-ready','true');root.classList.remove('sc-catalog-reveal-prepaint');};
  gate.mark=function(part:'headings'|'cards'):void{if(part==='headings')gate.headings=true;if(part==='cards')gate.cards=true;if(gate.headings&&gate.cards)gate.release();};
  SC.catalogRevealGate=gate;return gate;
}
var gate=ensureGate();
function ready(fn:()=>void):void{document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}
function targets():HTMLElement[]{return Array.prototype.filter.call(document.querySelectorAll('.listadoShop .titleShopSeccion > div, .listadoShop .subTitleShopSeccion'),function(el:HTMLElement){return(el.textContent||'').replace(/\s+/g,' ').trim().length>0;}) as HTMLElement[];}
function isParent(el:HTMLElement):boolean{return!!(el.parentElement&&el.parentElement.classList.contains(S.sectionTitle.slice(1)));}
function host(el:HTMLElement):HTMLElement{return isParent(el)&&el.parentElement?el.parentElement:el;}
function headingUnit(node:Element|null):HTMLElement|null{if(!node)return null;if(node.matches(S.sectionSubtitle))return node as HTMLElement;if(node.matches(S.sectionTitle))return node.querySelector<HTMLElement>(':scope > div');return null;}
function renderable(el:HTMLElement):boolean{var target=host(el);return!target.hidden&&target.offsetParent!==null&&target.getBoundingClientRect().height>0;}
function programmatic():boolean{var scroll=SC.scrollState;return!!(scroll&&(scroll.programmatic||performance.now()<(scroll.suppressRevealUntil||0)));}
function state(el:HTMLElement):HeadingState{var value=states.get(el);if(!value){value={prepared:false,done:false,started:false,max:0,split:null,tween:null,progressTween:null,trigger:null,firstSplit:true,raf:0};states.set(el,value);}return value;}
function lines(el:HTMLElement):HTMLElement[]{var value=state(el);return value.split&&value.split.lines.length?value.split.lines:[el];}
function killTrigger(value:HeadingState):void{if(value.trigger){value.trigger.kill();value.trigger=null;}}
function clear(gsap:GsapLike,el:HTMLElement):void{gsap.set(lines(el),{clearProps:'transform,opacity,visibility,willChange'});if(isParent(el))gsap.set(el,{clearProps:RULE_PROPERTY});}
function finish(gsap:GsapLike,el:HTMLElement):void{
  var value=state(el);if(value.done)return;value.done=true;value.started=true;value.max=1;killTrigger(value);
  if(value.raf){cancelAnimationFrame(value.raf);value.raf=0;}if(value.progressTween){value.progressTween.kill();value.progressTween=null;}
  if(value.tween){value.tween.progress(1);value.tween.kill();value.tween=null;}
  gsap.set(lines(el),{yPercent:0,autoAlpha:1});if(isParent(el))gsap.set(el,{[RULE_PROPERTY]:1});clear(gsap,el);
}
function advance(gsap:GsapLike,el:HTMLElement,progress:number,direction:number):void{
  var value=state(el);if(value.done||!value.tween)return;if(direction<0){if(value.started||progress>0)finish(gsap,el);return;}if(programmatic()){finish(gsap,el);return;}
  if(progress<=0&&!value.started)return;value.started=true;value.max=Math.max(value.max,progress);value.tween.progress(value.max);if(value.max>=.995)finish(gsap,el);
}
function autoplay(gsap:GsapLike,el:HTMLElement):void{
  var value=state(el);if(value.done||!value.tween)return;value.started=true;
  value.progressTween=gsap.to(value.tween,{progress:1,duration:CFG.initialDuration,ease:(M.easings&&M.easings.out)||'power2.out',overwrite:true,onComplete:function(){value.progressTween=null;finish(gsap,el);}});
}
function armTrigger(gsap:GsapLike,ST:ScrollTriggerLike,el:HTMLElement,initialPass:boolean):void{
  var value=state(el);if(value.done||!value.tween||!renderable(el))return;var target=host(el),rect=target.getBoundingClientRect();killTrigger(value);
  if(rect.bottom<=0){finish(gsap,el);return;}if(initialPass&&rect.top<innerHeight&&rect.bottom>0){autoplay(gsap,el);return;}
  value.trigger=ST.create({trigger:target,start:'top '+CFG.startPct+'%',end:'top '+CFG.endPct+'%',invalidateOnRefresh:true,
    onUpdate:function(self:ScrollTriggerInstance){advance(gsap,el,self.progress,self.direction);},
    onEnter:function(self:ScrollTriggerInstance){if(self.direction>0)advance(gsap,el,self.progress||.001,1);},
    onLeave:function(self:ScrollTriggerInstance){if(self.direction>0)finish(gsap,el);},
    onLeaveBack:function(){if(value.started)finish(gsap,el);}
  });
}
function prepare(gsap:GsapLike,SplitText:SplitTextLike,ST:ScrollTriggerLike,el:HTMLElement):void{
  var value=state(el);if(value.prepared||!renderable(el))return;value.prepared=true;
  if(isParent(el)){el.classList.add('sc-section-rule-host');el.removeAttribute('aria-label');gsap.set(el,{[RULE_PROPERTY]:0});}
  value.split=SplitText.create(el,{type:'lines',mask:'lines',linesClass:'sc-section-text-line',autoSplit:true,aria:'none',onSplit:function(self:SplitTextInstance){
    var first=value.firstSplit;value.firstSplit=false;value.split=self;
    if(value.progressTween){value.progressTween.kill();value.progressTween=null;}if(value.tween)value.tween.kill();killTrigger(value);
    if(value.done){gsap.set(self.lines,{yPercent:0,autoAlpha:1});if(isParent(el))gsap.set(el,{[RULE_PROPERTY]:1});return;}
    gsap.set(self.lines,{yPercent:CFG.lineOffsetPercent,autoAlpha:0,willChange:'transform,opacity'});
    value.tween=gsap.timeline({paused:true}).to(self.lines,{yPercent:0,autoAlpha:1,duration:1,ease:(M.easings&&M.easings.out)||'power2.out',stagger:CFG.lineStagger,overwrite:'auto'},0);
    if(isParent(el))value.tween.to(el,{[RULE_PROPERTY]:1,duration:1,ease:'none',overwrite:'auto'},0);
    value.raf=requestAnimationFrame(function(){value.raf=0;armTrigger(gsap,ST,el,first);});return value.tween;
  }});
  splits.push(value.split);
}
function armNode(gsap:GsapLike,SplitText:SplitTextLike,ST:ScrollTriggerLike,node:Node):void{
  if(node.nodeType!==1)return;var element=node as HTMLElement;if(element.hidden)return;
  if(element.matches(S.productList)){element.querySelectorAll(S.sectionTitle+','+S.sectionSubtitle).forEach(function(item:Element){var child=headingUnit(item);if(child)prepare(gsap,SplitText,ST,child);});return;}
  var el=headingUnit(element);if(el)prepare(gsap,SplitText,ST,el);
}
function initMotion(deps:MotionDeps,token:number):void{
  var SplitText=deps.SplitText;if(initialized||token!==generation||!SplitText)return;const splitText:SplitTextLike=SplitText;initialized=true;var gsap=deps.gsap,ST=deps.ScrollTrigger;elements=targets();splits=[];
  if(SC.motion.reduced()){elements.forEach(function(el:HTMLElement){state(el).done=true;gsap.set(el,{clearProps:'transform,opacity,visibility'});});gate.mark('headings');return;}
  elements.forEach(function(el:HTMLElement){prepare(gsap,splitText,ST,el);});
  var container=document.querySelector<HTMLElement>(S.container);
  if(container&&window.MutationObserver){mutationObserver=new MutationObserver(function(mutations:MutationRecord[]){mutations.forEach(function(mutation:MutationRecord){if(mutation.type==='attributes'&&mutation.attributeName==='hidden'){var target=mutation.target as HTMLElement;if(!target.hidden)armNode(gsap,splitText,ST,target);}});});mutationObserver.observe(container,{subtree:true,attributes:true,attributeFilter:['hidden']});}
  gate.mark('headings');SC.motion.refresh(CFG.refreshDelay);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){if(initialized&&token===generation)SC.motion.refresh(CFG.refreshDelay);}).catch(function(){});
}
function init():void{if(initialized||!motionDeps)return;initMotion(motionDeps,++generation);}
function destroy():void{
  generation++;if(mutationObserver){mutationObserver.disconnect();mutationObserver=null;}
  if(motionDeps){var gsap=motionDeps.gsap;elements.forEach(function(el:HTMLElement){var value=state(el);if(value.raf)cancelAnimationFrame(value.raf);if(value.progressTween)value.progressTween.kill();if(value.tween)value.tween.kill();killTrigger(value);clear(gsap,el);el.classList.remove('sc-section-rule-host');value.prepared=false;});splits.forEach(function(split:SplitTextInstance){split.revert();});}
  initialized=false;elements=[];splits=[];
}
SC.sectionHeading={init:init,destroy:destroy,cleanup:destroy};
SC.motion.whenLoaded(function(deps:MotionDeps){motionDeps=deps;ready(init);});
})();
