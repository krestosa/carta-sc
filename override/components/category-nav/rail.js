(function(){
'use strict';
var SC=window.SCOverride,Cfg=SC&&SC.config,S=Cfg&&Cfg.selectors,K=Cfg&&Cfg.classes,N=SC&&SC.categoryNav,C=N&&N.railControls,P=N&&N.railPosition,SS=N&&N.stickyState;
if(!SC||!Cfg||!N||!C||!P||!SS||SC.__categoryNavRailBooted)return;SC.__categoryNavRailBooted=true;
var railRaf=0,overflowDirty=true,mobileInitialized=false,STICKY_TOLERANCE=.5;
function mobileScroller(){var rail=document.querySelector(N.selectors.mobileWrapper+' '+N.selectors.mobileRail);return rail&&rail.querySelector(N.selectors.mobileScroller);}
function desktopScroller(){var rail=document.querySelector(S.categoryToolbar);return rail&&rail.querySelector(N.selectors.scroller);}
function railState(){railRaf=0;var desktop=document.querySelector(S.categoryToolbar);if(desktop){var scroller=desktop.querySelector(N.selectors.scroller);if(overflowDirty)C.overflow(desktop,scroller);var rect=desktop.getBoundingClientRect();SS.set(desktop,N.mq.matches&&scrollY>0&&rect.top<=STICKY_TOLERANCE&&rect.bottom>0);}var wrapper=document.querySelector(N.selectors.mobileWrapper),rail=wrapper&&wrapper.querySelector(N.selectors.mobileRail),scroller=rail&&rail.querySelector(N.selectors.mobileScroller);if(rail){if(N.mq.matches){if(overflowDirty)C.hide(rail);}else{if(!mobileInitialized&&scroller){scroller.scrollLeft=0;mobileInitialized=true;}if(overflowDirty)C.overflow(rail,scroller);}}if(wrapper){var wr=wrapper.getBoundingClientRect();SS.set(wrapper,!N.mq.matches&&scrollY>0&&wr.top<=STICKY_TOLERANCE&&wr.bottom>0);}overflowDirty=false;}
function scheduleFrame(){if(!railRaf)railRaf=requestAnimationFrame(railState);}
function scheduleRail(){overflowDirty=true;scheduleFrame();}
function scheduleSticky(){scheduleFrame();}
function cancel(){if(railRaf)cancelAnimationFrame(railRaf);railRaf=0;}
function requestCenter(previous,target){if(document.body.classList.contains(K.catalogSearching)){scheduleRail();return;}if(N.mq.matches){var desktop=desktopScroller();if(desktop&&P.revealActive)P.revealActive(desktop,previous,target);}else{var mobile=mobileScroller();if(mobile)P.centerActive(mobile);}scheduleRail();}
N.scheduleRail=scheduleRail;N.scheduleSticky=scheduleSticky;N.requestCenterActive=requestCenter;N.scheduleRailState=scheduleRail;N.railState=railState;N.cancelRailState=cancel;
})();
