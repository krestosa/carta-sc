/* Coordina continuidad entre la imagen de la tarjeta y el detalle expandido. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,MS=SC&&SC.productModalSelectors,T=SC&&SC.transitionPatterns;
if(!SC||!C||!MS||SC.__productModalMotionBooted)return;SC.__productModalMotionBooted=true;

var OPEN=.30,CLOSE=.25,SCRIM=.32,OPEN_SURFACE_AT=.065,OPEN_CONTENT_AT=.205,CLOSE_SURFACE_AT=.035,states=new WeakMap();

function valid(value){return T&&T.validRect?T.validRect(value):!!(value&&value.width>0&&value.height>0);}
function getRect(node){return T&&T.rect?T.rect(node):node&&node.getBoundingClientRect?node.getBoundingClientRect():null;}
function curve(name,fallback){return SC.motion&&SC.motion.curve?SC.motion.curve(name):fallback;}
function reduced(){return!!(SC.motion&&SC.motion.reduced&&SC.motion.reduced());}
function clamp(value,min,max){return Math.min(max,Math.max(min,value));}
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
  return{link:link,image:image,imageStage:stage,imageRect:getRect(stage),radius:stage?getComputedStyle(stage).borderRadius:'0px'};
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
function parallax(sourceRect,stageRect){
  if(!valid(sourceRect)||!valid(stageRect))return{x:0,y:0};
  var sx=sourceRect.left+sourceRect.width/2,sy=sourceRect.top+sourceRect.height/2,tx=stageRect.left+stageRect.width/2,ty=stageRect.top+stageRect.height/2;
  return{x:clamp(-(tx-sx)*.045,-12,12),y:clamp(-(ty-sy)*.035,-8,8)};
}
function clearParts(p,gsap){
  if(!p||!gsap)return;
  gsap.set(p.dialog,{clearProps:'transform,clipPath,borderRadius,willChange'});
  if(p.scrim)gsap.set(p.scrim,{clearProps:'opacity,willChange'});
  if(p.image)gsap.set(p.image,{clearProps:'transform,willChange'});
  if(p.close)gsap.set(p.close,{clearProps:'opacity,visibility,willChange'});
  if(p.content.length)gsap.set(p.content,{clearProps:'opacity,visibility,willChange'});
}
function cleanup(modal,value,gsap,restoreOrigin){killTimeline(value);restoreOverflow(value);clearParts(parts(modal),gsap);if(restoreOrigin)restoreSourceImage(value);}
function staticOpen(modal){
  var p=parts(modal),value=state(modal);if(!p)return;restoreOverflow(value);restoreSourceImage(value);
  p.dialog.style.removeProperty('clip-path');p.dialog.style.removeProperty('transform');p.dialog.style.removeProperty('border-radius');
  if(p.scrim)p.scrim.style.removeProperty('opacity');if(p.image)p.image.style.removeProperty('transform');
  if(p.close){p.close.style.removeProperty('opacity');p.close.style.removeProperty('visibility');}
  p.content.forEach(function(node){node.style.removeProperty('opacity');node.style.removeProperty('visibility');});
}
function cancel(modal){
  if(!modal)return;var value=states.get(modal);if(!value)return;
  if(SC.motion&&SC.motion.runLoaded)SC.motion.runLoaded(function(deps){cleanup(modal,value,deps.gsap,true);});else{killTimeline(value);restoreOverflow(value);restoreSourceImage(value);}
  states.delete(modal);
}

/* El detalle nace en los límites de la imagen; la superficie inferior se descubre después. */
function open(modal,link){
  if(!modal)return;var value=state(modal),p=parts(modal);if(!p)return;rememberSource(value,link);
  if(reduced()){staticOpen(modal);return;}
  var ran=SC.motion&&SC.motion.runLoaded&&SC.motion.runLoaded(function(deps){
    var gsap=deps.gsap,standard=curve('standard','power2.out');
    cleanup(modal,value,gsap,true);rememberSource(value,link);
    var source=sourceParts(link),dialogRect=getRect(p.dialog),stageRect=getRect(p.imageStage),origin=sourceTransform(source&&source.imageRect,dialogRect,stageRect);
    var bottom=valid(dialogRect)&&valid(stageRect)?clipForImage(dialogRect,stageRect):0,shift=parallax(source&&source.imageRect,stageRect);
    var finalRadius=getComputedStyle(p.dialog).borderRadius||'0px';
    if(source&&origin)hideSourceImage(value,source);holdOverflow(value,p.dialog);

    gsap.set(p.dialog,{
      x:origin?origin.x:0,y:origin?origin.y:0,scaleX:origin?origin.scaleX:1,scaleY:origin?origin.scaleY:1,
      clipPath:'inset(0px 0px '+bottom+'px 0px)',borderRadius:source&&source.radius?source.radius:finalRadius,
      transformOrigin:'0 0',willChange:'transform,clip-path,border-radius'
    });
    if(p.scrim)gsap.set(p.scrim,{opacity:0,willChange:'opacity'});
    if(p.image)gsap.set(p.image,{x:0,y:0,scale:1,transformOrigin:'50% 50%',willChange:'transform'});
    if(p.close)gsap.set(p.close,{autoAlpha:0,willChange:'opacity'});
    if(p.content.length)gsap.set(p.content,{autoAlpha:0,willChange:'opacity'});

    value.timeline=gsap.timeline({defaults:{overwrite:'auto'},onComplete:function(){
      value.timeline=null;restoreOverflow(value);restoreSourceImage(value);clearParts(p,gsap);
    }});
    if(origin)value.timeline.to(p.dialog,{x:0,y:0,scaleX:1,scaleY:1,duration:OPEN,ease:standard,force3D:true},0);
    value.timeline.to(p.dialog,{clipPath:'inset(0px 0px 0px 0px)',duration:OPEN-OPEN_SURFACE_AT,ease:standard},OPEN_SURFACE_AT)
      .to(p.dialog,{borderRadius:finalRadius,duration:OPEN*.75,ease:standard},0);
    if(p.scrim)value.timeline.to(p.scrim,{opacity:SCRIM,duration:.15,ease:'none'},0);
    if(p.image)value.timeline.to(p.image,{keyframes:[
      {x:shift.x,y:shift.y,scale:1.025,duration:OPEN*.45,ease:standard},
      {x:0,y:0,scale:1,duration:OPEN*.55,ease:standard}
    ],overwrite:'auto',force3D:true},0);
    if(p.close)value.timeline.to(p.close,{autoAlpha:1,duration:.10,ease:'none'},.16);
    if(p.content.length)value.timeline.to(p.content,{autoAlpha:1,duration:.085,ease:'none',stagger:.005},OPEN_CONTENT_AT);
  });
  if(!ran)staticOpen(modal);
}

/* Recupera el estado expandido desde cualquier punto de un cierre interrumpido. */
function reopen(modal,link){
  if(!modal)return;var value=state(modal),p=parts(modal);if(!p)return;rememberSource(value,link||value.source);
  if(reduced()){staticOpen(modal);return;}
  var ran=SC.motion&&SC.motion.runLoaded&&SC.motion.runLoaded(function(deps){
    var gsap=deps.gsap,standard=curve('standard','power2.out');killTimeline(value);holdOverflow(value,p.dialog);
    value.timeline=gsap.timeline({defaults:{overwrite:'auto'},onComplete:function(){value.timeline=null;restoreOverflow(value);restoreSourceImage(value);clearParts(p,gsap);}})
      .to(p.dialog,{x:0,y:0,scaleX:1,scaleY:1,clipPath:'inset(0px 0px 0px 0px)',duration:.18,ease:standard},0);
    if(p.scrim)value.timeline.to(p.scrim,{opacity:SCRIM,duration:.12,ease:'none'},0);
    if(p.close)value.timeline.to(p.close,{autoAlpha:1,duration:.075,ease:'none'},.08);
    if(p.content.length)value.timeline.to(p.content,{autoAlpha:1,duration:.085,ease:'none',stagger:.005},.10);
    if(p.image)value.timeline.to(p.image,{x:0,y:0,scale:1,duration:.18,ease:standard},0);
  });
  if(!ran)staticOpen(modal);
}

/* El contenido sale primero; después la máscara vuelve a la imagen y retorna a la tarjeta. */
function close(modal,link,done){
  if(typeof link==='function'){done=link;link=null;}if(!modal){if(done)done();return;}
  var value=state(modal),p=parts(modal);rememberSource(value,link||value.source);if(!p){restoreSourceImage(value);if(done)done();return;}
  if(reduced()){restoreOverflow(value);restoreSourceImage(value);if(done)done();return;}
  var ran=SC.motion&&SC.motion.runLoaded&&SC.motion.runLoaded(function(deps){
    var gsap=deps.gsap,standard=curve('standard','power2.out');killTimeline(value);restoreSourceImage(value);holdOverflow(value,p.dialog);
    var source=sourceParts(value.source),dialogRect=getRect(p.dialog),stageRect=getRect(p.imageStage),origin=sourceTransform(source&&source.imageRect,dialogRect,stageRect);
    var bottom=valid(dialogRect)&&valid(stageRect)?clipForImage(dialogRect,stageRect):0,shift=parallax(source&&source.imageRect,stageRect),finalRadius=getComputedStyle(p.dialog).borderRadius||'0px';
    if(source&&origin)hideSourceImage(value,source);
    gsap.set(p.dialog,{x:0,y:0,scaleX:1,scaleY:1,clipPath:'inset(0px 0px 0px 0px)',borderRadius:finalRadius,transformOrigin:'0 0',willChange:'transform,clip-path,border-radius'});
    if(p.scrim)gsap.set(p.scrim,{opacity:SCRIM,willChange:'opacity'});
    if(p.close)gsap.set(p.close,{autoAlpha:1,willChange:'opacity'});
    if(p.content.length)gsap.set(p.content,{autoAlpha:1,willChange:'opacity'});
    if(p.image)gsap.set(p.image,{x:0,y:0,scale:1,willChange:'transform'});

    value.timeline=gsap.timeline({defaults:{overwrite:'auto'},onComplete:function(){
      value.timeline=null;restoreOverflow(value);restoreSourceImage(value);clearParts(p,gsap);if(done)done();
    }});
    if(p.content.length)value.timeline.to(p.content,{autoAlpha:0,duration:.075,ease:'none',stagger:{each:.004,from:'end'}},0);
    if(p.close)value.timeline.to(p.close,{autoAlpha:0,duration:.075,ease:'none'},0);
    value.timeline.to(p.dialog,{clipPath:'inset(0px 0px '+bottom+'px 0px)',duration:.16,ease:standard},CLOSE_SURFACE_AT);
    if(origin)value.timeline.to(p.dialog,{x:origin.x,y:origin.y,scaleX:origin.scaleX,scaleY:origin.scaleY,duration:CLOSE,ease:standard,force3D:true},0);
    else value.timeline.to(p.dialog,{autoAlpha:0,duration:.15,ease:'none'},.10);
    if(source)value.timeline.to(p.dialog,{borderRadius:source.radius||finalRadius,duration:CLOSE*.60,ease:standard},.075);
    if(p.scrim)value.timeline.to(p.scrim,{opacity:0,duration:CLOSE,ease:'none'},0);
    if(p.image)value.timeline.to(p.image,{keyframes:[
      {x:shift.x,y:shift.y,scale:1.025,duration:CLOSE*.45,ease:standard},
      {x:0,y:0,scale:1,duration:CLOSE*.55,ease:standard}
    ],overwrite:'auto',force3D:true},0);
  });
  if(!ran){restoreOverflow(value);restoreSourceImage(value);if(done)done();}
}
SC.productModalMotion={open:open,reopen:reopen,close:close,cancel:cancel};
})();