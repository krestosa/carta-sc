/* Motion del modal de producto alineado con el diálogo de Material Web. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,MS=SC&&SC.productModalSelectors,T=SC&&SC.transitionPatterns;
if(!SC||!C||!MS||SC.__productModalMotionBooted)return;SC.__productModalMotionBooted=true;

var OPEN=.50,CLOSE=.15,SCRIM=.32,states=new WeakMap();
function webEase(){return T&&T.easing&&T.easing.webEmphasized?T.easing.webEmphasized:function(p){return p;};}
function accelerate(){return T&&T.easing&&T.easing.accelerate?T.easing.accelerate:function(p){return p;};}
function reduced(){return SC.motion&&SC.motion.reduced?SC.motion.reduced():!!(C.queries&&C.queries.reducedMotion&&C.queries.reducedMotion.matches);}
function parts(modal){
  var dialog=modal&&modal.querySelector(MS.dialog);if(!dialog)return null;
  return{
    dialog:dialog,
    scrim:modal.querySelector('.sc-product-modal__scrim'),
    close:dialog.querySelector('.sc-product-modal__close'),
    imageStage:dialog.querySelector('.sc-product-modal__image-stage'),
    headline:dialog.querySelector('.sc-product-modal__title'),
    description:dialog.querySelector('.sc-product-modal__description'),
    price:dialog.querySelector('.sc-product-modal__price-row'),
    actions:dialog.querySelector('.sc-product-modal__actions')
  };
}
function state(modal){var value=states.get(modal);if(!value){value={timeline:null};states.set(modal,value);}return value;}
function kill(value){if(value&&value.timeline){try{value.timeline.kill();}catch(_){}value.timeline=null;}}
function group(){return Array.prototype.slice.call(arguments).filter(Boolean);}
function clearNode(node,names){if(!node)return;names.forEach(function(name){node.style.removeProperty(name);});}
function clear(p,gsap){
  if(!p)return;
  var content=group(p.headline,p.close,p.imageStage,p.description,p.price,p.actions);
  if(gsap){gsap.set(p.dialog,{clearProps:'transform,willChange'});if(p.scrim)gsap.set(p.scrim,{clearProps:'opacity,willChange'});if(content.length)gsap.set(content,{clearProps:'opacity,willChange'});}
  else{clearNode(p.dialog,['transform','will-change']);clearNode(p.scrim,['opacity','will-change']);content.forEach(function(node){clearNode(node,['opacity','will-change']);});}
  p.dialog.style.removeProperty('--sc-modal-surface-height');
  p.dialog.style.removeProperty('--sc-modal-surface-opacity');
}
function setStaticOpen(p,gsap){
  if(!p)return;
  clear(p,gsap);p.dialog.style.setProperty('--sc-modal-surface-height','100%');p.dialog.style.setProperty('--sc-modal-surface-opacity','1');
  if(gsap){gsap.set(p.dialog,{y:0});if(p.scrim)gsap.set(p.scrim,{opacity:SCRIM});gsap.set(group(p.headline,p.close,p.imageStage,p.description,p.price,p.actions),{opacity:1});}
  else{p.dialog.style.transform='translateY(0)';if(p.scrim)p.scrim.style.opacity=String(SCRIM);group(p.headline,p.close,p.imageStage,p.description,p.price,p.actions).forEach(function(node){node.style.opacity='1';});}
}
function staticOpen(modal){var p=parts(modal);if(!p)return;setStaticOpen(p,null);}
function staticClose(modal,done){var p=parts(modal);if(p)clear(p,null);if(done)done();}
function openTimeline(modal,value,gsap){
  var p=parts(modal);if(!p){staticOpen(modal);return;}
  kill(value);clear(p,gsap);
  if(reduced()){setStaticOpen(p,gsap);return;}
  var headline=group(p.headline,p.close),content=group(p.imageStage,p.description,p.price),actions=group(p.actions);
  gsap.set(p.dialog,{y:-50,willChange:'transform'});
  p.dialog.style.setProperty('--sc-modal-surface-height','35%');p.dialog.style.setProperty('--sc-modal-surface-opacity','0');
  if(p.scrim)gsap.set(p.scrim,{opacity:0,willChange:'opacity'});
  if(headline.length)gsap.set(headline,{opacity:0,willChange:'opacity'});
  if(content.length)gsap.set(content,{opacity:0,willChange:'opacity'});
  if(actions.length)gsap.set(actions,{opacity:0,willChange:'opacity'});
  value.timeline=gsap.timeline({onComplete:function(){value.timeline=null;clear(p,gsap);}})
    .to(p.dialog,{y:0,duration:OPEN,ease:webEase(),overwrite:'auto'},0)
    .to(p.dialog,{'--sc-modal-surface-height':'100%',duration:OPEN,ease:webEase(),overwrite:'auto'},0)
    .to(p.dialog,{'--sc-modal-surface-opacity':1,duration:.05,ease:'none',overwrite:'auto'},0);
  if(p.scrim)value.timeline.to(p.scrim,{opacity:SCRIM,duration:OPEN,ease:'none',overwrite:'auto'},0);
  if(headline.length)value.timeline.to(headline,{opacity:1,duration:.20,ease:'none',overwrite:'auto'},.05);
  if(content.length)value.timeline.to(content,{opacity:1,duration:.20,ease:'none',overwrite:'auto'},.05);
  if(actions.length)value.timeline.to(actions,{opacity:1,duration:.15,ease:'none',overwrite:'auto'},.15);
}
function closeTimeline(modal,value,gsap,done){
  var p=parts(modal);if(!p){if(done)done();return;}
  kill(value);clear(p,gsap);
  if(reduced()){clear(p,gsap);if(done)done();return;}
  var headline=group(p.headline,p.close),content=group(p.imageStage,p.description,p.price),actions=group(p.actions),all=group.apply(null,headline.concat(content,actions));
  gsap.set(p.dialog,{y:0,willChange:'transform'});
  p.dialog.style.setProperty('--sc-modal-surface-height','100%');p.dialog.style.setProperty('--sc-modal-surface-opacity','1');
  if(p.scrim)gsap.set(p.scrim,{opacity:SCRIM,willChange:'opacity'});
  if(all.length)gsap.set(all,{opacity:1,willChange:'opacity'});
  value.timeline=gsap.timeline({onComplete:function(){value.timeline=null;clear(p,gsap);if(done)done();}})
    .to(p.dialog,{y:-50,duration:CLOSE,ease:accelerate(),overwrite:'auto'},0)
    .to(p.dialog,{'--sc-modal-surface-height':'35%',duration:CLOSE,ease:accelerate(),overwrite:'auto'},0)
    .to(p.dialog,{'--sc-modal-surface-opacity':0,duration:.05,ease:'none',overwrite:'auto'},.10);
  if(p.scrim)value.timeline.to(p.scrim,{opacity:0,duration:CLOSE,ease:'none',overwrite:'auto'},0);
  if(headline.length)value.timeline.to(headline,{opacity:0,duration:.10,ease:'none',overwrite:'auto'},0);
  if(content.length)value.timeline.to(content,{opacity:0,duration:.10,ease:'none',overwrite:'auto'},0);
  if(actions.length)value.timeline.to(actions,{opacity:0,duration:.10,ease:'none',overwrite:'auto'},0);
}
function open(modal){
  if(!modal)return;var value=state(modal),ran=SC.motion&&SC.motion.runLoaded&&SC.motion.runLoaded(function(deps){openTimeline(modal,value,deps.gsap);});if(!ran)staticOpen(modal);
}
function reopen(modal){open(modal);}
function close(modal,link,done){
  if(typeof link==='function'){done=link;link=null;}if(!modal){if(done)done();return;}var value=state(modal),ran=SC.motion&&SC.motion.runLoaded&&SC.motion.runLoaded(function(deps){closeTimeline(modal,value,deps.gsap,done);});if(!ran)staticClose(modal,done);
}
function cancel(modal){if(!modal)return;var value=states.get(modal),p=parts(modal);if(value)kill(value);if(SC.motion&&SC.motion.runLoaded)SC.motion.runLoaded(function(deps){clear(p,deps.gsap);});else clear(p,null);states.delete(modal);}
SC.productModalMotion={open:open,reopen:reopen,close:close,cancel:cancel};
})();
