(function(){
'use strict';
/* Motion global para superficies legacy que siguen montándose fuera de los componentes propios.
   Solo anima la aparición del dropdown y respeta la preferencia de movimiento reducido. */
var SC=window.SCOverride,C=SC&&SC.config,M=C&&C.motion,OFFSET_Y=-4;if(!SC||!C||!M||SC.__globalUiMotionBooted)return;SC.__globalUiMotionBooted=true;
if(!SC.motion||typeof SC.motion.whenReady!=='function')return;
var motionDeps=null,initialized=false,EVENT='shown.bs.dropdown.scUxMotion';

/* Reacciona al evento existente y separa desplazamiento de opacidad. */
function onShown(event){
  if(!motionDeps||!window.jQuery)return;var menu=window.jQuery(event.target).find('> .dropdown-menu, .dropdown-menu').first()[0];if(!menu)return;
  var gsap=motionDeps.gsap,reduce=SC.motion.reduced(),spatial=SC.motion.springSpec('spatial','fast'),effects=SC.motion.springSpec('effects','fast');
  gsap.killTweensOf(menu);
  if(reduce){gsap.fromTo(menu,{autoAlpha:0},{autoAlpha:1,duration:effects.duration,ease:effects.ease,overwrite:'auto',clearProps:'opacity,visibility'});return;}
  gsap.set(menu,{autoAlpha:0,y:OFFSET_Y,willChange:'transform,opacity'});
  gsap.timeline({onComplete:function(){gsap.set(menu,{clearProps:'transform,opacity,visibility,willChange'});}})
    .to(menu,{autoAlpha:1,duration:effects.duration,ease:effects.ease,overwrite:'auto'},0)
    .to(menu,{y:0,duration:spatial.duration,ease:spatial.ease,overwrite:'auto',force3D:true},0);
}

/* Instala y retira un único listener delegado cuando GSAP ya está disponible. */
function init(){
  if(initialized||!motionDeps||!window.jQuery)return;initialized=true;window.jQuery(document).off(EVENT,onShown).on(EVENT,onShown);
}
function destroy(){
  if(window.jQuery)window.jQuery(document).off(EVENT,onShown);initialized=false;
}
SC.globalUiMotion={init:init,destroy:destroy};
SC.motion.whenReady(function(deps){motionDeps=deps;init();});
})();