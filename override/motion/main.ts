(function(){
'use strict';
if(window.__scMotionCoreBooted)return;window.__scMotionCoreBooted=true;

/* Motor de motion propio. No carga librerías externas: todos los tiempos, easings,
   interpolaciones y cancelaciones se ejecutan con requestAnimationFrame. */
var SC=window.SCOverride=window.SCOverride||{},C=SC.config||{},MEDIA=C.media||{};
type MotionCallback=(deps:MotionDeps)=>void;
interface MicroPose { rotation?:number; }
interface MicroOptions {
  active?:MicroPose;press?:MicroPose;transformOrigin?:string;
  enterDuration?:number;exitDuration?:number;pressDuration?:number;pressReturnDuration?:number;
  enterEase?:string;exitEase?:string;
}
var readyQueue:MotionCallback[]=[],loadedQueue:MotionCallback[]=[],unlocked=false,refreshTimer=0;
var ROOT=document.documentElement;
ROOT.classList.add('sc-motion-engine-ready');

function clamp(value:number,min:number,max:number):number{return Math.max(min,Math.min(max,value));}
function reduced():boolean{return (C.queries&&C.queries.reducedMotion?C.queries.reducedMotion:window.matchMedia(MEDIA.reducedMotion||'(prefers-reduced-motion: reduce)')).matches;}
function easeValue(name:string|undefined,t:number):number{
  var x=clamp(t,0,1),key=(name||'linear').toLowerCase();
  if(key==='none'||key==='linear')return x;
  if(key==='quad.in')return x*x;
  if(key==='quad.out')return 1-Math.pow(1-x,2);
  if(key==='quad.inout')return x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2;
  if(key==='cubic.in')return x*x*x;
  if(key==='cubic.out')return 1-Math.pow(1-x,3);
  if(key==='cubic.inout')return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
  if(key==='quart.in')return Math.pow(x,4);
  if(key==='quart.out')return 1-Math.pow(1-x,4);
  if(key==='quart.inout')return x<.5?8*Math.pow(x,4):1-Math.pow(-2*x+2,4)/2;
  if(key==='quint.in')return Math.pow(x,5);
  if(key==='quint.out')return 1-Math.pow(1-x,5);
  if(key==='quint.inout')return x<.5?16*Math.pow(x,5):1-Math.pow(-2*x+2,5)/2;
  if(key==='sine.in')return 1-Math.cos((x*Math.PI)/2);
  if(key==='sine.out')return Math.sin((x*Math.PI)/2);
  if(key==='sine.inout')return-(Math.cos(Math.PI*x)-1)/2;
  return 1-Math.pow(1-x,3);
}
function tween(duration:number,ease:string|undefined,update:(progress:number)=>void,options?:MotionTweenOptions):MotionHandle{
  var opts=options||{},delay=Math.max(0,(opts.delay||0)*1000),length=Math.max(0,duration*1000),raf=0,start=-1,active=true,completed=false;
  function complete():void{if(completed)return;completed=true;active=false;if(opts.onComplete)opts.onComplete();}
  function frame(time:number):void{
    if(!active)return;if(start<0)start=time;var elapsed=time-start;
    if(elapsed<delay){raf=requestAnimationFrame(frame);return;}
    var raw=length===0?1:clamp((elapsed-delay)/length,0,1);update(easeValue(ease,raw));
    if(raw>=1){complete();return;}raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);
  return {
    cancel:function():void{if(!active)return;active=false;if(raf)cancelAnimationFrame(raf);},
    finish:function():void{if(!active)return;if(raf)cancelAnimationFrame(raf);update(1);complete();},
    active:function():boolean{return active;}
  };
}
function delay(seconds:number,callback:()=>void):MotionHandle{
  var active=true,id=window.setTimeout(function(){if(!active)return;active=false;callback();},Math.max(0,seconds*1000));
  return {cancel:function(){if(!active)return;active=false;clearTimeout(id);},finish:function(){if(!active)return;active=false;clearTimeout(id);callback();},active:function(){return active;}};
}
function currentTransform(target:HTMLElement|SVGElement):MotionTransformState{
  var transform=getComputedStyle(target).transform;if(!transform||transform==='none')return{x:0,y:0,scale:1,rotation:0};
  try{var matrix=new DOMMatrixReadOnly(transform),scale=Math.sqrt(matrix.a*matrix.a+matrix.b*matrix.b)||1,rotation=Math.atan2(matrix.b,matrix.a)*180/Math.PI;return{x:matrix.m41,y:matrix.m42,scale:scale,rotation:rotation};}catch(_){return{x:0,y:0,scale:1,rotation:0};}
}
function writeTransform(target:HTMLElement|SVGElement,state:MotionTransformState):void{target.style.transform='translate3d('+state.x+'px,'+state.y+'px,0) rotate('+state.rotation+'deg) scale('+state.scale+')';}
function transform(target:HTMLElement|SVGElement,to:Partial<MotionTransformState>,options:MotionPropertyOptions):MotionHandle{
  var from=currentTransform(target),end={x:to.x==null?from.x:to.x,y:to.y==null?from.y:to.y,scale:to.scale==null?from.scale:to.scale,rotation:to.rotation==null?from.rotation:to.rotation};
  target.style.willChange='transform';
  return tween(options.duration,options.ease,function(p){writeTransform(target,{x:from.x+(end.x-from.x)*p,y:from.y+(end.y-from.y)*p,scale:from.scale+(end.scale-from.scale)*p,rotation:from.rotation+(end.rotation-from.rotation)*p});},{delay:options.delay,onComplete:function(){target.style.removeProperty('will-change');if(options.clear)target.style.removeProperty('transform');if(options.onComplete)options.onComplete();}});
}
function opacity(target:HTMLElement|SVGElement,to:number,options:MotionPropertyOptions):MotionHandle{
  var parsed=parseFloat(getComputedStyle(target).opacity),from=Number.isFinite(parsed)?parsed:1;target.style.willChange='opacity';
  return tween(options.duration,options.ease,function(p){target.style.opacity=String(from+(to-from)*p);},{delay:options.delay,onComplete:function(){target.style.removeProperty('will-change');if(options.clear)target.style.removeProperty('opacity');if(options.onComplete)options.onComplete();}});
}
function attributes(target:Element,to:Record<string,number>,options:MotionPropertyOptions):MotionHandle{
  var keys=Object.keys(to),from:Record<string,number>={};keys.forEach(function(key){var value=parseFloat(target.getAttribute(key)||'0');from[key]=Number.isFinite(value)?value:0;});
  return tween(options.duration,options.ease,function(p){keys.forEach(function(key){var start=from[key]??0,end=to[key]??start;target.setAttribute(key,String(start+(end-start)*p));});},{delay:options.delay,onComplete:options.onComplete});
}
interface SampledPath { points:Array<[number,number]>; closed:boolean; }
function splitPathData(data:string):string[]{var found=data.match(/[Mm][^Mm]*/g);return found&&found.length?found:[data];}
function samplePath(svg:SVGSVGElement,data:string,count:number):SampledPath|null{
  var probe=document.createElementNS('http://www.w3.org/2000/svg','path');probe.setAttribute('d',data);probe.setAttribute('visibility','hidden');probe.setAttribute('pointer-events','none');svg.appendChild(probe);
  try{var length=probe.getTotalLength();if(!Number.isFinite(length)||length<=0)return null;var closed=/[zZ]\s*$/.test(data),points:Array<[number,number]>=[];for(var i=0;i<count;i++){var ratio=closed?i/count:(count===1?0:i/(count-1)),point=probe.getPointAtLength(length*ratio);points.push([point.x,point.y]);}return{points:points,closed:closed};}catch(_){return null;}finally{probe.remove();}
}
function samplePathSet(svg:SVGSVGElement,data:string,count:number):SampledPath[]|null{var parts=splitPathData(data),result:SampledPath[]=[];for(var i=0;i<parts.length;i++){var sampled=samplePath(svg,parts[i]||'',count);if(!sampled)return null;result.push(sampled);}return result;}
function pointDistance(a:[number,number],b:[number,number]):number{var dx=a[0]-b[0],dy=a[1]-b[1];return dx*dx+dy*dy;}
function alignPoints(source:Array<[number,number]>,target:Array<[number,number]>):Array<[number,number]>{
  if(source.length!==target.length||source.length<2)return target.slice();var count=source.length,best=target.slice(),bestScore=Infinity;
  for(var reverse=0;reverse<2;reverse++){var candidate=reverse?target.slice().reverse():target;for(var shift=0;shift<count;shift++){var score=0;for(var i=0;i<count;i+=Math.max(1,Math.floor(count/16))){var point=candidate[(i+shift)%count];if(point)score+=pointDistance(source[i]||source[0]!,point);}if(score<bestScore){bestScore=score;best=[];for(var j=0;j<count;j++)best.push(candidate[(j+shift)%count]||candidate[0]!);}}}
  return best;
}
function path(target:SVGPathElement,toD:string,options:MotionPropertyOptions):MotionHandle{
  var svg=target.ownerSVGElement;if(!svg||!toD){target.setAttribute('d',toD);return delay(0,function(){if(options.onComplete)options.onComplete();});}
  var fromD=target.getAttribute('d')||'',count=64,fromSet=samplePathSet(svg,fromD,count),toSet=samplePathSet(svg,toD,count);
  if(!fromSet||!toSet||!fromSet.length||!toSet.length){return tween(options.duration,options.ease,function(p){if(p>=1)target.setAttribute('d',toD);},{delay:options.delay,onComplete:options.onComplete});}
  var pairCount=Math.max(fromSet.length,toSet.length),pairs:Array<{from:SampledPath;to:SampledPath}>=[];
  for(var pairIndex=0;pairIndex<pairCount;pairIndex++){var source=fromSet[Math.min(pairIndex,fromSet.length-1)]||fromSet[0],dest=toSet[Math.min(pairIndex,toSet.length-1)]||toSet[0];if(!source||!dest)continue;pairs.push({from:source,to:{points:alignPoints(source.points,dest.points),closed:dest.closed}});}
  return tween(options.duration,options.ease,function(p){var d='';pairs.forEach(function(pair){for(var i=0;i<pair.from.points.length;i++){var a=pair.from.points[i],b=pair.to.points[i];if(!a||!b)continue;var x=a[0]+(b[0]-a[0])*p,y=a[1]+(b[1]-a[1])*p;d+=(i===0?'M':'L')+x.toFixed(3)+' '+y.toFixed(3);}if(pair.from.closed||pair.to.closed)d+='Z';});target.setAttribute('d',d);},{delay:options.delay,onComplete:function(){target.setAttribute('d',toD);if(options.onComplete)options.onComplete();}});
}
var engine:MotionEngine={tween:tween,delay:delay,transform:transform,opacity:opacity,attributes:attributes,path:path,currentTransform:currentTransform,ease:easeValue};
var deps:MotionDeps={engine:engine};

function flushQueue(queue:MotionCallback[]):void{var callbacks=queue.splice(0);callbacks.forEach(function(fn){try{fn(deps);}catch(error){console.error('[SushiClub motion]',error);}});}
function whenLoaded(fn:MotionCallback):void{if(typeof fn!=='function')return;fn(deps);}
function whenReady(fn:MotionCallback):void{if(typeof fn!=='function')return;if(unlocked)fn(deps);else readyQueue.push(fn);}
function run(fn:MotionCallback):boolean{if(!unlocked||typeof fn!=='function')return false;fn(deps);return true;}
function runLoaded(fn:MotionCallback):boolean{if(typeof fn!=='function')return false;fn(deps);return true;}
function refresh(delayMs?:number|null):void{if(refreshTimer)clearTimeout(refreshTimer);refreshTimer=window.setTimeout(function(){refreshTimer=0;window.dispatchEvent(new CustomEvent('sc:motionrefresh'));},Math.max(0,delayMs||0));}

/* Hover/foco/presión con la misma rotación y los mismos easings que el runtime anterior. */
function bindMicroInteraction(control:HTMLElement,target:HTMLElement|SVGElement,options?:MicroOptions):()=>void{
  var opts=options||{},activeTween:MotionHandle|null=null,destroyed=false,hover=false,focus=false,pressed=false;
  function focusVisible():boolean{try{return control.matches(':focus-visible');}catch(_){return document.activeElement===control;}}
  function kill():void{if(activeTween){activeTween.cancel();activeTween=null;}}
  function angle(kind:'active'|'press'):number{var source=opts[kind],value=source&&Number(source.rotation);if(Number.isFinite(value)&&value)return value;return kind==='press'?-6:12;}
  function clear():void{target.style.removeProperty('transform');target.style.removeProperty('will-change');}
  function move(rotation:number,duration:number,ease:string,clearAtEnd:boolean):void{if(destroyed)return;kill();if(reduced()){clear();return;}target.style.transformOrigin=opts.transformOrigin||'50% 50%';activeTween=engine.transform(target,{rotation:rotation},{duration:duration,ease:ease,onComplete:function(){activeTween=null;if(clearAtEnd)clear();}});}
  function active():void{move(angle('active'),opts.enterDuration==null?.1:opts.enterDuration,opts.enterEase||'quart.out',false);}
  function home():void{move(0,opts.exitDuration==null?.14:opts.exitDuration,opts.exitEase||'quart.out',true);}
  function press():void{if(destroyed)return;kill();if(reduced()){clear();return;}var returnAngle=(hover||focus)?angle('active'):0;activeTween=engine.transform(target,{rotation:angle('press')},{duration:opts.pressDuration==null?.055:opts.pressDuration,ease:'cubic.out',onComplete:function(){activeTween=engine.transform(target,{rotation:returnAngle},{duration:opts.pressReturnDuration==null?.085:opts.pressReturnDuration,ease:'quart.out',onComplete:function(){activeTween=null;if(returnAngle===0)clear();}});}});}
  function pointerEnter(event:PointerEvent):void{if(event.pointerType==='touch')return;if(!hover){hover=true;if(!pressed)active();}}
  function pointerLeave():void{hover=false;pressed=false;if(focus)active();else home();}
  function pointerDown():void{pressed=true;press();}
  function pointerUp():void{pressed=false;if(hover||focus)active();else home();}
  function focusIn():void{var visible=focusVisible();if(visible&&!focus){focus=true;if(!pressed)active();}}
  function focusOut():void{focus=false;pressed=false;if(hover)active();else home();}
  function keyDown(event:KeyboardEvent):void{if(event.repeat||(event.key!=='Enter'&&event.key!==' '))return;pressed=true;press();}
  function keyUp(event:KeyboardEvent):void{if(event.key!=='Enter'&&event.key!==' ')return;pressed=false;if(hover||focus)active();else home();}
  control.addEventListener('pointerenter',pointerEnter);control.addEventListener('pointerleave',pointerLeave);control.addEventListener('pointerdown',pointerDown);control.addEventListener('pointerup',pointerUp);control.addEventListener('pointercancel',pointerLeave);control.addEventListener('focus',focusIn);control.addEventListener('blur',focusOut);control.addEventListener('keydown',keyDown);control.addEventListener('keyup',keyUp);
  return function(){if(destroyed)return;destroyed=true;control.removeEventListener('pointerenter',pointerEnter);control.removeEventListener('pointerleave',pointerLeave);control.removeEventListener('pointerdown',pointerDown);control.removeEventListener('pointerup',pointerUp);control.removeEventListener('pointercancel',pointerLeave);control.removeEventListener('focus',focusIn);control.removeEventListener('blur',focusOut);control.removeEventListener('keydown',keyDown);control.removeEventListener('keyup',keyUp);kill();clear();};
}

var dependencyPromise=Promise.resolve(deps);flushQueue(loadedQueue);
function ready():Promise<MotionDeps>{return dependencyPromise;}
function prepare():Promise<MotionDeps>{return dependencyPromise;}
function unlock():void{if(unlocked)return;unlocked=true;flushQueue(readyQueue);refresh(0);}
SC.motion={ready:ready,prepare:prepare,whenLoaded:whenLoaded,whenReady:whenReady,run:run,runLoaded:runLoaded,refresh:refresh,reduced:reduced,bindMicroInteraction:bindMicroInteraction,unlock:unlock,isReady:function(){return unlocked;},isLoaded:function(){return true;}};
})();
