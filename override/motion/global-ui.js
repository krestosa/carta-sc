(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,M=C&&C.motion;if(!SC||!C||!M||SC.__globalUiMotionBooted)return;SC.__globalUiMotionBooted=true;
if(!SC.motion||typeof SC.motion.whenReady!=='function')return;

SC.motion.whenReady(function(deps){
  if(!window.jQuery)return;
  var gsap=deps.gsap;
  window.jQuery(document).off('shown.bs.dropdown.scUxMotion').on('shown.bs.dropdown.scUxMotion',function(event){
    var menu=window.jQuery(event.target).find('> .dropdown-menu, .dropdown-menu').first()[0];if(!menu)return;
    var reduce=SC.motion.reduced();
    gsap.fromTo(menu,{autoAlpha:0,y:reduce?0:M.globalUiOffsetY},{
      autoAlpha:1,y:0,duration:reduce?M.reducedDuration:M.globalUiDuration,ease:M.easings.out,overwrite:true,clearProps:'transform,opacity,visibility'
    });
  });
});
})();