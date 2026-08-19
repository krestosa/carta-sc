/* Coordina apertura, reemplazo y cierre del detalle con capas independientes. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,MS=SC&&SC.productModalSelectors;
if(!SC||!C||!MS||SC.__productModalMotionBooted)return;SC.__productModalMotionBooted=true;
var OPEN=.5,CLOSE=.15,SHIFT=-50,SCRIM=.32;

function nextToken(modal){var token=(modal.__scModalMotionToken||0)+1;modal.__scModalMotionToken=token;return token;}
function current(modal,token){return modal&&modal.__scModalMotionToken===token;}
function nodes(modal){
  var dialog=modal&&modal.querySelector(MS.dialog),scrim=modal&&modal.querySelector('.sc-product-modal__scrim');
  if(!dialog)return null;
  var headline=dialog.querySelector('.sc-product-modal__title');
  var content=[].slice.call(dialog.querySelectorAll('.sc-product-modal__image-stage,.sc-product-modal__description,.sc-product-modal__price-row,.sc-product-modal__close'));
  var actions=dialog.querySelector('.sc-product-modal__actions');
  return{dialog:dialog,scrim:scrim,headline:headline,content:content,actions:actions};
}
function targets(parts){return[parts.scrim,parts.dialog,parts.headline,parts.actions].concat(parts.content).filter(Boolean);}
function clear(parts,gsap){
  if(!parts||!gsap)return;gsap.set(parts.dialog,{clearProps:'transform,opacity,visibility,willChange,--sc-modal-surface-height,--sc-modal-surface-opacity'});
  if(parts.scrim)gsap.set(parts.scrim,{clearProps:'opacity,willChange'});
  if(parts.headline)gsap.set(parts.headline,{clearProps:'opacity,willChange'});
  if(parts.content.length)gsap.set(parts.content,{clearProps:'opacity,willChange'});
  if(parts.actions)gsap.set(parts.actions,{clearProps:'opacity,willChange'});
}
function cancel(modal){if(!modal)return;nextToken(modal);if(!SC.motion||!SC.motion.runLoaded)return;SC.motion.runLoaded(function(deps){var p=nodes(modal);if(!p)return;deps.gsap.killTweensOf(targets(p));clear(p,deps.gsap);});}
function staticState(modal){var p=nodes(modal);if(!p)return;p.dialog.style.removeProperty('transform');p.dialog.style.removeProperty('opacity');p.dialog.style.removeProperty('visibility');p.dialog.style.setProperty('--sc-modal-surface-height','100%');p.dialog.style.setProperty('--sc-modal-surface-opacity','1');if(p.scrim)p.scrim.style.opacity=String(SCRIM);if(p.headline)p.headline.style.opacity='1';p.content.forEach(function(node){node.style.opacity='1';});if(p.actions)p.actions.style.opacity='1';}

/* Entrada: desplazamiento global, capa de fondo, superficie y contenido usan fases distintas. */
function open(modal){
  if(!modal)return;var token=nextToken(modal);
  if(SC.motion&&SC.motion.reduced&&SC.motion.reduced()){staticState(modal);return;}
  var ran=SC.motion&&SC.motion.run&&SC.motion.run(function(deps){
    var gsap=deps.gsap,p=nodes(modal);if(!p)return;var expand=SC.motion.curve('expand');gsap.killTweensOf(targets(p));
    gsap.set(p.dialog,{y:SHIFT,autoAlpha:0,'--sc-modal-surface-height':'35%','--sc-modal-surface-opacity':0,willChange:'transform,opacity'});
    if(p.scrim)gsap.set(p.scrim,{opacity:0,willChange:'opacity'});
    if(p.headline)gsap.set(p.headline,{opacity:0,willChange:'opacity'});
    if(p.content.length)gsap.set(p.content,{opacity:0,willChange:'opacity'});
    if(p.actions)gsap.set(p.actions,{opacity:0,willChange:'opacity'});
    var tl=gsap.timeline({defaults:{overwrite:'auto'},onComplete:function(){if(current(modal,token))clear(p,gsap);}});
    tl.to(p.dialog,{y:0,duration:OPEN,ease:expand,force3D:true},0)
      .to(p.dialog,{autoAlpha:1,duration:.05,ease:'none'},0)
      .to(p.dialog,{'--sc-modal-surface-height':'100%',duration:OPEN,ease:expand},0)
      .to(p.dialog,{'--sc-modal-surface-opacity':1,duration:.05,ease:'none'},0);
    if(p.scrim)tl.to(p.scrim,{opacity:SCRIM,duration:OPEN,ease:'none'},0);
    if(p.headline)tl.to(p.headline,{opacity:1,duration:.20,ease:'none'},.05);
    if(p.content.length)tl.to(p.content,{opacity:1,duration:.20,ease:'none'},.05);
    if(p.actions)tl.to(p.actions,{opacity:1,duration:.15,ease:'none'},.15);
  });
  if(!ran)staticState(modal);
}

/* Un reemplazo dentro del diálogo conserva su contexto y evita una segunda entrada completa. */
function reopen(modal){if(!modal)return;nextToken(modal);if(SC.motion&&SC.motion.runLoaded)SC.motion.runLoaded(function(deps){var p=nodes(modal);if(!p)return;deps.gsap.killTweensOf(targets(p));clear(p,deps.gsap);});staticState(modal);}

/* Salida: contenido primero, luego superficie, scrim y desplazamiento vertical. */
function close(modal,done){
  if(!modal){if(done)done();return;}var token=nextToken(modal);
  if(SC.motion&&SC.motion.reduced&&SC.motion.reduced()){if(done)done();return;}
  var ran=SC.motion&&SC.motion.runLoaded&&SC.motion.runLoaded(function(deps){
    var gsap=deps.gsap,p=nodes(modal);if(!p){if(done)done();return;}var exit=SC.motion.curve('exit');gsap.killTweensOf(targets(p));
    gsap.set(p.dialog,{'--sc-modal-surface-height':'100%','--sc-modal-surface-opacity':1,willChange:'transform,opacity'});
    if(p.scrim)gsap.set(p.scrim,{opacity:SCRIM,willChange:'opacity'});
    var tl=gsap.timeline({defaults:{overwrite:'auto'},onComplete:function(){if(current(modal,token)&&done)done();}});
    tl.to(p.dialog,{y:SHIFT,duration:CLOSE,ease:exit,force3D:true},0)
      .to(p.dialog,{'--sc-modal-surface-height':'35%',duration:CLOSE,ease:exit},0)
      .to(p.dialog,{autoAlpha:0,duration:.05,ease:'none'},.10)
      .to(p.dialog,{'--sc-modal-surface-opacity':0,duration:.05,ease:'none'},.10);
    if(p.scrim)tl.to(p.scrim,{opacity:0,duration:CLOSE,ease:'none'},0);
    if(p.headline)tl.to(p.headline,{opacity:0,duration:.10,ease:'none'},0);
    if(p.content.length)tl.to(p.content,{opacity:0,duration:.10,ease:'none'},0);
    if(p.actions)tl.to(p.actions,{opacity:0,duration:.10,ease:'none'},0);
  });
  if(!ran&&done)done();
}
SC.productModalMotion={open:open,reopen:reopen,close:close,cancel:cancel};
})();