/* Transforma la imagen de origen en el contenedor de detalle y revierte la misma relación al cerrar. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,MS=SC&&SC.productModalSelectors,T=SC&&SC.transitionPatterns;
if(!SC||!C||!MS||SC.__productModalMotionBooted)return;SC.__productModalMotionBooted=true;

var OPEN=.50,CLOSE=.40,SCRIM=0x52/255,ENTER_FADE=[0,.25],RETURN_FADE=[.60,.90],ENTER_MASK=[0,1],RETURN_MASK=[0,.90],ENTER_SHAPE=[0,.75],RETURN_SHAPE=[.30,.90],states=new WeakMap();

function valid(value){return T&&T.validRect?T.validRect(value):!!(value&&value.width>0&&value.height>0);}
function getRect(node){return T&&T.rect?T.rect(node):node&&node.getBoundingClientRect?node.getBoundingClientRect():null;}
function clamp(v,a,b){return T&&T.clamp?T.clamp(v,a,b):Math.min(b,Math.max(a,v));}
function lerp(a,b,p){return T&&T.lerp?T.lerp(a,b,p):a+(b-a)*p;}
function range(p,a,b){return T&&T.range?T.range(p,a,b):p<=a?0:p>=b?1:(p-a)/(b-a);}
function ease(){return T&&T.easing&&T.easing.emphasized?T.easing.emphasized:function(p){return p;};}
function reduced(){return!!(SC.motion&&SC.motion.reduced&&SC.motion.reduced());}
function snapshot(node,prop){return node?{node:node,prop:prop,value:node.style.getPropertyValue(prop),priority:node.style.getPropertyPriority(prop)}:null;}
function restore(snap){if(!snap||!snap.node)return;if(snap.value)snap.node.style.setProperty(snap.prop,snap.value,snap.priority);else snap.node.style.removeProperty(snap.prop);}
function radiusPx(node){if(!node)return 0;var raw=(getComputedStyle(node).borderTopLeftRadius||'0').split(/\s+/)[0],value=parseFloat(raw);return isFinite(value)?value:0;}

function parts(modal){
  var dialog=modal&&modal.querySelector(MS.dialog);if(!dialog)return null;
  return{dialog:dialog,scrim:modal.querySelector('.sc-product-modal__scrim'),imageStage:dialog.querySelector('.sc-product-modal__image-stage'),image:dialog.querySelector('.sc-product-modal__image')};
}
function sourceParts(link){
  if(!link)return null;var image=link.querySelector('.imgShop>img'),stage=image&&image.parentElement,box=getRect(stage);
  return image&&stage&&valid(box)?{image:image,stage:stage,rect:box,radius:radiusPx(stage)}:null;
}
function state(modal){
  var value=states.get(modal);
  if(!value){value={tween:null,source:null,position:0,overlay:null,sourceVisibility:null,overflowX:null,overflowY:null,dialogZ:null,context:null};states.set(modal,value);}
  return value;
}
function kill(value){if(value&&value.tween){try{value.tween.kill();}catch(_){}value.tween=null;}}
function hideSource(value,source){
  if(value.sourceVisibility){restore(value.sourceVisibility);value.sourceVisibility=null;}
  if(!source||!source.image)return;value.sourceVisibility=snapshot(source.image,'visibility');source.image.style.setProperty('visibility','hidden','important');
}
function restoreSource(value){if(value&&value.sourceVisibility){restore(value.sourceVisibility);value.sourceVisibility=null;}}
function holdOverflow(value,dialog){
  if(!value.overflowX)value.overflowX=snapshot(dialog,'overflow-x');
  if(!value.overflowY)value.overflowY=snapshot(dialog,'overflow-y');
  dialog.style.setProperty('overflow-x','hidden','important');dialog.style.setProperty('overflow-y','hidden','important');
}
function restoreOverflow(value){if(value.overflowX){restore(value.overflowX);value.overflowX=null;}if(value.overflowY){restore(value.overflowY);value.overflowY=null;}}
function holdDialogZ(value,dialog){if(!value.dialogZ)value.dialogZ=snapshot(dialog,'z-index');dialog.style.setProperty('z-index','2','important');}
function restoreDialogZ(value){if(value.dialogZ){restore(value.dialogZ);value.dialogZ=null;}}

function createOverlay(modal,value,source){
  if(value.overlay&&value.overlay.parentNode)return value.overlay;
  var shell=document.createElement('span'),clone=source.image.cloneNode(false),style=getComputedStyle(source.image);
  clone.removeAttribute('id');clone.removeAttribute('class');clone.removeAttribute('style');clone.removeAttribute('srcset');clone.removeAttribute('sizes');clone.setAttribute('aria-hidden','true');clone.alt='';clone.src=source.image.currentSrc||source.image.src;
  shell.setAttribute('aria-hidden','true');
  shell.style.cssText='display:block;position:fixed;pointer-events:none;margin:0;padding:0;border:0;overflow:hidden;transform-origin:0 0;will-change:transform,clip-path,opacity,border-radius;z-index:1;';
  shell.style.left=source.rect.left+'px';shell.style.top=source.rect.top+'px';shell.style.width=source.rect.width+'px';shell.style.height=source.rect.height+'px';
  clone.style.cssText='display:block;position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;border:0;max-width:none;max-height:none;';
  clone.style.objectFit=style.objectFit||'contain';clone.style.objectPosition=style.objectPosition||'50% 50%';
  shell.appendChild(clone);modal.appendChild(shell);value.overlay=shell;return shell;
}
function removeOverlay(value){if(value.overlay&&value.overlay.parentNode)value.overlay.parentNode.removeChild(value.overlay);value.overlay=null;}

function clearVisual(modal,value,gsap,restoreOrigin){
  var p=parts(modal);kill(value);restoreOverflow(value);restoreDialogZ(value);
  if(p&&gsap){
    gsap.set(p.dialog,{clearProps:'transform,clipPath,borderRadius,opacity,willChange'});
    if(p.scrim)gsap.set(p.scrim,{clearProps:'opacity,willChange'});
  }else if(p){
    ['transform','clip-path','border-radius','opacity','will-change'].forEach(function(name){p.dialog.style.removeProperty(name);});
    if(p.scrim){p.scrim.style.removeProperty('opacity');p.scrim.style.removeProperty('will-change');}
  }
  removeOverlay(value);if(restoreOrigin)restoreSource(value);value.context=null;
}
function staticOpen(modal){
  var value=state(modal),p=parts(modal);if(!p)return;clearVisual(modal,value,null,true);value.position=1;
}
function cancel(modal){
  if(!modal)return;var value=states.get(modal);if(!value)return;
  if(SC.motion&&SC.motion.runLoaded)SC.motion.runLoaded(function(deps){clearVisual(modal,value,deps.gsap,true);});else clearVisual(modal,value,null,true);
  states.delete(modal);
}

function prepare(modal,value,link,gsap){
  var p=parts(modal),source=sourceParts(link||value.source);if(!p||!source)return null;
  value.source=link||value.source;kill(value);
  gsap.set(p.dialog,{clearProps:'transform,clipPath,borderRadius,opacity'});
  var endRect=getRect(p.dialog);if(!valid(endRect))return null;
  hideSource(value,source);holdOverflow(value,p.dialog);holdDialogZ(value,p.dialog);
  var overlay=createOverlay(modal,value,source),context={parts:p,source:source,start:source.rect,end:endRect,startRadius:source.radius,endRadius:radiusPx(p.dialog),overlay:overlay};
  value.context=context;return context;
}

/* Replica el ajuste por ancho y la máscara progresiva del transform de contenedor. */
function geometry(start,end,progress,maskRange){
  var width=lerp(start.width,end.width,progress),startScale=width/start.width,endScale=width/end.width;
  var startHeight=start.height*startScale,endHeight=end.height*endScale,cx=lerp(start.left+start.width/2,end.left+end.width/2,progress),top=lerp(start.top,end.top,progress);
  var diff=Math.abs(endHeight-startHeight),maskP=range(progress,maskRange[0],maskRange[1]),maskedStart=startHeight,maskedEnd=endHeight;
  if(startHeight>endHeight)maskedStart-=diff*maskP;else maskedEnd-=diff*(1-maskP);
  return{left:cx-width/2,top:top,width:width,startScale:startScale,endScale:endScale,startHeight:startHeight,endHeight:endHeight,maskHeight:Math.max(maskedStart,maskedEnd)};
}
function applyNode(node,base,g,left,top,scale,maskHeight,radiusScreen,alpha){
  if(!node||!valid(base)||!isFinite(scale)||scale<=0)return;
  var x=left-base.left,y=top-base.top,bottom=Math.max(0,base.height-maskHeight/scale),radius=Math.max(0,radiusScreen/scale);
  node.style.transform='translate3d('+x+'px,'+y+'px,0) scale('+scale+')';
  node.style.transformOrigin='0 0';node.style.clipPath='inset(0px 0px '+bottom+'px 0px)';node.style.borderRadius=radius+'px';node.style.opacity=String(clamp(alpha,0,1));node.style.willChange='transform,clip-path,opacity,border-radius';
}
function renderEnter(value,p){
  var c=value.context;if(!c)return;var g=geometry(c.start,c.end,p,ENTER_MASK),shape=range(p,ENTER_SHAPE[0],ENTER_SHAPE[1]),radius=lerp(c.startRadius,c.endRadius,shape);
  applyNode(c.overlay,c.start,g,g.left,g.top,g.startScale,g.maskHeight,radius,1);
  applyNode(c.parts.dialog,c.end,g,g.left,g.top,g.endScale,g.maskHeight,radius,range(p,ENTER_FADE[0],ENTER_FADE[1]));
  if(c.parts.scrim){c.parts.scrim.style.opacity=String(SCRIM*p);c.parts.scrim.style.willChange='opacity';}
  value.position=p;
}
function renderReturn(value,q){
  var c=value.context;if(!c)return;var g=geometry(c.end,c.start,q,RETURN_MASK),shape=range(q,RETURN_SHAPE[0],RETURN_SHAPE[1]),radius=lerp(c.endRadius,c.startRadius,shape);
  applyNode(c.parts.dialog,c.end,g,g.left,g.top,g.startScale,g.maskHeight,radius,1-range(q,RETURN_FADE[0],RETURN_FADE[1]));
  applyNode(c.overlay,c.start,g,g.left,g.top,g.endScale,g.maskHeight,radius,1);
  if(c.parts.scrim){c.parts.scrim.style.opacity=String(SCRIM*(1-q));c.parts.scrim.style.willChange='opacity';}
  value.position=1-q;
}
function completeOpen(modal,value,gsap){
  value.position=1;clearVisual(modal,value,gsap,true);
}
function completeClose(modal,value,gsap,done){
  value.position=0;clearVisual(modal,value,gsap,true);if(done)done();
}
function fallbackClose(modal,value,gsap,done){
  var p=parts(modal);kill(value);
  if(!p){if(done)done();return;}
  value.tween=gsap.to(modal,{opacity:0,duration:.15,ease:T&&T.easing?T.easing.accelerate:'power2.in',overwrite:'auto',onComplete:function(){value.tween=null;gsap.set(modal,{clearProps:'opacity'});if(done)done();}});
}

function open(modal,link){
  if(!modal)return;var value=state(modal);value.source=link||value.source;
  if(reduced()){staticOpen(modal);return;}
  var ran=SC.motion&&SC.motion.runLoaded&&SC.motion.runLoaded(function(deps){
    var gsap=deps.gsap,c=prepare(modal,value,value.source,gsap);if(!c){staticOpen(modal);return;}
    var from=clamp(value.position,0,1),proxy={p:from};renderEnter(value,from);
    value.tween=gsap.to(proxy,{p:1,duration:OPEN*(1-from),ease:ease(),overwrite:'auto',onUpdate:function(){renderEnter(value,proxy.p);},onComplete:function(){value.tween=null;completeOpen(modal,value,gsap);}});
  });
  if(!ran)staticOpen(modal);
}
function reopen(modal,link){
  if(!modal)return;var value=state(modal);if(link)value.source=link;
  if(reduced()){staticOpen(modal);return;}
  var ran=SC.motion&&SC.motion.runLoaded&&SC.motion.runLoaded(function(deps){
    var gsap=deps.gsap,c=value.context||prepare(modal,value,value.source,gsap);if(!c){staticOpen(modal);return;}
    kill(value);var from=clamp(value.position,0,1),proxy={p:from};renderEnter(value,from);
    value.tween=gsap.to(proxy,{p:1,duration:Math.max(.08,OPEN*(1-from)),ease:ease(),overwrite:'auto',onUpdate:function(){renderEnter(value,proxy.p);},onComplete:function(){value.tween=null;completeOpen(modal,value,gsap);}});
  });
  if(!ran)staticOpen(modal);
}
function close(modal,link,done){
  if(typeof link==='function'){done=link;link=null;}if(!modal){if(done)done();return;}
  var value=state(modal);if(link)value.source=link;if(reduced()){clearVisual(modal,value,null,true);if(done)done();return;}
  var ran=SC.motion&&SC.motion.runLoaded&&SC.motion.runLoaded(function(deps){
    var gsap=deps.gsap,c=value.context||prepare(modal,value,value.source,gsap);if(!c){fallbackClose(modal,value,gsap,done);return;}
    kill(value);var q=1-clamp(value.position||1,0,1),proxy={p:q};renderReturn(value,q);
    value.tween=gsap.to(proxy,{p:1,duration:Math.max(.08,CLOSE*(1-q)),ease:ease(),overwrite:'auto',onUpdate:function(){renderReturn(value,proxy.p);},onComplete:function(){value.tween=null;completeClose(modal,value,gsap,done);}});
  });
  if(!ran){clearVisual(modal,value,null,true);if(done)done();}
}
SC.productModalMotion={open:open,reopen:reopen,close:close,cancel:cancel};
})();