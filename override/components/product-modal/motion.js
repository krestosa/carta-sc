/* Transforma la imagen de origen en el contenedor de detalle y usa una entrada de diálogo cuando no hay geometría compartida. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,MS=SC&&SC.productModalSelectors,T=SC&&SC.transitionPatterns;
if(!SC||!C||!MS||SC.__productModalMotionBooted)return;SC.__productModalMotionBooted=true;

var OPEN=.50,CLOSE=.40,DIALOG_CLOSE=.15,SCRIM=0x52/255,ENTER_FADE=[0,.25],RETURN_FADE=[.60,.90],ENTER_MASK=[0,1],RETURN_MASK=[0,.90],ENTER_SHAPE=[0,.75],RETURN_SHAPE=[.30,.90],states=new WeakMap();

function valid(value){return T&&T.validRect?T.validRect(value):!!(value&&value.width>0&&value.height>0);}
function getRect(node){return T&&T.rect?T.rect(node):node&&node.getBoundingClientRect?node.getBoundingClientRect():null;}
function clamp(v,a,b){return T&&T.clamp?T.clamp(v,a,b):Math.min(b,Math.max(a,v));}
function lerp(a,b,p){return T&&T.lerp?T.lerp(a,b,p):a+(b-a)*p;}
function range(p,a,b){return T&&T.range?T.range(p,a,b):p<=a?0:p>=b?1:(p-a)/(b-a);}
function ease(){return T&&T.easing&&T.easing.emphasized?T.easing.emphasized:function(p){return p;};}
function webEase(){return T&&T.easing&&T.easing.webEmphasized?T.easing.webEmphasized:function(p){return p;};}
function accelerate(){return T&&T.easing&&T.easing.accelerate?T.easing.accelerate:function(p){return p;};}
function snapshot(node,prop){return node?{node:node,prop:prop,value:node.style.getPropertyValue(prop),priority:node.style.getPropertyPriority(prop)}:null;}
function restore(snap){if(!snap||!snap.node)return;if(snap.value)snap.node.style.setProperty(snap.prop,snap.value,snap.priority);else snap.node.style.removeProperty(snap.prop);}
function radiusPx(node){if(!node)return 0;var raw=(getComputedStyle(node).borderTopLeftRadius||'0').split(/\s+/)[0],value=parseFloat(raw);return isFinite(value)?value:0;}
function alpha(node,fallback){if(!node)return fallback;var value=parseFloat(getComputedStyle(node).opacity);return isFinite(value)?value:fallback;}

function parts(modal){var dialog=modal&&modal.querySelector(MS.dialog);if(!dialog)return null;return{dialog:dialog,scrim:modal.querySelector('.sc-product-modal__scrim'),imageStage:dialog.querySelector('.sc-product-modal__image-stage'),image:dialog.querySelector('.sc-product-modal__image'),headline:dialog.querySelector('.sc-product-modal__title'),description:dialog.querySelector('.sc-product-modal__description'),price:dialog.querySelector('.sc-product-modal__price-row'),actions:dialog.querySelector('.sc-product-modal__actions')};}
function sourceParts(link){if(!link)return null;var image=link.querySelector('.imgShop>img'),stage=image&&image.parentElement,box=getRect(stage);return image&&stage&&valid(box)?{image:image,stage:stage,rect:box,radius:radiusPx(stage)}:null;}
function state(modal){var value=states.get(modal);if(!value){value={tween:null,source:null,position:0,overlay:null,sourceVisibility:null,overflowX:null,overflowY:null,dialogZ:null,context:null,fallback:false};states.set(modal,value);}return value;}
function kill(value){if(value&&value.tween){try{value.tween.kill();}catch(_){}value.tween=null;}}
function hideSource(value,source){if(value.sourceVisibility){restore(value.sourceVisibility);value.sourceVisibility=null;}if(!source||!source.image)return;value.sourceVisibility=snapshot(source.image,'visibility');source.image.style.setProperty('visibility','hidden','important');}
function restoreSource(value){if(value&&value.sourceVisibility){restore(value.sourceVisibility);value.sourceVisibility=null;}}
function holdOverflow(value,dialog){if(!value.overflowX)value.overflowX=snapshot(dialog,'overflow-x');if(!value.overflowY)value.overflowY=snapshot(dialog,'overflow-y');dialog.style.setProperty('overflow-x','hidden','important');dialog.style.setProperty('overflow-y','hidden','important');}
function restoreOverflow(value){if(value.overflowX){restore(value.overflowX);value.overflowX=null;}if(value.overflowY){restore(value.overflowY);value.overflowY=null;}}
function holdDialogZ(value,dialog){if(!value.dialogZ)value.dialogZ=snapshot(dialog,'z-index');dialog.style.setProperty('z-index','2','important');}
function restoreDialogZ(value){if(value.dialogZ){restore(value.dialogZ);value.dialogZ=null;}}
function fallbackContent(p){return[p&&p.headline,p&&p.imageStage,p&&p.description,p&&p.price,p&&p.actions].filter(Boolean);}
function clearFallback(p,gsap){if(!p)return;var nodes=fallbackContent(p);if(gsap){gsap.set(p.dialog,{clearProps:'transform,willChange'});if(p.scrim)gsap.set(p.scrim,{clearProps:'opacity,willChange'});if(nodes.length)gsap.set(nodes,{clearProps:'opacity,willChange'});}p.dialog.style.removeProperty('--sc-modal-surface-height');p.dialog.style.removeProperty('--sc-modal-surface-opacity');}
function fallbackSnapshot(p,gsap){var style=getComputedStyle(p.dialog),height=parseFloat(style.getPropertyValue('--sc-modal-surface-height')),surfaceOpacity=parseFloat(style.getPropertyValue('--sc-modal-surface-opacity'));return{y:Number(gsap.getProperty(p.dialog,'y'))||0,height:isFinite(height)?height:100,surfaceOpacity:isFinite(surfaceOpacity)?surfaceOpacity:1,scrim:alpha(p.scrim,SCRIM),headline:alpha(p.headline,1),image:alpha(p.imageStage,1),description:alpha(p.description,1),price:alpha(p.price,1),actions:alpha(p.actions,1)};}
function setFallbackSnapshot(p,gsap,s){gsap.set(p.dialog,{y:s.y,willChange:'transform'});p.dialog.style.setProperty('--sc-modal-surface-height',s.height+'%');p.dialog.style.setProperty('--sc-modal-surface-opacity',String(s.surfaceOpacity));if(p.scrim)gsap.set(p.scrim,{opacity:s.scrim,willChange:'opacity'});if(p.headline)gsap.set(p.headline,{opacity:s.headline,willChange:'opacity'});if(p.imageStage)gsap.set(p.imageStage,{opacity:s.image,willChange:'opacity'});if(p.description)gsap.set(p.description,{opacity:s.description,willChange:'opacity'});if(p.price)gsap.set(p.price,{opacity:s.price,willChange:'opacity'});if(p.actions)gsap.set(p.actions,{opacity:s.actions,willChange:'opacity'});}

function createOverlay(modal,value,source){if(value.overlay&&value.overlay.parentNode)return value.overlay;var shell=document.createElement('span'),clone=source.image.cloneNode(false),style=getComputedStyle(source.image);clone.removeAttribute('id');clone.removeAttribute('class');clone.removeAttribute('style');clone.removeAttribute('srcset');clone.removeAttribute('sizes');clone.setAttribute('aria-hidden','true');clone.alt='';clone.src=source.image.currentSrc||source.image.src;shell.setAttribute('aria-hidden','true');shell.style.cssText='display:block;position:fixed;pointer-events:none;margin:0;padding:0;border:0;overflow:hidden;transform-origin:0 0;will-change:transform,clip-path,opacity,border-radius;z-index:1;';shell.style.left=source.rect.left+'px';shell.style.top=source.rect.top+'px';shell.style.width=source.rect.width+'px';shell.style.height=source.rect.height+'px';clone.style.cssText='display:block;position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;border:0;max-width:none;max-height:none;';clone.style.objectFit=style.objectFit||'contain';clone.style.objectPosition=style.objectPosition||'50% 50%';shell.appendChild(clone);modal.appendChild(shell);value.overlay=shell;return shell;}
function removeOverlay(value){if(value.overlay&&value.overlay.parentNode)value.overlay.parentNode.removeChild(value.overlay);value.overlay=null;}

function clearVisual(modal,value,gsap,restoreOrigin){var p=parts(modal);kill(value);restoreOverflow(value);restoreDialogZ(value);if(p&&gsap){gsap.set(p.dialog,{clearProps:'transform,clipPath,borderRadius,opacity,willChange'});if(p.scrim)gsap.set(p.scrim,{clearProps:'opacity,willChange'});}else if(p){['transform','clip-path','border-radius','opacity','will-change'].forEach(function(name){p.dialog.style.removeProperty(name);});if(p.scrim){p.scrim.style.removeProperty('opacity');p.scrim.style.removeProperty('will-change');}}if(p)clearFallback(p,gsap);removeOverlay(value);if(restoreOrigin)restoreSource(value);value.context=null;value.fallback=false;}
function staticOpen(modal){var value=state(modal),p=parts(modal);if(!p)return;clearVisual(modal,value,null,true);value.position=1;}
function cancel(modal){if(!modal)return;var value=states.get(modal);if(!value)return;if(SC.motion&&SC.motion.runLoaded)SC.motion.runLoaded(function(deps){clearVisual(modal,value,deps.gsap,true);});else clearVisual(modal,value,null,true);states.delete(modal);}

function prepare(modal,value,link,gsap){var p=parts(modal),source=sourceParts(link||value.source);if(!p||!source)return null;value.source=link||value.source;kill(value);clearFallback(p,gsap);value.fallback=false;gsap.set(p.dialog,{clearProps:'transform,clipPath,borderRadius,opacity'});var endRect=getRect(p.dialog);if(!valid(endRect))return null;hideSource(value,source);holdOverflow(value,p.dialog);holdDialogZ(value,p.dialog);var overlay=createOverlay(modal,value,source),context={parts:p,source:source,start:source.rect,end:endRect,startRadius:source.radius,endRadius:radiusPx(p.dialog),overlay:overlay};value.context=context;return context;}

/* Ajuste por ancho y máscara progresiva del transform de contenedor. */
function geometry(start,end,progress,maskRange){var width=lerp(start.width,end.width,progress),startScale=width/start.width,endScale=width/end.width,startHeight=start.height*startScale,endHeight=end.height*endScale,cx=lerp(start.left+start.width/2,end.left+end.width/2,progress),top=lerp(start.top,end.top,progress),diff=Math.abs(endHeight-startHeight),maskP=range(progress,maskRange[0],maskRange[1]),maskedStart=startHeight,maskedEnd=endHeight;if(startHeight>endHeight)maskedStart-=diff*maskP;else maskedEnd-=diff*(1-maskP);return{left:cx-width/2,top:top,width:width,startScale:startScale,endScale:endScale,startHeight:startHeight,endHeight:endHeight,maskHeight:Math.max(maskedStart,maskedEnd)};}
function applyNode(node,base,g,left,top,scale,maskHeight,radiusScreen,alphaValue){if(!node||!valid(base)||!isFinite(scale)||scale<=0)return;var x=left-base.left,y=top-base.top,bottom=Math.max(0,base.height-maskHeight/scale),radius=Math.max(0,radiusScreen/scale);node.style.transform='translate3d('+x+'px,'+y+'px,0) scale('+scale+')';node.style.transformOrigin='0 0';node.style.clipPath='inset(0px 0px '+bottom+'px 0px)';node.style.borderRadius=radius+'px';node.style.opacity=String(clamp(alphaValue,0,1));node.style.willChange='transform,clip-path,opacity,border-radius';}
function renderEnter(value,p){var c=value.context;if(!c)return;var g=geometry(c.start,c.end,p,ENTER_MASK),shape=range(p,ENTER_SHAPE[0],ENTER_SHAPE[1]),radius=lerp(c.startRadius,c.endRadius,shape);applyNode(c.overlay,c.start,g,g.left,g.top,g.startScale,g.maskHeight,radius,1);applyNode(c.parts.dialog,c.end,g,g.left,g.top,g.endScale,g.maskHeight,radius,range(p,ENTER_FADE[0],ENTER_FADE[1]));if(c.parts.scrim){c.parts.scrim.style.opacity=String(SCRIM*p);c.parts.scrim.style.willChange='opacity';}value.position=p;}
function renderReturn(value,q){var c=value.context;if(!c)return;var g=geometry(c.end,c.start,q,RETURN_MASK),shape=range(q,RETURN_SHAPE[0],RETURN_SHAPE[1]),radius=lerp(c.endRadius,c.startRadius,shape);applyNode(c.parts.dialog,c.end,g,g.left,g.top,g.startScale,g.maskHeight,radius,1-range(q,RETURN_FADE[0],RETURN_FADE[1]));applyNode(c.overlay,c.start,g,g.left,g.top,g.endScale,g.maskHeight,radius,1);if(c.parts.scrim){c.parts.scrim.style.opacity=String(SCRIM*(1-q));c.parts.scrim.style.willChange='opacity';}value.position=1-q;}
function completeOpen(modal,value,gsap){value.position=1;clearVisual(modal,value,gsap,true);}
function completeClose(modal,value,gsap,done){value.position=0;clearVisual(modal,value,gsap,true);if(done)done();}

/* Entrada/salida de diálogo usada sólo cuando no existe un elemento compartido medible. */
function fallbackOpen(modal,value,gsap){
  var p=parts(modal);if(!p){staticOpen(modal);return;}var carry=value.fallback?fallbackSnapshot(p,gsap):null;kill(value);value.context=null;restoreSource(value);
  if(carry)setFallbackSnapshot(p,gsap,carry);else setFallbackSnapshot(p,gsap,{y:-50,height:35,surfaceOpacity:0,scrim:0,headline:0,image:0,description:0,price:0,actions:0});
  value.fallback=true;var progress=carry?clamp((carry.y+50)/50,0,1):0,duration=OPEN*(1-progress),scale=duration/OPEN,headline=[p.headline].filter(Boolean),content=[p.imageStage,p.description,p.price].filter(Boolean),actions=[p.actions].filter(Boolean);
  if(duration<=.001){value.position=1;clearFallback(p,gsap);value.fallback=false;return;}
  value.tween=gsap.timeline({onComplete:function(){value.tween=null;value.position=1;clearFallback(p,gsap);value.fallback=false;}})
    .to(p.dialog,{y:0,duration:duration,ease:webEase(),overwrite:'auto'},0)
    .to(p.dialog,{'--sc-modal-surface-height':'100%',duration:duration,ease:webEase(),overwrite:'auto'},0)
    .to(p.dialog,{'--sc-modal-surface-opacity':1,duration:.05*scale,ease:'none',overwrite:'auto'},0);
  if(p.scrim)value.tween.to(p.scrim,{opacity:SCRIM,duration:duration,ease:'none',overwrite:'auto'},0);
  if(headline.length)value.tween.to(headline,{opacity:1,duration:.20*scale,ease:'none',overwrite:'auto'},.05*scale);
  if(content.length)value.tween.to(content,{opacity:1,duration:.20*scale,ease:'none',overwrite:'auto'},.05*scale);
  if(actions.length)value.tween.to(actions,{opacity:1,duration:.15*scale,ease:'none',overwrite:'auto'},.15*scale);
}
function fallbackClose(modal,value,gsap,done){
  var p=parts(modal);if(!p){if(done)done();return;}var carry=fallbackSnapshot(p,gsap);kill(value);value.context=null;restoreSource(value);setFallbackSnapshot(p,gsap,carry);value.fallback=true;
  var remaining=clamp((carry.y+50)/50,0,1),duration=DIALOG_CLOSE*remaining,scale=duration/DIALOG_CLOSE,headline=[p.headline].filter(Boolean),content=[p.imageStage,p.description,p.price].filter(Boolean),actions=[p.actions].filter(Boolean);
  if(duration<=.001){value.position=0;clearFallback(p,gsap);value.fallback=false;if(done)done();return;}
  value.tween=gsap.timeline({onComplete:function(){value.tween=null;value.position=0;clearFallback(p,gsap);value.fallback=false;if(done)done();}})
    .to(p.dialog,{y:-50,duration:duration,ease:accelerate(),overwrite:'auto'},0)
    .to(p.dialog,{'--sc-modal-surface-height':'35%',duration:duration,ease:accelerate(),overwrite:'auto'},0)
    .to(p.dialog,{'--sc-modal-surface-opacity':0,duration:.05*scale,ease:'none',overwrite:'auto'},.10*scale);
  if(p.scrim)value.tween.to(p.scrim,{opacity:0,duration:duration,ease:'none',overwrite:'auto'},0);
  if(headline.length)value.tween.to(headline,{opacity:0,duration:.10*scale,ease:'none',overwrite:'auto'},0);
  if(content.length)value.tween.to(content,{opacity:0,duration:.10*scale,ease:'none',overwrite:'auto'},0);
  if(actions.length)value.tween.to(actions,{opacity:0,duration:.10*scale,ease:'none',overwrite:'auto'},0);
}

function open(modal,link){if(!modal)return;var value=state(modal);value.source=link||value.source;var ran=SC.motion&&SC.motion.runLoaded&&SC.motion.runLoaded(function(deps){var gsap=deps.gsap,c=prepare(modal,value,value.source,gsap);if(!c){fallbackOpen(modal,value,gsap);return;}var from=clamp(value.position,0,1),proxy={p:from};renderEnter(value,from);value.tween=gsap.to(proxy,{p:1,duration:OPEN*(1-from),ease:ease(),overwrite:'auto',onUpdate:function(){renderEnter(value,proxy.p);},onComplete:function(){value.tween=null;completeOpen(modal,value,gsap);}});});if(!ran)staticOpen(modal);}
function reopen(modal,link){if(!modal)return;var value=state(modal);if(link)value.source=link;var ran=SC.motion&&SC.motion.runLoaded&&SC.motion.runLoaded(function(deps){var gsap=deps.gsap,c=value.context||prepare(modal,value,value.source,gsap);if(!c){fallbackOpen(modal,value,gsap);return;}kill(value);var from=clamp(value.position,0,1),proxy={p:from};renderEnter(value,from);value.tween=gsap.to(proxy,{p:1,duration:Math.max(.08,OPEN*(1-from)),ease:ease(),overwrite:'auto',onUpdate:function(){renderEnter(value,proxy.p);},onComplete:function(){value.tween=null;completeOpen(modal,value,gsap);}});});if(!ran)staticOpen(modal);}
function close(modal,link,done){if(typeof link==='function'){done=link;link=null;}if(!modal){if(done)done();return;}var value=state(modal);if(link)value.source=link;var ran=SC.motion&&SC.motion.runLoaded&&SC.motion.runLoaded(function(deps){var gsap=deps.gsap,c=value.context||prepare(modal,value,value.source,gsap);if(!c){fallbackClose(modal,value,gsap,done);return;}kill(value);var q=1-clamp(value.position||1,0,1),proxy={p:q};renderReturn(value,q);value.tween=gsap.to(proxy,{p:1,duration:Math.max(.08,CLOSE*(1-q)),ease:ease(),overwrite:'auto',onUpdate:function(){renderReturn(value,proxy.p);},onComplete:function(){value.tween=null;completeClose(modal,value,gsap,done);}});});if(!ran){clearVisual(modal,value,null,true);if(done)done();}}
SC.productModalMotion={open:open,reopen:reopen,close:close,cancel:cancel};
})();