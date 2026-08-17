(function(){
'use strict';
var SC=window.SCOverride,Cfg=SC&&SC.config,S=Cfg&&Cfg.selectors,K=Cfg&&Cfg.classes,N=SC&&SC.categoryNav,C=N&&N.railControls,P=N&&N.railPosition,SS=N&&N.stickyState;
if(!SC||!Cfg||!N||!C||!P||!SS||SC.__categoryNavRailBooted)return;SC.__categoryNavRailBooted=true;
var railRaf=0,overflowDirty=true,stickyDirty=true,mobileInitialized=false,desktopTop=0,mobileTop=0,STICKY_TOLERANCE=.5;
function mobileScroller(){var rail=document.querySelector(N.selectors.mobileWrapper+' '+N.selectors.mobileRail);return rail&&rail.querySelector(N.selectors.mobileScroller);}
function desktopScroller(){var rail=document.querySelector(S.categoryToolbar);return rail&&rail.querySelector(N.selectors.scroller);}
function scrollTop(){return window.pageYOffset||document.documentElement.scrollTop||0;}
function pageTop(node){var top=0,current=node;while(current){top+=current.offsetTop||0;current=current.offsetParent;}return top;}
function railState(){
  railRaf=0;var desktop=document.querySelector(S.categoryToolbar),wrapper=document.querySelector(N.selectors.mobileWrapper),rail=wrapper&&wrapper.querySelector(N.selectors.mobileRail),desktopScroll=desktop&&desktop.querySelector(N.selectors.scroller),mobileScroll=rail&&rail.querySelector(N.selectors.mobileScroller),y=scrollTop();
  if(stickyDirty){if(desktop)desktopTop=pageTop(desktop);if(wrapper)mobileTop=pageTop(wrapper);stickyDirty=false;}
  if(desktop){if(overflowDirty)C.overflow(desktop,desktopScroll);SS.set(desktop,!!(N.mq.matches&&y>0&&y+STICKY_TOLERANCE>=desktopTop));}
  if(rail){if(N.mq.matches){if(overflowDirty)C.hide(rail);}else{if(!mobileInitialized&&mobileScroll){mobileScroll.scrollLeft=0;mobileInitialized=true;}if(overflowDirty)C.overflow(rail,mobileScroll);}}
  if(wrapper)SS.set(wrapper,!!(!N.mq.matches&&y>0&&y+STICKY_TOLERANCE>=mobileTop));
  overflowDirty=false;
}
function scheduleFrame(){if(!railRaf)railRaf=requestAnimationFrame(railState);}
function scheduleRail(){overflowDirty=true;stickyDirty=true;scheduleFrame();}
function scheduleSticky(){scheduleFrame();}
function cancel(){if(railRaf)cancelAnimationFrame(railRaf);railRaf=0;}
function requestCenter(previous,target){if(document.body.classList.contains(K.catalogSearching)){scheduleRail();return;}if(N.mq.matches){var desktop=desktopScroller();if(desktop&&P.revealActive)P.revealActive(desktop,previous,target);}else{var mobile=mobileScroller();if(mobile)P.centerActive(mobile);}scheduleRail();}
N.scheduleRail=scheduleRail;N.scheduleSticky=scheduleSticky;N.requestCenterActive=requestCenter;N.scheduleRailState=scheduleRail;N.railState=railState;N.cancelRailState=cancel;
})();
