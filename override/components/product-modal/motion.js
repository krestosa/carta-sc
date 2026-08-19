/* Transición de detalle basada en shared image + expansión vertical del cuerpo del modal. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,MS=SC&&SC.productModalSelectors,T=SC&&SC.transitionPatterns;
if(!SC||!C||!MS||SC.__productModalMotionBooted)return;SC.__productModalMotionBooted=true;

var OPEN=.50,CLOSE=.40,DIALOG_CLOSE=.15,SCRIM=0x52/255,states=new WeakMap();
/* Ventanas medidas sobre la referencia 60fps: contenido saliente primero; imagen; cuerpo; contenido entrante. */
var ENTER={source:[0,.16],surface:[.06,.18],body:[.14,1],title:[.28,.42],description:[.34,.52],price:[.43,.62],actions:[.52,.72],close:[.52,.72]};
var RETURN={title:[0,.18],description:[0,.22],price:[.06,.26],actions:[0,.20],close:[0,.20],body:[0,.86],source:[.72,1]};

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
function clearNode(node,names){if(!node)return;names.forEach(function(name){node.style.removeProperty(name);});}

function parts(modal){var dialog=modal&&modal.querySelector(MS.dialog);if(!dialog)return null;return{
  dialog:dialog,scrim:modal.querySelector('.sc-product-modal__scrim'),close:dialog.querySelector('.sc-product-modal__close'),
  imageStage:dialog.querySelector('.sc-product-modal__image-stage'),image:dialog.querySelector('.sc-product-modal__image'),content:dialog.querySelector('.sc-product-modal__content'),
  headline:dialog.querySelector('.sc-product-modal__title'),description:dialog.querySelector('.sc-product-modal__description'),price:dialog.querySelector('.sc-product-modal__price-row'),actions:dialog.querySelector('.sc-product-modal__actions')
};}
function sourceParts(link){
  if(!link)return null;var image=link.querySelector('.imgShop>img'),stage=image&&image.parentElement,box=getRect(stage);if(!image||!stage||!valid(box))return null;
  var nodes=[link.querySelector(C.selectors&&C.selectors.productTitle||'.title-shop1'),link.querySelector(C.selectors&&C.selectors.productDescription||'.descrip'),link.querySelector('.priceRow')].filter(Boolean);
  return{image:image,stage:stage,rect:box,radius:radiusPx(stage),nodes:nodes};
}
function state(modal){var value=states.get(modal);if(!value){value={tween:null,source:null,position:0,overlay:null,sourceVisibility:null,sourceNodeOpacity:[],imageOpacity:null,overflowX:null,overflowY:null,dialogZ:null,context:null,fallback:false};states.set(modal,value);}return value;}
function kill(value){if(value&&value.tween){try{value.tween.kill();}catch(_){}value.tween=null;}}
function hideSource(value,source){if(value.sourceVisibility){restore(value.sourceVisibility);value.sourceVisibility=null;}if(!source||!source.image)return;value.sourceVisibility=snapshot(source.image,'visibility');source.image.style.setProperty('visibility','hidden','important');}
function restoreSource(value){if(value&&value.sourceVisibility){restore(value.sourceVisibility);value.sourceVisibility=null;}}
function captureSourceNodes(value,source){restoreSourceNodes(value);value.sourceNodeOpacity=(source&&source.nodes||[]).map(function(node){return snapshot(node,'opacity');});}
function restoreSourceNodes(value){(value.sourceNodeOpacity||[]).forEach(restore);value.sourceNodeOpacity=[];}
function sourceOpacity(value,opacity){(value.sourceNodeOpacity||[]).forEach(function(s){if(s&&s.node)s.node.style.opacity=String(clamp(opacity,0,1));});}
function holdDestinationImage(value,image){if(value.imageOpacity){restore(value.imageOpacity);value.imageOpacity=null;}if(!image)return;value.imageOpacity=snapshot(image,'opacity');image.style.setProperty('opacity','0','important');}
function restoreDestinationImage(value){if(value.imageOpacity){restore(value.imageOpacity);value.imageOpacity=null;}}
function holdOverflow(value,dialog){if(!value.overflowX)value.overflowX=snapshot(dialog,'overflow-x');if(!value.overflowY)value.overflowY=snapshot(dialog,'overflow-y');dialog.style.setProperty('overflow-x','hidden','important');dialog.style.setProperty('overflow-y','hidden','important');}
function restoreOverflow(value){if(value.overflowX){restore(value.overflowX);value.overflowX=null;}if(value.overflowY){restore(value.overflowY);value.overflowY=null;}}
function holdDialogZ(value,dialog){if(!value.dialogZ)value.dialogZ=snapshot(dialog,'z-index');dialog.style.setProperty('z-index','2','important');}
function restoreDialogZ(value){if(value.dialogZ){restore(value.dialogZ);value.dialogZ=null;}}

function fallbackContent(p){return[p&&p.headline,p&&p.imageStage,p&&p.description,p&&p.price,p&&p.actions].filter(Boolean);}
function clearFallback(p,gsap){if(!p)return;var nodes=fallbackContent(p);if(gsap){gsap.set(p.dialog,{clearProps:'transform,willChange'});if(p.scrim)gsap.set(p.scrim,{clearProps:'opacity,willChange'});if(nodes.length)gsap.set(nodes,{clearProps:'opacity,willChange'});}p.dialog.style.removeProperty('--sc-modal-surface-height');p.dialog.style.removeProperty('--sc-modal-surface-opacity');}
function setFallbackSnapshot(p,gsap,s){gsap.set(p.dialog,{y:s.y,willChange:'transform'});p.dialog.style.setProperty('--sc-modal-surface-height',s.height+'%');p.dialog.style.setProperty('--sc-modal-surface-opacity',String(s.surfaceOpacity));if(p.scrim)gsap.set(p.scrim,{opacity:s.scrim,willChange:'opacity'});if(p.headline)gsap.set(p.headline,{opacity:s.headline,willChange:'opacity'});if(p.imageStage)gsap.set(p.imageStage,{opacity:s.image,willChange:'opacity'});if(p.description)gsap.set(p.description,{opacity:s.description,willChange:'opacity'});if(p.price)gsap.set(p.price,{opacity:s.price,willChange:'opacity'});if(p.actions)gsap.set(p.actions,{opacity:s.actions,willChange:'opacity'});}

function createOverlay(modal,value,source){
  if(value.overlay&&value.overlay.parentNode)return value.overlay;
  var shell=document.createElement('span'),clone=source.image.cloneNode(false),style=getComputedStyle(source.image);clone.removeAttribute('id');clone.removeAttribute('class');clone.removeAttribute('style');clone.removeAttribute('srcset');clone.removeAttribute('sizes');clone.setAttribute('aria-hidden','true');clone.alt='';clone.src=source.image.currentSrc||source.image.src;
  shell.setAttribute('aria-hidden','true');shell.style.cssText='display:block;position:fixed;pointer-events:none;margin:0;padding:0;border:0;overflow:hidden;transform-origin:50% 50%;will-change:transform,clip-path,opacity,border-radius;z-index:3;';shell.style.left=source.rect.left+'px';shell.style.top=source.rect.top+'px';shell.style.width=source.rect.width+'px';shell.style.height=source.rect.height+'px';
  clone.style.cssText='display:block;position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;border:0;max-width:none;max-height:none;';clone.style.objectFit=style.objectFit||'contain';clone.style.objectPosition=style.objectPosition||'50% 50%';shell.appendChild(clone);modal.appendChild(shell);value.overlay=shell;return shell;
}
function removeOverlay(value){if(value.overlay&&value.overlay.parentNode)value.overlay.parentNode.removeChild(value.overlay);value.overlay=null;}

function clearShared(p,value,gsap,restoreOrigin){
  kill(value);restoreOverflow(value);restoreDialogZ(value);restoreDestinationImage(value);restoreSourceNodes(value);
  if(p){clearNode(p.dialog,['clip-path','opacity','will-change']);[p.content,p.headline,p.description,p.price,p.actions,p.close].forEach(function(node){clearNode(node,['opacity','transform','will-change']);});if(p.scrim)clearNode(p.scrim,['opacity','will-change']);}
  removeOverlay(value);if(restoreOrigin)restoreSource(value);value.context=null;value.fallback=false;
}
function clearVisual(modal,value,gsap,restoreOrigin){var p=parts(modal);if(p)clearShared(p,value,gsap,restoreOrigin);else{kill(value);removeOverlay(value);if(restoreOrigin)restoreSource(value);restoreSourceNodes(value);restoreDestinationImage(value);}if(p)clearFallback(p,gsap);}
function staticOpen(modal){var value=state(modal),p=parts(modal);if(!p)return;clearVisual(modal,value,null,true);value.position=1;}
function cancel(modal){if(!modal)return;var value=states.get(modal);if(!value)return;if(SC.motion&&SC.motion.runLoaded)SC.motion.runLoaded(function(deps){clearVisual(modal,value,deps.gsap,true);});else clearVisual(modal,value,null,true);states.delete(modal);}

function prepare(modal,value,link,gsap){
  var p=parts(modal),source=sourceParts(link||value.source);if(!p||!source||!p.imageStage)return null;value.source=link||value.source;kill(value);clearFallback(p,gsap);value.fallback=false;
  var imageEnd=getRect(p.imageStage),dialogEnd=getRect(p.dialog);if(!valid(imageEnd)||!valid(dialogEnd))return null;
  hideSource(value,source);captureSourceNodes(value,source);holdDestinationImage(value,p.image);holdOverflow(value,p.dialog);holdDialogZ(value,p.dialog);
  var overlay=createOverlay(modal,value,source),context={parts:p,source:source,imageStart:source.rect,imageEnd:imageEnd,dialogEnd:dialogEnd,startRadius:source.radius,endRadius:radiusPx(p.imageStage),dialogRadius:radiusPx(p.dialog),overlay:overlay};value.context=context;return context;
}
function restartPrepare(modal,value,gsap){clearVisual(modal,value,gsap,true);return prepare(modal,value,value.source,gsap);}

/* Shared image: centro a centro. El cuerpo del diálogo no escala con la imagen. */
function rectCenter(r){return{x:r.left+r.width/2,y:r.top+r.height/2};}
function imageRect(start,end,p){var a=rectCenter(start),b=rectCenter(end),w=lerp(start.width,end.width,p),h=lerp(start.height,end.height,p),cx=lerp(a.x,b.x,p),cy=lerp(a.y,b.y,p);return{left:cx-w/2,top:cy-h/2,width:w,height:h,right:cx+w/2,bottom:cy+h/2};}
function applyImage(node,base,current,radiusScreen){if(!node||!valid(base)||!valid(current))return;var sx=current.width/base.width,sy=current.height/base.height,a=rectCenter(base),b=rectCenter(current),dx=b.x-a.x,dy=b.y-a.y,radius=Math.max(0,radiusScreen/Math.max(sx,sy));node.style.transform='translate3d('+dx+'px,'+dy+'px,0) scale('+sx+','+sy+')';node.style.transformOrigin='50% 50%';node.style.borderRadius=radius+'px';node.style.clipPath='inset(0 round '+radius+'px)';node.style.opacity='1';}
function revealBody(p,ctx,progress){
  var body=range(progress,ENTER.body[0],ENTER.body[1]),imageBottom=ctx.imageEnd.bottom-ctx.dialogEnd.top,full=ctx.dialogEnd.height,current=Math.min(full,Math.max(0,imageBottom+(full-imageBottom)*body)),bottom=Math.max(0,full-current);
  p.dialog.style.clipPath='inset(0 0 '+bottom+'px 0 round '+ctx.dialogRadius+'px)';p.dialog.style.opacity=String(range(progress,ENTER.surface[0],ENTER.surface[1]));p.dialog.style.willChange='clip-path,opacity';
}
function collapseBody(p,ctx,q){
  var body=range(q,RETURN.body[0],RETURN.body[1]),imageBottom=ctx.imageEnd.bottom-ctx.dialogEnd.top,full=ctx.dialogEnd.height,current=lerp(full,imageBottom,body),bottom=Math.max(0,full-current);
  p.dialog.style.clipPath='inset(0 0 '+bottom+'px 0 round '+ctx.dialogRadius+'px)';p.dialog.style.opacity='1';p.dialog.style.willChange='clip-path,opacity';
}
function enterElement(node,pair,p,offset){if(!node)return;var v=range(p,pair[0],pair[1]);node.style.opacity=String(v);node.style.transform='translate3d(0,'+((1-v)*(offset||6))+'px,0)';node.style.willChange='opacity,transform';}
function leaveElement(node,pair,q,offset){if(!node)return;var r=range(q,pair[0],pair[1]),v=1-r;node.style.opacity=String(v);node.style.transform='translate3d(0,'+(r*(offset||-4))+'px,0)';node.style.willChange='opacity,transform';}

function renderEnter(value,p){
  var c=value.context;if(!c)return;var image=imageRect(c.imageStart,c.imageEnd,p),shape=range(p,0,.75),radius=lerp(c.startRadius,c.endRadius,shape),parts=c.parts;
  applyImage(c.overlay,c.imageStart,image,radius);revealBody(parts,c,p);sourceOpacity(value,1-range(p,ENTER.source[0],ENTER.source[1]));
  if(parts.scrim){parts.scrim.style.opacity=String(SCRIM*p);parts.scrim.style.willChange='opacity';}
  enterElement(parts.headline,ENTER.title,p,7);enterElement(parts.description,ENTER.description,p,7);enterElement(parts.price,ENTER.price,p,6);enterElement(parts.actions,ENTER.actions,p,6);enterElement(parts.close,ENTER.close,p,0);value.position=p;
}
function renderReturn(value,q){
  var c=value.context;if(!c)return;var p=1-q,image=imageRect(c.imageStart,c.imageEnd,p),shape=range(p,0,.75),radius=lerp(c.startRadius,c.endRadius,shape),parts=c.parts;
  applyImage(c.overlay,c.imageStart,image,radius);collapseBody(parts,c,q);sourceOpacity(value,range(q,RETURN.source[0],RETURN.source[1]));
  if(parts.scrim){parts.scrim.style.opacity=String(SCRIM*(1-q));parts.scrim.style.willChange='opacity';}
  leaveElement(parts.headline,RETURN.title,q,-5);leaveElement(parts.description,RETURN.description,q,-5);leaveElement(parts.price,RETURN.price,q,-5);leaveElement(parts.actions,RETURN.actions,q,-5);leaveElement(parts.close,RETURN.close,q,0);value.position=1-q;
}
function completeOpen(modal,value,gsap){value.position=1;clearVisual(modal,value,gsap,true);}
function completeClose(modal,value,gsap,done){value.position=0;clearVisual(modal,value,gsap,true);if(done)done();}

/* Fallback exacto de md-dialog cuando no existe una imagen compartida medible. */
function fallbackOpen(modal,value,gsap){
  var p=parts(modal);if(!p){staticOpen(modal);return;}kill(value);value.context=null;restoreSource(value);restoreSourceNodes(value);restoreDestinationImage(value);clearFallback(p,gsap);setFallbackSnapshot(p,gsap,{y:-50,height:35,surfaceOpacity:0,scrim:0,headline:0,image:0,description:0,price:0,actions:0});
  value.fallback=true;value.position=0;var headline=[p.headline].filter(Boolean),content=[p.imageStage,p.description,p.price].filter(Boolean),actions=[p.actions].filter(Boolean);
  value.tween=gsap.timeline({onComplete:function(){value.tween=null;value.position=1;clearFallback(p,gsap);value.fallback=false;}})
    .to(p.dialog,{y:0,duration:OPEN,ease:webEase(),overwrite:'auto'},0)
    .to(p.dialog,{'--sc-modal-surface-height':'100%',duration:OPEN,ease:webEase(),overwrite:'auto'},0)
    .to(p.dialog,{'--sc-modal-surface-opacity':1,duration:.05,ease:'none',overwrite:'auto'},0);
  if(p.scrim)value.tween.to(p.scrim,{opacity:SCRIM,duration:OPEN,ease:'none',overwrite:'auto'},0);
  if(headline.length)value.tween.to(headline,{opacity:1,duration:.20,ease:'none',overwrite:'auto'},.05);
  if(content.length)value.tween.to(content,{opacity:1,duration:.20,ease:'none',overwrite:'auto'},.05);
  if(actions.length)value.tween.to(actions,{opacity:1,duration:.15,ease:'none',overwrite:'auto'},.15);
}
function fallbackClose(modal,value,gsap,done){
  var p=parts(modal);if(!p){if(done)done();return;}kill(value);value.context=null;restoreSource(value);restoreSourceNodes(value);restoreDestinationImage(value);clearFallback(p,gsap);setFallbackSnapshot(p,gsap,{y:0,height:100,surfaceOpacity:1,scrim:SCRIM,headline:1,image:1,description:1,price:1,actions:1});
  value.fallback=true;value.position=1;var headline=[p.headline].filter(Boolean),content=[p.imageStage,p.description,p.price].filter(Boolean),actions=[p.actions].filter(Boolean);
  value.tween=gsap.timeline({onComplete:function(){value.tween=null;value.position=0;clearFallback(p,gsap);value.fallback=false;if(done)done();}})
    .to(p.dialog,{y:-50,duration:DIALOG_CLOSE,ease:accelerate(),overwrite:'auto'},0)
    .to(p.dialog,{'--sc-modal-surface-height':'35%',duration:DIALOG_CLOSE,ease:accelerate(),overwrite:'auto'},0)
    .to(p.dialog,{'--sc-modal-surface-opacity':0,duration:.05,ease:'none',overwrite:'auto'},.10);
  if(p.scrim)value.tween.to(p.scrim,{opacity:0,duration:DIALOG_CLOSE,ease:'none',overwrite:'auto'},0);
  if(headline.length)value.tween.to(headline,{opacity:0,duration:.10,ease:'none',overwrite:'auto'},0);
  if(content.length)value.tween.to(content,{opacity:0,duration:.10,ease:'none',overwrite:'auto'},0);
  if(actions.length)value.tween.to(actions,{opacity:0,duration:.10,ease:'none',overwrite:'auto'},0);
}

function open(modal,link){if(!modal)return;var value=state(modal);value.source=link||value.source;var ran=SC.motion&&SC.motion.runLoaded&&SC.motion.runLoaded(function(deps){var gsap=deps.gsap,c=prepare(modal,value,value.source,gsap);if(!c){fallbackOpen(modal,value,gsap);return;}value.position=0;var proxy={p:0};renderEnter(value,0);value.tween=gsap.to(proxy,{p:1,duration:OPEN,ease:ease(),overwrite:'auto',onUpdate:function(){renderEnter(value,proxy.p);},onComplete:function(){value.tween=null;completeOpen(modal,value,gsap);}});});if(!ran)staticOpen(modal);}
function reopen(modal,link){if(!modal)return;var value=state(modal);if(link)value.source=link;var ran=SC.motion&&SC.motion.runLoaded&&SC.motion.runLoaded(function(deps){var gsap=deps.gsap,c=restartPrepare(modal,value,gsap);if(!c){fallbackOpen(modal,value,gsap);return;}value.position=0;var proxy={p:0};renderEnter(value,0);value.tween=gsap.to(proxy,{p:1,duration:OPEN,ease:ease(),overwrite:'auto',onUpdate:function(){renderEnter(value,proxy.p);},onComplete:function(){value.tween=null;completeOpen(modal,value,gsap);}});});if(!ran)staticOpen(modal);}
function close(modal,link,done){if(typeof link==='function'){done=link;link=null;}if(!modal){if(done)done();return;}var value=state(modal);if(link)value.source=link;var ran=SC.motion&&SC.motion.runLoaded&&SC.motion.runLoaded(function(deps){var gsap=deps.gsap,c=restartPrepare(modal,value,gsap);if(!c){fallbackClose(modal,value,gsap,done);return;}value.position=1;var proxy={p:0};renderReturn(value,0);value.tween=gsap.to(proxy,{p:1,duration:CLOSE,ease:ease(),overwrite:'auto',onUpdate:function(){renderReturn(value,proxy.p);},onComplete:function(){value.tween=null;completeClose(modal,value,gsap,done);}});});if(!ran){clearVisual(modal,value,null,true);if(done)done();}}
SC.productModalMotion={open:open,reopen:reopen,close:close,cancel:cancel};
})();