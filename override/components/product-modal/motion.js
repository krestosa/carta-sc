/* Coordina continuidad entre la imagen de la tarjeta y el detalle expandido. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,MS=SC&&SC.productModalSelectors,T=SC&&SC.transitionPatterns;
if(!SC||!C||!MS||SC.__productModalMotionBooted)return;SC.__productModalMotionBooted=true;

var OPEN=.30,CLOSE=.25,SCRIM=.32,OPEN_SURFACE_AT=.08,OPEN_CONTENT_AT=.18,CLOSE_SURFACE_AT=.03,states=new WeakMap();

function valid(value){return T&&T.validRect?T.validRect(value):!!(value&&value.width>0&&value.height>0);}
function getRect(node){return T&&T.rect?T.rect(node):node&&node.getBoundingClientRect?node.getBoundingClientRect():null;}
function curve(name,fallback){return SC.motion&&SC.motion.curve?SC.motion.curve(name):fallback;}
function reduced(){return!!(SC.motion&&SC.motion.reduced&&SC.motion.reduced());}
function snapshot(node,prop){return node?{node:node,prop:prop,value:node.style.getPropertyValue(prop),priority:node.style.getPropertyPriority(prop)}:null;}
function restore(snap){if(!snap||!snap.node)return;if(snap.value)snap.node.style.setProperty(snap.prop,snap.value,snap.priority);else snap.node.style.removeProperty(snap.prop);}

function parts(modal){
  var dialog=modal&&modal.querySelector(MS.dialog);if(!dialog)return null;
  var scrim=modal.querySelector('.sc-product-modal__scrim'),imageStage=dialog.querySelector('.sc-product-modal__image-stage'),image=dialog.querySelector('.sc-product-modal__image'),close=dialog.querySelector('.sc-product-modal__close');
  var content=[].slice.call(dialog.querySelectorAll('.sc-product-modal__title,.sc-product-modal__description,.sc-product-modal__footer'));
  return{dialog:dialog,scrim:scrim,imageStage:imageStage,image:image,close:close,content:content};
}
function sourceParts(link){
  if(!link)return null;var image=link.querySelector('.imgShop>img'),stage=image&&image.parentElement;
  return{link:link,image:image,imageStage:stage,imageRect:getRect(stage)};
}
function state(modal){var value=states.get(modal);if(!value){value={timeline:null,source:null,sourceImageVisibility:null,overflowX:null,overflowY:null};states.set(modal,value);}return value;}
function killTimeline(value){if(value&&value.timeline){try{value.timeline.kill();}catch(_){}value.timeline=null;}}
function rememberSource(value,link){if(link)value.source=link;}
function restoreSourceImage(value){if(value&&value.sourceImageVisibility){restore(value.sourceImageVisibility);value.sourceImageVisibility=null;}}
function hideSourceImage(value,source){
  restoreSourceImage(value);if(!source||!source.image)return;
  value.sourceImageVisibility=snapshot(source.image,'visibility');source.image.style.setProperty('visibility','hidden','important');
}
function holdOverflow(value,dialog){
  if(!value||!dialog||value.overflowX||value.overflowY)return;
  value.overflowX=snapshot(dialog,'overflow-x');value.overflowY=snapshot(dialog,'overflow-y');
  dialog.style.setProperty('overflow-x','hidden','important');dialog.style.setProperty('overflow-y','hidden','important');
}
function restoreOverflow(value){if(!value)return;if(value.overflowX){restore(value.overflowX);value.overflowX=null;}if(value.overflowY){restore(value.overflowY);value.overflowY=null;}}
function sourceTransform(sourceRect,dialogRect,stageRect){
  if(!valid(sourceRect)||!valid(dialogRect)||!valid(stageRect))return null;
  var sx=sourceRect.width/stageRect.width,sy=sourceRect.height/stageRect.height;
  var localX=stageRect.left-dialogRect.left,localY=stageRect.top-dialogRect.top;
  return{x:sourceRect.left-dialogRect.left-localX*sx,y:sourceRect.top-dialogRect.top-localY*sy,scaleX:sx,scaleY:sy};
}
function clipForImage(dialogRect,stageRect){return Math.max(0,dialogRect.bottom-stageRect.bottom);}
function clearParts(p,gsap){
  if(!p||!gsap)return;
  gsap.set(p.dialog,{clearProps:'transform,clipPath,willChange'});
  if(p.scrim)gsap.set(p.scrim,{clearProps:'opacity,willChange'});
  if(p.image)gsap.set(p.image,{clearProps:'transform,willChange'});
  if(p.close)gsap.set(p.close,{clearProps:'opacity,transform,visibility,willChange'});
  if(p.content.length)gsap.set(p.content,{clearProps:'opacity,transform,visibility,willChange'});
}
function cleanup(modal,value,gsap,restoreOrigin){killTimeline(value);restoreOverflow(value);clearParts(parts(modal),gsap);if(restoreOrigin)restoreSourceImage(value);}
function staticOpen(modal){var p=parts(modal),value=state(modal);if(!p)return;restoreOverflow(value);restoreSourceImage(value);p.dialog.style.removeProperty('clip-path');p.dialog.style.removeProperty('transform');if(p.scrim)p.scrim.style.removeProperty('opacity');if(p.image)p.image.style.removeProperty('transform');if(p.close){p.close.style.removeProperty('opacity');p.close.style.removeProperty('visibility');}p.content.forEach(function(node){node.style.removeProperty('opacity');node.style.removeProperty('visibility');node.style.removeProperty('transform');});}
function cancel(modal){
  if(!modal)return;var value=states.get(modal);if(!value)return;
  if(SC.motion&&SC.motion.runLoaded)SC.motion.runLoaded(function(deps){cleanup(modal,value,deps.gsap,true);});else{killTimeline(value);restoreOverflow(value);restoreSourceImage(value);}
  states.delete(modal);
}

/* La imagen ocupa primero el origen; la superficie se revela después hacia abajo. */
function open(modal,link){
  if(!modal)return;var value=state(modal),p=parts(modal);if(!p)return;rememberSource(value,link);
  if(reduced()){staticOpen(modal);return;}
  var ran=SC.motion&&SC.motion.runLoaded&&SC.motion.runLoaded(function(deps){
    var gsap=deps.gsap,standard=curve('standard','power2.out'),decelerate=curve('decelerate','power2.out');
    cleanup(modal,value,gsap,true);rememberSource(value,link);
    var source=sourceParts(link),dialogRect=getRect(p.dialog),stageRect=getRect(p.imageStage),origin=sourceTransform(source&&source.imageRect,dialogRect,stageRect),bottom=valid(dialogRect)&&valid(stageRect)?clipForImage(dialogRect,stageRect):0;
    if(source&&origin)hideSourceImage(value,source);holdOverflow(value,p.dialog);
    gsap.set(p.dialog,{x:origin?origin.x:0,y:origin?origin.y:0,scaleX:origin?origin.scaleX:1,scaleY:origin?origin.scaleY:1,clipPath:'inset(0px 0px '+bottom+'px 0px)',transformOrigin:'0 0',willChange:'transform,clip-path'});
    if(p.scrim)gsap.set(p.scrim,{opacity:0,willChange:'opacity'});
    if(p.image)gsap.set(p.image,{yPercent:0,scale:1,transformOrigin:'50% 50%',willChange:'transform'});
    if(p.close)gsap.set(p.close,{autoAlpha:0,y:-4,willChange:'opacity,transform'});
    if(p.content.length)gsap.set(p.content,{autoAlpha:0,y:8,willChange:'opacity,transform'});
    value.timeline=gsap.timeline({defaults:{overwrite:'auto'},onComplete:function(){
      value.timeline=null;restoreOverflow(value);restoreSourceImage(value);clearParts(p,gsap);
    }});
    if(origin)value.timeline.to(p.dialog,{x:0,y:0,scaleX:1,scaleY:1,duration:.24,ease:standard,force3D:true},0);
    value.timeline.to(p.dialog,{clipPath:'inset(0px 0px 0px 0px)',duration:OPEN-OPEN_SURFACE_AT,ease:standard},OPEN_SURFACE_AT);
    if(p.scrim)value.timeline.to(p.scrim,{opacity:SCRIM,duration:.20,ease:'none'},0);
    if(p.image){
      value.timeline.to(p.image,{yPercent:-2.2,duration:.12,ease:standard,force3D:true},.08)
        .to(p.image,{yPercent:0,duration:.10,ease:decelerate,force3D:true},.20);
    }
    if(p.close)value.timeline.to(p.close,{autoAlpha:1,y:0,duration:.12,ease:decelerate},.16);
    if(p.content.length)value.timeline.to(p.content,{autoAlpha:1,y:0,duration:.12,ease:decelerate,stagger:.018},OPEN_CONTENT_AT);
  });
  if(!ran)staticOpen(modal);
}

/* Recupera el estado expandido desde cualquier punto de un cierre interrumpido. */
function reopen(modal,link){
  if(!modal)return;var value=state(modal),p=parts(modal);if(!p)return;rememberSource(value,link||value.source);
  if(reduced()){staticOpen(modal);return;}
  var ran=SC.motion&&SC.motion.runLoaded&&SC.motion.runLoaded(function(deps){
    var gsap=deps.gsap,standard=curve('standard','power2.out'),decelerate=curve('decelerate','power2.out');killTimeline(value);holdOverflow(value,p.dialog);
    value.timeline=gsap.timeline({defaults:{overwrite:'auto'},onComplete:function(){value.timeline=null;restoreOverflow(value);restoreSourceImage(value);clearParts(p,gsap);}})
      .to(p.dialog,{x:0,y:0,scaleX:1,scaleY:1,clipPath:'inset(0px 0px 0px 0px)',duration:.18,ease:standard},0);
    if(p.scrim)value.timeline.to(p.scrim,{opacity:SCRIM,duration:.14,ease:'none'},0);
    if(p.close)value.timeline.to(p.close,{autoAlpha:1,y:0,duration:.10,ease:decelerate},.04);
    if(p.content.length)value.timeline.to(p.content,{autoAlpha:1,y:0,duration:.12,ease:decelerate,stagger:.012},.05);
    if(p.image)value.timeline.to(p.image,{yPercent:0,scale:1,duration:.14,ease:standard},0);
  });
  if(!ran)staticOpen(modal);
}

/* El contenido sale primero; luego la superficie se pliega y la imagen vuelve a su origen. */
function close(modal,link,done){
  if(typeof link==='function'){done=link;link=null;}if(!modal){if(done)done();return;}
  var value=state(modal),p=parts(modal);rememberSource(value,link||value.source);if(!p){restoreSourceImage(value);if(done)done();return;}
  if(reduced()){restoreOverflow(value);restoreSourceImage(value);if(done)done();return;}
  var ran=SC.motion&&SC.motion.runLoaded&&SC.motion.runLoaded(function(deps){
    var gsap=deps.gsap,standard=curve('standard','power2.out'),accelerate=curve('accelerate','power2.in');killTimeline(value);restoreSourceImage(value);holdOverflow(value,p.dialog);
    var source=sourceParts(value.source),dialogRect=getRect(p.dialog),stageRect=getRect(p.imageStage),origin=sourceTransform(source&&source.imageRect,dialogRect,stageRect),bottom=valid(dialogRect)&&valid(stageRect)?clipForImage(dialogRect,stageRect):0;
    if(source&&origin)hideSourceImage(value,source);
    gsap.set(p.dialog,{x:0,y:0,scaleX:1,scaleY:1,clipPath:'inset(0px 0px 0px 0px)',transformOrigin:'0 0',willChange:'transform,clip-path'});
    if(p.scrim)gsap.set(p.scrim,{opacity:SCRIM,willChange:'opacity'});
    if(p.close)gsap.set(p.close,{autoAlpha:1,y:0,willChange:'opacity,transform'});
    if(p.content.length)gsap.set(p.content,{autoAlpha:1,y:0,willChange:'opacity,transform'});
    if(p.image)gsap.set(p.image,{yPercent:0,willChange:'transform'});
    value.timeline=gsap.timeline({defaults:{overwrite:'auto'},onComplete:function(){
      value.timeline=null;restoreOverflow(value);restoreSourceImage(value);clearParts(p,gsap);if(done)done();
    }});
    if(p.content.length)value.timeline.to(p.content,{autoAlpha:0,y:5,duration:.075,ease:accelerate,stagger:.01},0);
    if(p.close)value.timeline.to(p.close,{autoAlpha:0,y:-3,duration:.075,ease:accelerate},0);
    value.timeline.to(p.dialog,{clipPath:'inset(0px 0px '+bottom+'px 0px)',duration:.17,ease:standard},CLOSE_SURFACE_AT);
    if(origin)value.timeline.to(p.dialog,{x:origin.x,y:origin.y,scaleX:origin.scaleX,scaleY:origin.scaleY,duration:CLOSE,ease:standard,force3D:true},0);
    else value.timeline.to(p.dialog,{autoAlpha:0,duration:.15,ease:accelerate},.10);
    if(p.scrim)value.timeline.to(p.scrim,{opacity:0,duration:CLOSE,ease:'none'},0);
    if(p.image){
      value.timeline.to(p.image,{yPercent:-1.6,duration:.10,ease:standard},.02)
        .to(p.image,{yPercent:0,duration:.10,ease:standard},.13);
    }
  });
  if(!ran){restoreOverflow(value);restoreSourceImage(value);if(done)done();}
}
SC.productModalMotion={open:open,reopen:reopen,close:close,cancel:cancel};
})();
