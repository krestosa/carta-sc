(function(){
'use strict';
var SC=window.SCOverride,Cfg=SC&&SC.config,S=Cfg&&Cfg.selectors,K=Cfg&&Cfg.classes,CFG=Cfg&&Cfg.categoryNav,N=SC&&SC.categoryNav,C=N&&N.railControls,P=N&&N.railPosition,SS=N&&N.stickyState;
if(!SC||!Cfg||!N||!C||!P||!SS||SC.__categoryNavRailBooted)return;SC.__categoryNavRailBooted=true;
var railRaf=0,overflowDirty=true,mobileInitialized=false;
function mobileScroller(){var rail=document.querySelector(S.categoryMobileWrapper+' '+S.categoryMobileRail);return rail&&rail.querySelector(S.categoryMobileScroller);}
function desktopScroller(){var rail=document.querySelector(S.categoryToolbar);return rail&&rail.querySelector(S.categoryScroller);}
function railState(){railRaf=0;var desktop=document.querySelector(S.categoryToolbar);if(desktop){var scroller=desktop.querySelector(S.categoryScroller);if(overflowDirty)C.overflow(desktop,scroller);var rect=desktop.getBoundingClientRect();SS.set(desktop,N.mq.matches&&scrollY>0&&rect.top<=CFG.stickyTolerance&&rect.bottom>0);}var wrapper=document.querySelector(S.categoryMobileWrapper),rail=wrapper&&wrapper.querySelector(S.categoryMobileRail),scroller=rail&&rail.querySelector(S.categoryMobileScroller);if(rail){if(N.mq.matches){if(overflowDirty)C.hide(rail);}else{if(!mobileInitialized&&scroller){scroller.scrollLeft=0;mobileInitialized=true;}if(overflowDirty)C.overflow(rail,scroller);}}if(wrapper){var wr=wrapper.getBoundingClientRect();SS.set(wrapper,!N.mq.matches&&scrollY>0&&wr.top<=CFG.stickyTolerance&&wr.bottom>0);}overflowDirty=false;}
function scheduleFrame(){if(!railRaf)railRaf=requestAnimationFrame(railState);}
function scheduleRail(){overflowDirty=true;scheduleFrame();}
function scheduleSticky(){scheduleFrame();}
function requestCenter(previous,target){if(document.body.classList.contains(K.catalogSearching)){scheduleRail();return;}if(N.mq.matches){var desktop=desktopScroller();if(desktop&&P.revealActive)P.revealActive(desktop,previous,target);}else{var mobile=mobileScroller();if(mobile)P.centerActive(mobile);}scheduleRail();}
N.scheduleRail=scheduleRail;N.scheduleSticky=scheduleSticky;N.requestCenterActive=requestCenter;N.scheduleRailState=scheduleRail;N.railState=railState;
})();
