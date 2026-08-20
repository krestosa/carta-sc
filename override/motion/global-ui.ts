(function(){
'use strict';
/* Motion global para superficies legacy que siguen montándose fuera de los componentes propios.
   Solo anima la aparición del dropdown y respeta la preferencia de movimiento reducido. */
var SC=window.SCOverride,C=SC&&SC.config,M=C&&C.motion,REDUCED_DURATION=.12,DURATION=.16,OFFSET_Y=-3;if(!SC||!C||!M||SC.__globalUiMotionBooted)return;SC.__globalUiMotionBooted=true;
if(!SC.motion||typeof SC.motion.whenReady!=='function')return;
var motionDeps:MotionDeps|null=null,initialized=false,EVENT='shown.bs.dropdown.scUxMotion';

/* Reacciona al evento existente y aplica una entrada breve sin asumir ownership del dropdown. */
function onShown(event:Event):void{
  if(!motionDeps||!window.jQuery)return;var menu=window.jQuery(event.target).find('> .dropdown-menu, .dropdown-menu').first()[0];if(!menu)return;
  var gsap=motionDeps.gsap,reduce=SC.motion.reduced();
  gsap.fromTo(menu,{autoAlpha:0,y:reduce?0:OFFSET_Y},{autoAlpha:1,y:0,duration:reduce?REDUCED_DURATION:DURATION,ease:M.easings.out,overwrite:true,clearProps:'transform,opacity,visibility'});
}

/* Instala y retira un único listener delegado cuando GSAP ya está disponible. */
function init():void{
  if(initialized||!motionDeps||!window.jQuery)return;initialized=true;window.jQuery(document).off(EVENT,onShown).on(EVENT,onShown);
}
function destroy():void{
  if(window.jQuery)window.jQuery(document).off(EVENT,onShown);initialized=false;
}
SC.globalUiMotion={init:init,destroy:destroy};
SC.motion.whenReady(function(deps:MotionDeps){motionDeps=deps;init();});
})();
