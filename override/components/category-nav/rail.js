(function(){
'use strict';
var SC=window.SCOverride,N=SC&&SC.categoryNav,C=N&&N.railControls,P=N&&N.railPosition,S=N&&N.stickyState;
if(!SC||!N||!C||!P||!S||SC.__categoryNavRailBooted)return;SC.__categoryNavRailBooted=true;
var railRaf=0,overflowDirty=true,centerPending=true;
function railState(){
  railRaf=0;var desktop=document.querySelector('.sc-catalog-toolbar');
  if(desktop){var scroller=desktop.querySelector('.sc-catalog-categories');if(overflowDirty)C.overflow(desktop,scroller);var rect=desktop.getBoundingClientRect();S.set(desktop,N.mq.matches&&scrollY>0&&rect.top<=.5&&rect.bottom>0);}
  var wrapper=document.querySelector('.fixedTopShop.wtopShopMenuMobile'),rail=wrapper&&wrapper.querySelector('.topShopMenuMobile'),mobileScroller=rail&&rail.querySelector('.topShopMenuMobileScroller');
  if(rail){if(N.mq.matches){centerPending=true;if(overflowDirty)C.hide(rail);}else{if(overflowDirty)C.overflow(rail,mobileScroller);if(centerPending){P.centerActive(mobileScroller);centerPending=false;}}}
  if(wrapper){var wr=wrapper.getBoundingClientRect();S.set(wrapper,!N.mq.matches&&scrollY>0&&wr.top<=.5&&wr.bottom>0);}overflowDirty=false;
}
function scheduleFrame(){if(!railRaf)railRaf=requestAnimationFrame(railState);}function scheduleRail(){overflowDirty=true;scheduleFrame();}function scheduleSticky(){scheduleFrame();}function requestCenter(){centerPending=true;scheduleFrame();}
N.scheduleRail=scheduleRail;N.scheduleSticky=scheduleSticky;N.requestCenterActive=requestCenter;N.scheduleRailState=scheduleRail;N.railState=railState;
})();