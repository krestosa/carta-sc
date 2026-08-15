(function(){
'use strict';
var SC=window.SCOverride,N=SC&&SC.categoryNav;if(!SC||!N||SC.__categoryNavRailPositionBooted)return;SC.__categoryNavRailPositionBooted=true;
function centerActive(scroller){if(!scroller)return;var active=scroller.querySelector('a.anchorLink.sc-motion-current,a.anchorLink[aria-current="location"]');if(!active)return;var sr=scroller.getBoundingClientRect(),rect=active.getBoundingClientRect();var x=scroller.scrollLeft+(rect.left+rect.width/2-(sr.left+sr.width/2)),max=Math.max(0,scroller.scrollWidth-scroller.clientWidth);x=Math.max(0,Math.min(max,x));if(Math.abs(x-scroller.scrollLeft)<1)return;try{scroller.scrollTo({left:x,top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}catch(_){scroller.scrollLeft=x;}}
N.railPosition={centerActive:centerActive};N.centerActive=centerActive;
})();