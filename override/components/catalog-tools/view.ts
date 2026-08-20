(function(){
'use strict';

var SC=window.SCOverride,CFG=SC&&SC.config,C=SC&&SC.catalogTools;
if(!SC||!CFG||SC.__catalogToolsViewBooted)return;
SC.__catalogToolsViewBooted=true;

type CatalogViewMode='compact'|'list';
type CatalogViewContext='phone'|'tablet'|'desktop';
type ViewIconKey='grid'|'list';
type OffsetPair=readonly [number,number];
type ViewIconHost=SVGElement;

var MODES:readonly CatalogViewMode[]=['compact','list'];
var STORE_KEY='scCatalogView:v3';
var doc=document.documentElement;
var phone=CFG.queries.phone;
var tablet=CFG.queries.compactWide;
var raf=0;
var settleTimer=0;
var cleanup:(()=>void)|null=null;
var motionDeps:MotionDeps|null=null;
var NATIVE_SHAPE_ATTRS=['x','y','width','height','rx','ry'] as const;

function context():CatalogViewContext{return phone.matches?'phone':tablet.matches?'tablet':'desktop';}
function normalize(mode:string):CatalogViewMode|''{if(mode==='normal')return'compact';return mode==='compact'||mode==='list'?mode:'';}
function selectedMode():CatalogViewMode{return normalize(doc.getAttribute('data-sc-catalog-view')||'')||'compact';}
function legacyMode(mode:string):CatalogViewMode|''{return mode==='list'?'list':mode?'compact':'';}
function columns():number{var ctx=context();return ctx==='phone'?2:ctx==='tablet'?3:4;}
function effectiveMode(mode:string):CatalogViewMode{return normalize(mode)||'compact';}
function label(mode:string):string{var effective=effectiveMode(mode),count;if(effective==='list')return'Vista lista. Cambiar a grilla de alta densidad';count=columns();return'Vista grilla de alta densidad: '+count+' '+(count===1?'columna':'columnas')+'. Cambiar a vista lista';}
function iconKey(mode:string):ViewIconKey{return effectiveMode(mode)==='list'?'list':'grid';}

function load():CatalogViewMode{var mode=normalize(doc.getAttribute('data-sc-catalog-view')||''),ctx=context(),legacy='';if(mode)return mode;try{mode=normalize(localStorage.getItem(STORE_KEY)||'');if(!mode){legacy=localStorage.getItem('scCatalogView:v2:'+ctx)||localStorage.getItem(ctx==='desktop'?'scCatalogView:desktop':'scCatalogView:mobile')||'';mode=legacyMode(legacy);if(mode){try{localStorage.setItem(STORE_KEY,mode);}catch(_){}}}}catch(_){mode='';}return mode||'compact';}
function save(mode:CatalogViewMode):void{try{localStorage.setItem(STORE_KEY,mode);}catch(_){} }
function reducedMotion():boolean{return!!(CFG.queries&&CFG.queries.reducedMotion&&CFG.queries.reducedMotion.matches);}

function livePaths(host:ViewIconHost|null):SVGGraphicsElement[]{return host?Array.from(host.querySelectorAll<SVGGraphicsElement>('[data-sc-view-shape]')):[];}
function targetPaths(host:ViewIconHost,key:ViewIconKey):(SVGGraphicsElement|null)[]{return livePaths(host).map(function(_,index){return host.querySelector<SVGGraphicsElement>('[data-sc-view-target="'+key+'-'+index+'"]');});}
function setNativeShapeState(host:ViewIconHost,key:ViewIconKey):void{
  var live=livePaths(host),targets=targetPaths(host,key);
  live.forEach(function(shape,index){var target=targets[index];if(!target)return;var targetNode=target;NATIVE_SHAPE_ATTRS.forEach(function(attr){var value=targetNode.getAttribute(attr);if(value===null)shape.removeAttribute(attr);else shape.setAttribute(attr,value);});});
}
function ensureHostPresentation(host:ViewIconHost|null):void{
  if(!host)return;
  host.style.setProperty('display','block','important');
  host.style.setProperty('visibility','visible','important');
  host.style.setProperty('color','var(--sc-color-ink,#0a0a0a)','important');
  host.style.setProperty('fill','var(--sc-color-ink,#0a0a0a)','important');
  var liveGroup=host.querySelector<SVGElement>('[data-sc-view-live]');
  if(liveGroup){liveGroup.style.setProperty('display','inline','important');liveGroup.style.setProperty('visibility','visible','important');}
  var targets=host.querySelector<SVGElement>('.sc-view-morph-targets');
  if(targets){targets.style.setProperty('visibility','hidden','important');targets.style.setProperty('opacity','0','important');targets.style.setProperty('pointer-events','none','important');}
  livePaths(host).forEach(function(path){path.style.setProperty('display','inline','important');path.style.setProperty('visibility','visible','important');path.style.setProperty('fill','var(--sc-color-ink,#0a0a0a)','important');});
}
function initMorph(host:ViewIconHost|null):boolean{
  if(!host)return false;
  ensureHostPresentation(host);
  if(host.__scViewMorphReady)return true;
  var plugin=motionDeps&&motionDeps.MorphSVGPlugin;
  if(!plugin)return false;
  var morphPlugin=plugin;
  Array.from(host.querySelectorAll<SVGGraphicsElement>('[data-sc-view-shape],[data-sc-view-target]')).forEach(function(shape){if(shape.tagName.toLowerCase()!=='path')morphPlugin.convertToPath(shape);});
  host.__scViewMorphReady=true;
  ensureHostPresentation(host);
  return true;
}

function clearViewIconMotion(host:ViewIconHost|null):void{
  if(!host)return;
  var state=host.__scViewIconMotion;
  if(state&&state.timeline)try{state.timeline.kill();}catch(_){}
  host.__scViewIconMotion=null;
  host.removeAttribute('data-sc-view-icon-animating');
  ensureHostPresentation(host);
}
function setMorphState(host:ViewIconHost,key:ViewIconKey):void{
  ensureHostPresentation(host);
  if(!initMorph(host)){setNativeShapeState(host,key);host.setAttribute('data-sc-icon-state',key);return;}
  clearViewIconMotion(host);
  var live=livePaths(host),targets=targetPaths(host,key);
  live.forEach(function(path,index){var target=targets[index];if(target){var d=target.getAttribute('d');if(d!==null)path.setAttribute('d',d);}});
  host.setAttribute('data-sc-icon-state',key);
}

function animateMorph(host:ViewIconHost|null,from:ViewIconKey,to:ViewIconKey):void{
  if(!host||from===to){if(host){host.setAttribute('data-sc-icon-state',to);ensureHostPresentation(host);}return;}
  if(!initMorph(host)||!motionDeps||!motionDeps.MorphSVGPlugin){setMorphState(host,to);return;}
  clearViewIconMotion(host);
  var gsap=motionDeps.gsap,live=livePaths(host),targets=targetPaths(host,to),short=reducedMotion(),duration=short?.1:.19,ease=short?'power1.inOut':'power2.inOut';
  var state:ViewIconMotionState={timeline:null};
  if(!live.length||targets.some(function(target){return!target;})){setMorphState(host,to);return;}
  host.setAttribute('data-sc-icon-state',to);
  host.setAttribute('data-sc-view-icon-animating','true');
  host.__scViewIconMotion=state;
  state.timeline=gsap.timeline({onComplete:function(){if(host.__scViewIconMotion!==state)return;host.__scViewIconMotion=null;host.removeAttribute('data-sc-view-icon-animating');ensureHostPresentation(host);}});
  var timeline=state.timeline;
  live.forEach(function(path,index){timeline.to(path,{duration:duration,ease:ease,morphSVG:{shape:targets[index]},overwrite:'auto'},short?0:Math.floor(index/2)*.008);});
}

function sync(root:HTMLElement|null,mode:string,animate?:boolean):void{
  var button=root&&root.querySelector<HTMLButtonElement>('.sc-catalog-view-toggle'),host=button&&button.querySelector<ViewIconHost>('[data-sc-view-icon]'),key=iconKey(mode),text=label(mode),previous=host&&host.getAttribute('data-sc-icon-state');
  if(button){button.setAttribute('aria-label',text);button.setAttribute('title',text);button.style.setProperty('visibility','visible','important');button.style.setProperty('color','var(--sc-color-ink,#0a0a0a)','important');}
  if(!host)return;
  ensureHostPresentation(host);
  if(previous===key)return;
  if(animate!==false&&(previous==='grid'||previous==='list'))animateMorph(host,previous,key);else setMorphState(host,key);
}

function bindViewMicroInteraction(button:HTMLButtonElement,host:ViewIconHost):()=>void{
  if(!motionDeps)return function(){};
  var gsap=motionDeps.gsap,paths=livePaths(host),hover=false,focus=false,pressed=false,destroyed=false;
  if(paths.length!==6)return function(){};
  var hoverOffsets:OffsetPair[]=[[.58,.38],[-.58,.38],[.58,0],[-.58,0],[.58,-.38],[-.58,-.38]],pressOffsets:OffsetPair[]=[[.82,.52],[-.82,.52],[.82,0],[-.82,0],[.82,-.52],[-.82,-.52]],homeOffsets:OffsetPair[]=[[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]];
  function focusVisible():boolean{try{return button.matches(':focus-visible');}catch(_){return document.activeElement===button;}}
  function stop():void{gsap.killTweensOf(paths,'x,y');}
  function apply(offsets:readonly OffsetPair[],duration:number,ease:string):void{
    if(destroyed)return;stop();
    if(reducedMotion()){gsap.set(paths,{x:0,y:0,clearProps:'willChange'});return;}
    paths.forEach(function(path,index){var o=offsets[index]||[0,0];gsap.to(path,{x:o[0],y:o[1],duration:duration,ease:ease,overwrite:'auto',force3D:true,willChange:'transform',delay:index*.004,onComplete:function(){path.style.removeProperty('will-change');}});});
  }
  function active():void{apply(hoverOffsets,.068,'power3.out');}
  function home():void{apply(homeOffsets,.09,'power3.out');}
  function press():void{apply(pressOffsets,.042,'power2.out');}
  function enter(e:PointerEvent):void{if(e.pointerType==='touch')return;hover=true;if(!pressed)active();}
  function leave():void{hover=false;pressed=false;if(focus)active();else home();}
  function down():void{pressed=true;press();}
  function up():void{pressed=false;if(hover||focus)active();else home();}
  function focusIn():void{if(focusVisible()){focus=true;if(!pressed)active();}}
  function focusOut():void{focus=false;pressed=false;if(hover)active();else home();}
  function keyDown(e:KeyboardEvent):void{if(e.repeat||(e.key!=='Enter'&&e.key!==' '))return;pressed=true;press();}
  function keyUp(e:KeyboardEvent):void{if(e.key!=='Enter'&&e.key!==' ')return;pressed=false;if(hover||focus)active();else home();}
  button.addEventListener('pointerenter',enter);button.addEventListener('pointerleave',leave);button.addEventListener('pointerdown',down);button.addEventListener('pointerup',up);button.addEventListener('pointercancel',leave);button.addEventListener('focus',focusIn);button.addEventListener('blur',focusOut);button.addEventListener('keydown',keyDown);button.addEventListener('keyup',keyUp);
  return function(){if(destroyed)return;destroyed=true;button.removeEventListener('pointerenter',enter);button.removeEventListener('pointerleave',leave);button.removeEventListener('pointerdown',down);button.removeEventListener('pointerup',up);button.removeEventListener('pointercancel',leave);button.removeEventListener('focus',focusIn);button.removeEventListener('blur',focusOut);button.removeEventListener('keydown',keyDown);button.removeEventListener('keyup',keyUp);stop();gsap.set(paths,{x:0,y:0,clearProps:'transform,willChange'});};
}

function refreshMotionNow():void{if(SC.motion&&SC.motion.run)SC.motion.run(function(deps:MotionDeps){if(deps.ScrollTrigger)deps.ScrollTrigger.refresh();});}
function syncMounted():void{var root=document.querySelector<HTMLElement>('.sc-catalog-tools');if(root)sync(root,selectedMode(),false);}
function refreshLayout(switching:boolean):void{
  syncMounted();
  if(raf)cancelAnimationFrame(raf);
  if(settleTimer){clearTimeout(settleTimer);settleTimer=0;}
  raf=requestAnimationFrame(function(){raf=requestAnimationFrame(function(){raf=0;if(SC.productCardContent&&SC.productCardContent.scheduleDescriptionMeasure)SC.productCardContent.scheduleDescriptionMeasure();refreshMotionNow();if(switching){settleTimer=window.setTimeout(function(){settleTimer=0;doc.classList.remove('sc-catalog-view-switching');},80);}});});
}

function apply(root:HTMLElement,mode:string,persist:boolean):void{var normalized=normalize(mode)||'compact';if(persist)doc.classList.add('sc-catalog-view-switching');doc.setAttribute('data-sc-catalog-view',normalized);document.body.setAttribute('data-sc-catalog-view',normalized);root.setAttribute('data-sc-view',normalized);sync(root,normalized,persist);if(persist)save(normalized);refreshLayout(persist);}
function destroy():void{var host=document.querySelector<ViewIconHost>('.sc-catalog-view-toggle [data-sc-view-icon]');if(host)clearViewIconMotion(host);if(raf){cancelAnimationFrame(raf);raf=0;}if(settleTimer){clearTimeout(settleTimer);settleTimer=0;}doc.classList.remove('sc-catalog-view-switching');if(cleanup){var fn=cleanup;cleanup=null;fn();}}

function install(root:HTMLElement):()=>void{
  destroy();
  var button=root.querySelector<HTMLButtonElement>('.sc-catalog-view-toggle'),host=button&&button.querySelector<ViewIconHost>('[data-sc-view-icon]');
  if(!button||!host)return function(){};
  button.style.setProperty('visibility','visible','important');button.style.setProperty('color','var(--sc-color-ink,#0a0a0a)','important');
  ensureHostPresentation(host);initMorph(host);apply(root,load(),false);
  var microCleanup=bindViewMicroInteraction(button,host);
  function click():void{var current=selectedMode();apply(root,current==='compact'?'list':'compact',true);}
  function breakpoint():void{refreshLayout(false);}
  button.addEventListener('click',click);
  if(phone.addEventListener)phone.addEventListener('change',breakpoint);else phone.addListener(breakpoint);
  if(tablet.addEventListener)tablet.addEventListener('change',breakpoint);else tablet.addListener(breakpoint);
  var mountedButton=button;cleanup=function(){microCleanup();mountedButton.removeEventListener('click',click);if(phone.removeEventListener)phone.removeEventListener('change',breakpoint);else phone.removeListener(breakpoint);if(tablet.removeEventListener)tablet.removeEventListener('change',breakpoint);else tablet.removeListener(breakpoint);};
  var ownCleanup=cleanup;return function(){if(cleanup===ownCleanup)destroy();};
}

if(SC.motion&&typeof SC.motion.whenLoaded==='function')SC.motion.whenLoaded(function(deps:MotionDeps){motionDeps=deps;});else if(SC.motion&&typeof SC.motion.whenReady==='function')SC.motion.whenReady(function(deps:MotionDeps){motionDeps=deps;});
C.view={install:install,apply:apply,refreshLayout:refreshLayout,sync:syncMounted,destroy:destroy};
})();