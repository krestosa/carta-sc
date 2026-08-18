(function(){
'use strict';

var SC=window.SCOverride,CFG=SC&&SC.config,C=SC&&SC.catalogTools;
if(!SC||!CFG||SC.__catalogToolsViewBooted)return;
SC.__catalogToolsViewBooted=true;

/* Vista activa, storage y estado de transición. */
var MODES=['compact','list'],STORE_KEY='scCatalogView:v3',doc=document.documentElement,phone=CFG.queries.phone,tablet=CFG.queries.compactWide,raf=0,settleTimer=0,cleanup=null,motionDeps=null;

/* Resuelve modo y cantidad de columnas por breakpoint. */
function context(){return phone.matches?'phone':tablet.matches?'tablet':'desktop';}
function normalize(mode){if(mode==='normal')return'compact';return MODES.indexOf(mode)>=0?mode:'';}
function selectedMode(){return normalize(doc.getAttribute('data-sc-catalog-view')||'')||'compact';}
function legacyMode(mode){return mode==='list'?'list':mode?'compact':'';}
function columns(){var ctx=context();return ctx==='phone'?2:ctx==='tablet'?3:4;}
function effectiveMode(mode){return normalize(mode)||'compact';}
function label(mode){var effective=effectiveMode(mode),count;if(effective==='list')return'Vista lista. Cambiar a grilla de alta densidad';count=columns();return'Vista grilla de alta densidad: '+count+' '+(count===1?'columna':'columnas')+'. Cambiar a vista lista';}
function iconKey(mode){return effectiveMode(mode)==='list'?'list':'grid';}

/* Migra claves viejas y persiste solo la vista actual. */
function load(){var mode=normalize(doc.getAttribute('data-sc-catalog-view')||''),ctx=context(),legacy='';if(mode)return mode;try{mode=normalize(localStorage.getItem(STORE_KEY)||'');if(!mode){legacy=localStorage.getItem('scCatalogView:v2:'+ctx)||localStorage.getItem(ctx==='desktop'?'scCatalogView:desktop':'scCatalogView:mobile')||'';mode=legacyMode(legacy);if(mode){try{localStorage.setItem(STORE_KEY,mode);}catch(_){}}}}catch(_){mode='';}return mode||'compact';}
function save(mode){try{localStorage.setItem(STORE_KEY,mode);}catch(_){} }
function reducedMotion(){return!!(CFG.queries&&CFG.queries.reducedMotion&&CFG.queries.reducedMotion.matches);}

/* Prepara paths vivos y targets del icono. */
function livePaths(host){return host?Array.prototype.slice.call(host.querySelectorAll('[data-sc-view-shape]')):[];}
function targetPaths(host,key){var live=livePaths(host);return live.map(function(_,index){return host.querySelector('[data-sc-view-target="'+key+'-'+index+'"]');});}
function ensureHostPresentation(host){
  if(!host)return;
  host.style.setProperty('display','block','important');
  host.style.setProperty('visibility','visible','important');
  host.style.setProperty('color','var(--sc-color-ink,#0a0a0a)','important');
  host.style.setProperty('fill','var(--sc-color-ink,#0a0a0a)','important');
  var liveGroup=host.querySelector('[data-sc-view-live]');
  if(liveGroup){liveGroup.style.setProperty('display','inline','important');liveGroup.style.setProperty('visibility','visible','important');}
  var targets=host.querySelector('.sc-view-morph-targets');
  if(targets){targets.style.setProperty('visibility','hidden','important');targets.style.setProperty('opacity','0','important');targets.style.setProperty('pointer-events','none','important');}
  livePaths(host).forEach(function(path){path.style.setProperty('display','inline','important');path.style.setProperty('visibility','visible','important');path.style.setProperty('fill','var(--sc-color-ink,#0a0a0a)','important');});
}
function initMorph(host){
  if(!host)return false;
  ensureHostPresentation(host);
  if(host.__scViewMorphReady)return true;
  var plugin=motionDeps&&motionDeps.MorphSVGPlugin;
  if(!plugin)return false;
  var shapes=Array.prototype.slice.call(host.querySelectorAll('[data-sc-view-shape],[data-sc-view-target]'));
  shapes.forEach(function(shape){if(shape.tagName&&shape.tagName.toLowerCase()!=='path')plugin.convertToPath(shape);});
  host.__scViewMorphReady=true;
  ensureHostPresentation(host);
  return true;
}

/* Cancela un morph anterior antes de retargetear. */
function clearViewIconMotion(host){
  if(!host)return;
  var state=host.__scViewIconMotion;
  if(state&&state.timeline)try{state.timeline.kill();}catch(_){}
  host.__scViewIconMotion=null;
  host.removeAttribute('data-sc-view-icon-animating');
  ensureHostPresentation(host);
}
function setMorphState(host,key){
  if(!host)return;
  ensureHostPresentation(host);
  if(!initMorph(host)){host.setAttribute('data-sc-icon-state',key);return;}
  clearViewIconMotion(host);
  var live=livePaths(host),targets=targetPaths(host,key);
  live.forEach(function(path,index){var target=targets[index];if(target)path.setAttribute('d',target.getAttribute('d'));});
  host.setAttribute('data-sc-icon-state',key);
}

/* Anima grilla/lista con MorphSVG. */
function animateMorph(host,from,to){
  if(!host||from===to){if(host){host.setAttribute('data-sc-icon-state',to);ensureHostPresentation(host);}return;}
  if(!initMorph(host)||!motionDeps||!motionDeps.gsap||!motionDeps.MorphSVGPlugin){setMorphState(host,to);return;}
  clearViewIconMotion(host);
  var gsap=motionDeps.gsap,live=livePaths(host),targets=targetPaths(host,to),short=reducedMotion(),duration=short?.1:.19,ease=short?'power1.inOut':'power2.inOut',state={timeline:null};
  if(!live.length||targets.some(function(target){return!target;})){setMorphState(host,to);return;}

  host.setAttribute('data-sc-icon-state',to);
  host.setAttribute('data-sc-view-icon-animating','true');
  host.__scViewIconMotion=state;
  state.timeline=gsap.timeline({onComplete:function(){if(host.__scViewIconMotion!==state)return;host.__scViewIconMotion=null;host.removeAttribute('data-sc-view-icon-animating');ensureHostPresentation(host);}});
  live.forEach(function(path,index){
    state.timeline.to(path,{duration:duration,ease:ease,morphSVG:{shape:targets[index]},overwrite:'auto'},short?0:Math.floor(index/2)*.008);
  });
}

/* Sincroniza label accesible e icono con la vista. */
function sync(root,mode,animate){
  var button=root&&root.querySelector('.sc-catalog-view-toggle'),host=button&&button.querySelector('[data-sc-view-icon]'),key=iconKey(mode),text=label(mode),previous=host&&host.getAttribute('data-sc-icon-state');
  if(button){button.setAttribute('aria-label',text);button.setAttribute('title',text);button.style.setProperty('visibility','visible','important');button.style.setProperty('color','var(--sc-color-ink,#0a0a0a)','important');}
  if(!host)return;
  ensureHostPresentation(host);
  if(previous===key)return;
  if(animate!==false&&previous)animateMorph(host,previous,key);else setMorphState(host,key);
}

/* Añade respuesta sutil a hover, foco y presión. */
function bindViewMicroInteraction(button,host){
  if(!button||!host||!motionDeps||!motionDeps.gsap)return function(){};
  var gsap=motionDeps.gsap,paths=livePaths(host),hover=false,focus=false,pressed=false,destroyed=false;
  if(paths.length!==6)return function(){};
  var hoverOffsets=[[.58,.38],[-.58,.38],[.58,0],[-.58,0],[.58,-.38],[-.58,-.38]],pressOffsets=[[.82,.52],[-.82,.52],[.82,0],[-.82,0],[.82,-.52],[-.82,-.52]];
  function focusVisible(){try{return button.matches(':focus-visible');}catch(_){return document.activeElement===button;}}
  function stop(){gsap.killTweensOf(paths,'x,y');}
  function apply(offsets,duration,ease){
    if(destroyed)return;stop();
    if(reducedMotion()){gsap.set(paths,{x:0,y:0,clearProps:'willChange'});return;}
    paths.forEach(function(path,index){var o=offsets[index];gsap.to(path,{x:o[0],y:o[1],duration:duration,ease:ease,overwrite:'auto',force3D:true,willChange:'transform',delay:index*.004,onComplete:function(){path.style.removeProperty('will-change');}});});
  }
  function active(){apply(hoverOffsets,.068,'power3.out');}
  function home(){apply([[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]],.09,'power3.out');}
  function press(){apply(pressOffsets,.042,'power2.out');}
  function enter(e){if(e.pointerType==='touch')return;hover=true;if(!pressed)active();}
  function leave(){hover=false;pressed=false;if(focus)active();else home();}
  function down(){pressed=true;press();}
  function up(){pressed=false;if(hover||focus)active();else home();}
  function focusIn(){if(focusVisible()){focus=true;if(!pressed)active();}}
  function focusOut(){focus=false;pressed=false;if(hover)active();else home();}
  function keyDown(e){if(e.repeat||(e.key!=='Enter'&&e.key!==' '))return;pressed=true;press();}
  function keyUp(e){if(e.key!=='Enter'&&e.key!==' ')return;pressed=false;if(hover||focus)active();else home();}
  button.addEventListener('pointerenter',enter);button.addEventListener('pointerleave',leave);button.addEventListener('pointerdown',down);button.addEventListener('pointerup',up);button.addEventListener('pointercancel',leave);button.addEventListener('focus',focusIn);button.addEventListener('blur',focusOut);button.addEventListener('keydown',keyDown);button.addEventListener('keyup',keyUp);
  return function(){if(destroyed)return;destroyed=true;button.removeEventListener('pointerenter',enter);button.removeEventListener('pointerleave',leave);button.removeEventListener('pointerdown',down);button.removeEventListener('pointerup',up);button.removeEventListener('pointercancel',leave);button.removeEventListener('focus',focusIn);button.removeEventListener('blur',focusOut);button.removeEventListener('keydown',keyDown);button.removeEventListener('keyup',keyUp);stop();gsap.set(paths,{x:0,y:0,clearProps:'transform,willChange'});};
}

/* Recalcula medidas después del cambio de vista. */
function refreshMotionNow(){if(SC.motion&&SC.motion.run)SC.motion.run(function(deps){if(deps&&deps.ScrollTrigger)deps.ScrollTrigger.refresh();});}
function syncMounted(){var root=document.querySelector('.sc-catalog-tools');if(root)sync(root,selectedMode(),false);}
function refreshLayout(switching){
  syncMounted();
  if(raf)cancelAnimationFrame(raf);
  if(settleTimer){clearTimeout(settleTimer);settleTimer=0;}
  raf=requestAnimationFrame(function(){
    raf=requestAnimationFrame(function(){
      raf=0;
      if(SC.productCardContent&&SC.productCardContent.scheduleDescriptionMeasure)SC.productCardContent.scheduleDescriptionMeasure();
      refreshMotionNow();
      if(switching){settleTimer=window.setTimeout(function(){settleTimer=0;doc.classList.remove('sc-catalog-view-switching');},80);}
    });
  });
}

/* Aplica y, si corresponde, persiste la vista elegida. */
function apply(root,mode,persist){mode=normalize(mode)||'compact';if(persist)doc.classList.add('sc-catalog-view-switching');doc.setAttribute('data-sc-catalog-view',mode);document.body.setAttribute('data-sc-catalog-view',mode);root.setAttribute('data-sc-view',mode);sync(root,mode,persist);if(persist)save(mode);refreshLayout(!!persist);}
function destroy(){var host=document.querySelector('.sc-catalog-view-toggle [data-sc-view-icon]');if(host)clearViewIconMotion(host);if(raf){cancelAnimationFrame(raf);raf=0;}if(settleTimer){clearTimeout(settleTimer);settleTimer=0;}doc.classList.remove('sc-catalog-view-switching');if(cleanup){var fn=cleanup;cleanup=null;fn();}}

/* Instala toggle y escucha cambios de breakpoint. */
function install(root){
  destroy();
  var button=root&&root.querySelector('.sc-catalog-view-toggle'),host=button&&button.querySelector('[data-sc-view-icon]');
  if(!button||!host)return function(){};
  button.style.setProperty('visibility','visible','important');button.style.setProperty('color','var(--sc-color-ink,#0a0a0a)','important');
  ensureHostPresentation(host);initMorph(host);apply(root,load(),false);
  var microCleanup=bindViewMicroInteraction(button,host);
  function click(){var current=selectedMode();apply(root,current==='compact'?'list':'compact',true);}
  function breakpoint(){refreshLayout(false);}
  button.addEventListener('click',click);
  if(phone.addEventListener)phone.addEventListener('change',breakpoint);else phone.addListener(breakpoint);
  if(tablet.addEventListener)tablet.addEventListener('change',breakpoint);else tablet.addListener(breakpoint);
  cleanup=function(){microCleanup();button.removeEventListener('click',click);if(phone.removeEventListener)phone.removeEventListener('change',breakpoint);else phone.removeListener(breakpoint);if(tablet.removeEventListener)tablet.removeEventListener('change',breakpoint);else tablet.removeListener(breakpoint);};
  var ownCleanup=cleanup;return function(){if(cleanup===ownCleanup)destroy();};
}

/* Habilita morph cuando GSAP termina de cargar. */
if(SC.motion&&typeof SC.motion.whenLoaded==='function')SC.motion.whenLoaded(function(deps){motionDeps=deps;});else if(SC.motion&&typeof SC.motion.whenReady==='function')SC.motion.whenReady(function(deps){motionDeps=deps;});
C.view={install:install,apply:apply,refreshLayout:refreshLayout,sync:syncMounted,destroy:destroy};
})();
