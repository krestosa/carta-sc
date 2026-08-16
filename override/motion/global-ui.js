(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,M=C&&C.motion,REDUCED_DURATION=.12,DURATION=.16,OFFSET_Y=-3;if(!SC||!C||!M||SC.__globalUiMotionBooted)return;SC.__globalUiMotionBooted=true;
if(!SC.motion||typeof SC.motion.whenReady!=='function')return;
var motionDeps=null,initialized=false,EVENT='shown.bs.dropdown.scUxMotion';
function onShown(event){
  if(!motionDeps||!window.jQuery)return;var menu=window.jQuery(event.target).find('> .dropdown-menu, .dropdown-menu').first()[0];if(!menu)return;
  var gsap=motionDeps.gsap,reduce=SC.motion.reduced();
  gsap.fromTo(menu,{autoAlpha:0,y:reduce?0:OFFSET_Y},{autoAlpha:1,y:0,duration:reduce?REDUCED_DURATION:DURATION,ease:M.easings.out,overwrite:true,clearProps:'transform,opacity,visibility'});
}
function init(){
  if(initialized||!motionDeps||!window.jQuery)return;initialized=true;window.jQuery(document).off(EVENT,onShown).on(EVENT,onShown);
}
function destroy(){
  if(window.jQuery)window.jQuery(document).off(EVENT,onShown);initialized=false;
}
SC.globalUiMotion={init:init,destroy:destroy};
SC.motion.whenReady(function(deps){motionDeps=deps;init();});
})();