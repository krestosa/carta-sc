(function(){
'use strict';
var SC=window.SCOverride,N=SC&&SC.categoryNav;if(!SC||!N||SC.__categoryNavRailPositionBooted)return;SC.__categoryNavRailPositionBooted=true;
function activeLink(scroller){return scroller&&scroller.querySelector('a.anchorLink.sc-motion-current,a.anchorLink[aria-current="location"]');}
function clamp(x,scroller){var max=Math.max(0,scroller.scrollWidth-scroller.clientWidth);return Math.max(0,Math.min(max,x));}
function go(scroller,x){x=clamp(x,scroller);if(Math.abs(x-scroller.scrollLeft)<1)return;try{scroller.scrollTo({left:x,top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}catch(_){scroller.scrollLeft=x;}}
function centerActive(scroller){var active=activeLink(scroller);if(!active)return;var sr=scroller.getBoundingClientRect(),rect=active.getBoundingClientRect();go(scroller,scroller.scrollLeft+(rect.left+rect.width/2-(sr.left+sr.width/2)));}
function revealActive(scroller){var active=activeLink(scroller);if(!active)return;var sr=scroller.getBoundingClientRect(),rect=active.getBoundingClientRect(),pad=Math.min(32,Math.max(18,sr.width*.04)),x=scroller.scrollLeft;if(rect.left<sr.left+pad)x+=rect.left-(sr.left+pad);else if(rect.right>sr.right-pad)x+=rect.right-(sr.right-pad);go(scroller,x);}
N.railPosition={centerActive:centerActive,revealActive:revealActive};N.centerActive=centerActive;N.revealActive=revealActive;
})();