(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.catalogTools;if(!SC||!C||SC.__catalogStateMotionBooted)return;SC.__catalogStateMotionBooted=true;

/* Respuesta de presión compartida por controles y filtros. */
var PRESS_GROW=.45,MIN_PRESS=.225,TOUCH_DELAY=.15,ORIGIN_SCALE=.2,PADDING=10,SOFT_MIN=75,SOFT_RATIO=.35;
function disabled(node){return!!(node.disabled||node.getAttribute('aria-disabled')==='true');}
function bind(control,gsap){
  if(!control||!gsap)return function(){};
  var surface=document.createElement('span'),wave=document.createElement('span'),state='idle',pressEvent=null,touchTimer=0,endTimer=0,grow=null,fade=null,startAt=0,token=0,destroyed=false;
  surface.className='sc-motion-state-surface';surface.setAttribute('aria-hidden','true');wave.className='sc-motion-state-wave';surface.appendChild(wave);control.insertBefore(surface,control.firstChild);control.classList.add('sc-motion-state-host');
  function clearTimer(){if(touchTimer){clearTimeout(touchTimer);touchTimer=0;}if(endTimer){clearTimeout(endTimer);endTimer=0;}}
  function stop(){if(grow){grow.kill();grow=null;}if(fade){fade.kill();fade=null;}}
  function reset(){stop();gsap.set(wave,{clearProps:'width,height,x,y,scale,opacity,willChange'});}
  function geometry(event){
    var rect=surface.getBoundingClientRect(),width=rect.width,height=rect.height,maxDim=Math.max(width,height),initial=Math.max(1,Math.floor(maxDim*ORIGIN_SCALE)),soft=Math.max(SOFT_RATIO*maxDim,SOFT_MIN),radius=Math.sqrt(width*width+height*height)+PADDING,scale=(radius+soft)/initial,px=width/2,py=height/2;
    if(event&&typeof event.clientX==='number'){px=event.clientX-rect.left;py=event.clientY-rect.top;}
    return{size:initial,scale:scale,startX:px-initial/2,startY:py-initial/2,endX:(width-initial)/2,endY:(height-initial)/2};
  }
  function start(event){
    if(destroyed||disabled(control)||SC.motion.reduced())return;var id=++token,g=geometry(event),ease=SC.motion.curve('standard');stop();startAt=performance.now()/1000;
    gsap.set(wave,{width:g.size,height:g.size,x:g.startX,y:g.startY,scale:1,opacity:.12,willChange:'transform,opacity'});
    grow=gsap.to(wave,{x:g.endX,y:g.endY,scale:g.scale,duration:PRESS_GROW,ease:ease,overwrite:'auto',force3D:true,onComplete:function(){if(id===token)grow=null;}});
  }
  function finish(){
    if(destroyed||!startAt)return;var id=token,elapsed=performance.now()/1000-startAt,wait=Math.max(0,MIN_PRESS-elapsed);if(endTimer)clearTimeout(endTimer);
    endTimer=setTimeout(function(){endTimer=0;if(id!==token||destroyed)return;fade=gsap.to(wave,{opacity:0,duration:.15,ease:SC.motion.curve('standard'),overwrite:'auto',onComplete:function(){if(id!==token)return;fade=null;startAt=0;reset();}});},wait*1000);
  }
  function pointerDown(event){
    if(disabled(control)||event.isPrimary===false)return;pressEvent=event;if(event.pointerType!=='touch'){state='waiting';start(event);return;}state='touch';clearTimer();touchTimer=setTimeout(function(){touchTimer=0;if(state!=='touch')return;state='holding';start(event);},TOUCH_DELAY*1000);
  }
  function pointerUp(){if(state==='holding'){state='waiting';return;}if(state==='touch'){if(touchTimer){clearTimeout(touchTimer);touchTimer=0;}state='waiting';start(pressEvent);}}
  function click(){if(disabled(control))return;if(state==='waiting'){state='idle';finish();return;}if(state==='idle'){start(null);finish();}}
  function cancel(){clearTimer();if(state!=='idle'){state='idle';finish();}}
  function leave(event){if(event.pointerType==='touch')return;if(state!=='idle'){state='idle';finish();}}
  control.addEventListener('pointerdown',pointerDown);control.addEventListener('pointerup',pointerUp);control.addEventListener('pointercancel',cancel);control.addEventListener('pointerleave',leave);control.addEventListener('contextmenu',cancel);control.addEventListener('click',click);
  return function(){if(destroyed)return;destroyed=true;clearTimer();control.removeEventListener('pointerdown',pointerDown);control.removeEventListener('pointerup',pointerUp);control.removeEventListener('pointercancel',cancel);control.removeEventListener('pointerleave',leave);control.removeEventListener('contextmenu',cancel);control.removeEventListener('click',click);reset();control.classList.remove('sc-motion-state-host');if(surface.parentNode)surface.parentNode.removeChild(surface);};
}
function install(root){
  var alive=true,cleaners=[];
  function mount(deps){if(!alive||!deps||!deps.gsap)return;cleaners.splice(0).forEach(function(fn){fn();});var selector='.sc-theme-toggle,.sc-catalog-view-toggle,.sc-theme-option,.sc-filter-chip';[].slice.call(root.querySelectorAll(selector)).forEach(function(node){cleaners.push(bind(node,deps.gsap));});}
  if(!(SC.motion&&SC.motion.runLoaded&&SC.motion.runLoaded(mount))&&SC.motion&&SC.motion.whenLoaded)SC.motion.whenLoaded(mount);
  return function(){alive=false;cleaners.splice(0).forEach(function(fn){fn();});};
}
C.stateMotion={install:install};
})();
