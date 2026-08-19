/* Coordina continuidad entre la tarjeta y su detalle sin duplicar el contenido real. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,MS=SC&&SC.productModalSelectors,T=SC&&SC.transitionPatterns;
if(!SC||!C||!MS||SC.__productModalMotionBooted)return;SC.__productModalMotionBooted=true;

var OPEN=.30,CLOSE=.25,RATIO=.30,SCRIM=.32,states=new WeakMap();

function valid(rect){return T&&T.validRect?T.validRect(rect):!!(rect&&rect.width>0&&rect.height>0);}
function getRect(node){return T&&T.rect?T.rect(node):node&&node.getBoundingClientRect?node.getBoundingClientRect():null;}
function curve(name,fallback){return SC.motion&&SC.motion.curve?SC.motion.curve(name):fallback;}
function reduced(){return!!(SC.motion&&SC.motion.reduced&&SC.motion.reduced());}
function parts(modal){
  var dialog=modal&&modal.querySelector(MS.dialog);if(!dialog)return null;
  var scrim=modal.querySelector('.sc-product-modal__scrim'),imageStage=dialog.querySelector('.sc-product-modal__image-stage'),image=dialog.querySelector('.sc-product-modal__image');
  var content=[].slice.call(dialog.querySelectorAll('.sc-product-modal__title,.sc-product-modal__description,.sc-product-modal__price-row,.sc-product-modal__close,.sc-product-modal__actions'));
  return{dialog:dialog,scrim:scrim,imageStage:imageStage,image:image,content:content};
}
function sourceParts(link){if(!link)return null;var image=link.querySelector('.imgShop>img'),stage=image&&image.parentElement;return{link:link,image:image,imageStage:stage,rect:getRect(link),imageRect:getRect(stage)};}
function snapshot(node,prop){return node?{node:node,prop:prop,value:node.style.getPropertyValue(prop),priority:node.style.getPropertyPriority(prop)}:null;}
function restore(snap){if(!snap||!snap.node)return;if(snap.value)snap.node.style.setProperty(snap.prop,snap.value,snap.priority);else snap.node.style.removeProperty(snap.prop);}
function state(modal){var value=states.get(modal);if(!value){value={timeline:null,overlay:null,source:null,sourceOpacity:null,sourceComputedOpacity:1,imageVisibility:null};states.set(modal,value);}return value;}
function killTimeline(value){if(value&&value.timeline){try{value.timeline.kill();}catch(_){}value.timeline=null;}}
function removeOverlay(value){if(value&&value.overlay){if(T&&T.removeOverlay)T.removeOverlay(value.overlay);else if(value.overlay.parentNode)value.overlay.parentNode.removeChild(value.overlay);value.overlay=null;}}
function restoreImage(value){if(value&&value.imageVisibility){restore(value.imageVisibility);value.imageVisibility=null;}}
function clearParts(p,gsap){if(!p||!gsap)return;gsap.set(p.dialog,{clearProps:'transform,opacity,visibility,willChange'});if(p.scrim)gsap.set(p.scrim,{clearProps:'opacity,willChange'});if(p.content.length)gsap.set(p.content,{clearProps:'opacity,transform,willChange'});}
function rememberSource(value,link){
  if(!link)return;
  if(value.source!==link||!value.sourceOpacity){value.source=link;value.sourceOpacity=snapshot(link,'opacity');value.sourceComputedOpacity=Math.max(0,Math.min(1,Number(getComputedStyle(link).opacity)||1));}
}
function hideDestinationImage(value,p){restoreImage(value);if(p&&p.image){value.imageVisibility=snapshot(p.image,'visibility');p.image.style.setProperty('visibility','hidden','important');}}
function createOverlay(value,image,from,z){removeOverlay(value);if(T&&T.imageOverlay&&image&&valid(from))value.overlay=T.imageOverlay(image,from,z||9002);return value.overlay;}
function moveOverlay(value,gsap,to,duration,ease){if(value.overlay&&T&&T.moveOverlay&&valid(to))T.moveOverlay(gsap,value.overlay,to,duration,ease);}
function keepSourceHidden(value,gsap){if(value.source)gsap.set(value.source,{opacity:0});}
function restoreSource(value){if(!value)return;restore(value.sourceOpacity);value.sourceOpacity=null;value.source=null;value.sourceComputedOpacity=1;}

function cleanupVisual(modal,value,gsap,restoreOrigin){
  killTimeline(value);removeOverlay(value);restoreImage(value);clearParts(parts(modal),gsap);
  if(restoreOrigin)restoreSource(value);
}
function staticOpen(modal,link){
  var p=parts(modal),value=state(modal);if(!p)return;rememberSource(value,link);if(value.source)value.source.style.setProperty('opacity','0');
  p.dialog.style.removeProperty('transform');p.dialog.style.removeProperty('opacity');p.dialog.style.removeProperty('visibility');if(p.scrim)p.scrim.style.removeProperty('opacity');p.content.forEach(function(node){node.style.removeProperty('opacity');});restoreImage(value);removeOverlay(value);
}
function cancel(modal){
  if(!modal)return;var value=states.get(modal);if(!value)return;
  if(SC.motion&&SC.motion.runLoaded)SC.motion.runLoaded(function(deps){cleanupVisual(modal,value,deps.gsap,true);});else{killTimeline(value);removeOverlay(value);restoreImage(value);restoreSource(value);}
  states.delete(modal);
}

/* El contenedor cambia de los límites de la tarjeta a los del diálogo; la imagen viaja aparte. */
function open(modal,link){
  if(!modal)return;var value=state(modal),p=parts(modal),source=sourceParts(link);if(!p)return;
  rememberSource(value,link);
  if(reduced()){staticOpen(modal,link);return;}
  var ran=SC.motion&&SC.motion.runLoaded&&SC.motion.runLoaded(function(deps){
    var gsap=deps.gsap,standard=curve('standard','power2.out'),accelerate=curve('accelerate','power2.in'),decelerate=curve('decelerate','power2.out'),out=OPEN*RATIO,inTime=OPEN-out;
    cleanupVisual(modal,value,gsap,false);rememberSource(value,link);source=sourceParts(link);
    var targetRect=getRect(p.dialog),hasBounds=source&&valid(source.rect)&&valid(targetRect);
    if(source&&source.image&&valid(source.imageRect)&&p.imageStage){createOverlay(value,source.image,source.imageRect,9002);hideDestinationImage(value,p);}
    if(hasBounds){var inv=T&&T.fitRect?T.fitRect(source.rect,targetRect):{x:source.rect.left-targetRect.left,y:source.rect.top-targetRect.top,scaleX:source.rect.width/targetRect.width,scaleY:source.rect.height/targetRect.height};gsap.set(p.dialog,{x:inv.x,y:inv.y,scaleX:inv.scaleX,scaleY:inv.scaleY,transformOrigin:'0 0',willChange:'transform'});}
    else gsap.set(p.dialog,{scale:.92,transformOrigin:'50% 50%',willChange:'transform,opacity'});
    if(p.scrim)gsap.set(p.scrim,{opacity:0,willChange:'opacity'});
    if(p.content.length)gsap.set(p.content,{opacity:0,willChange:'opacity'});
    if(value.source)gsap.set(value.source,{opacity:value.sourceComputedOpacity});
    value.timeline=gsap.timeline({defaults:{overwrite:'auto'},onComplete:function(){
      value.timeline=null;removeOverlay(value);restoreImage(value);clearParts(p,gsap);keepSourceHidden(value,gsap);
    }});
    if(hasBounds)value.timeline.to(p.dialog,{x:0,y:0,scaleX:1,scaleY:1,duration:OPEN,ease:standard,force3D:true},0);
    else value.timeline.to(p.dialog,{scale:1,autoAlpha:1,duration:OPEN,ease:standard,force3D:true},0);
    if(p.scrim)value.timeline.to(p.scrim,{opacity:SCRIM,duration:OPEN,ease:'none'},0);
    if(value.source)value.timeline.to(value.source,{opacity:0,duration:out,ease:accelerate},0);
    if(p.content.length)value.timeline.to(p.content,{opacity:1,duration:inTime,ease:decelerate},out);
    if(value.overlay&&p.imageStage)moveOverlay(value,gsap,getRect(p.imageStage),OPEN,standard);
  });
  if(!ran)staticOpen(modal,link);
}

/* Si se interrumpe un cierre, recupera el estado abierto sin relanzar la entrada. */
function reopen(modal,link){
  if(!modal)return;var value=state(modal),p=parts(modal);if(!p)return;rememberSource(value,link||value.source);
  if(SC.motion&&SC.motion.runLoaded)SC.motion.runLoaded(function(deps){var gsap=deps.gsap;killTimeline(value);removeOverlay(value);restoreImage(value);clearParts(p,gsap);keepSourceHidden(value,gsap);});else staticOpen(modal,link||value.source);
}

/* El cierre invierte los límites y deja aparecer la tarjeta después del primer 30%. */
function close(modal,link,done){
  if(typeof link==='function'){done=link;link=null;}if(!modal){if(done)done();return;}
  var value=state(modal),p=parts(modal);rememberSource(value,link||value.source);if(!p){restoreSource(value);if(done)done();return;}
  if(reduced()){restoreSource(value);if(done)done();return;}
  var ran=SC.motion&&SC.motion.runLoaded&&SC.motion.runLoaded(function(deps){
    var gsap=deps.gsap,standard=curve('standard','power2.out'),accelerate=curve('accelerate','power2.in'),decelerate=curve('decelerate','power2.out'),out=CLOSE*RATIO,inTime=CLOSE-out;
    killTimeline(value);removeOverlay(value);restoreImage(value);
    var source=sourceParts(value.source),fromRect=getRect(p.dialog),hasBounds=source&&valid(source.rect)&&valid(fromRect);
    if(p.image&&p.imageStage&&source&&source.imageStage&&valid(getRect(p.imageStage))&&valid(source.imageRect)){createOverlay(value,p.image,getRect(p.imageStage),9002);hideDestinationImage(value,p);}
    if(p.scrim)gsap.set(p.scrim,{opacity:SCRIM,willChange:'opacity'});
    if(p.content.length)gsap.set(p.content,{opacity:1,willChange:'opacity'});
    if(value.source)gsap.set(value.source,{opacity:0,willChange:'opacity'});
    value.timeline=gsap.timeline({defaults:{overwrite:'auto'},onComplete:function(){
      value.timeline=null;removeOverlay(value);restoreImage(value);clearParts(p,gsap);restoreSource(value);if(done)done();
    }});
    if(hasBounds){var inv=T&&T.fitRect?T.fitRect(source.rect,fromRect):{x:source.rect.left-fromRect.left,y:source.rect.top-fromRect.top,scaleX:source.rect.width/fromRect.width,scaleY:source.rect.height/fromRect.height};value.timeline.to(p.dialog,{x:inv.x,y:inv.y,scaleX:inv.scaleX,scaleY:inv.scaleY,duration:CLOSE,ease:standard,transformOrigin:'0 0',force3D:true},0);}
    else value.timeline.to(p.dialog,{scale:.92,autoAlpha:0,duration:CLOSE,ease:standard,transformOrigin:'50% 50%',force3D:true},0);
    if(p.scrim)value.timeline.to(p.scrim,{opacity:0,duration:CLOSE,ease:'none'},0);
    if(p.content.length)value.timeline.to(p.content,{opacity:0,duration:out,ease:accelerate},0);
    if(value.source)value.timeline.to(value.source,{opacity:value.sourceComputedOpacity,duration:inTime,ease:decelerate},out);
    if(value.overlay&&source&&valid(source.imageRect))moveOverlay(value,gsap,source.imageRect,CLOSE,standard);
  });
  if(!ran){restoreSource(value);if(done)done();}
}
SC.productModalMotion={open:open,reopen:reopen,close:close,cancel:cancel};
})();