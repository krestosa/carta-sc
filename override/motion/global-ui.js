(function(){
'use strict';
var SC=window.SCOverride;if(!SC||SC.__globalUiMotionBooted)return;SC.__globalUiMotionBooted=true;
if(!SC.motion||typeof SC.motion.whenReady!=='function')return;

SC.motion.whenReady(function(deps){
  if(!window.jQuery)return;
  var gsap=deps.gsap;
  window.jQuery(document).off('shown.bs.dropdown.scUxMotion').on('shown.bs.dropdown.scUxMotion',function(event){
    var menu=window.jQuery(event.target).find('> .dropdown-menu, .dropdown-menu').first()[0];if(!menu)return;
    var reduce=SC.motion.reduced();
    gsap.fromTo(menu,{autoAlpha:0,y:reduce?0:-3},{
      autoAlpha:1,y:0,duration:reduce?0.12:0.16,ease:'power2.out',overwrite:true,clearProps:'transform,opacity,visibility'
    });
  });
});
})();