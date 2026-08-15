(function(){
'use strict';
var SC=window.SCOverride,N=SC&&SC.categoryNav;if(!SC||!N||SC.__categoryNavRailPositionBooted)return;SC.__categoryNavRailPositionBooted=true;
function activeLink(scroller){return scroller&&scroller.querySelector('a.anchorLink.sc-motion-current,a.anchorLink[aria-current="location"]');}
function clamp(x,scroller){var max=Math.max(0,scroller.scrollWidth-scroller.clientWidth);return Math.max(0,Math.min(max,x));}
function go(scroller,x){x=clamp(x,scroller);if(Math.abs(x-scroller.scrollLeft)<1)return;try{scroller.scrollTo({left:x,top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}catch(_){scroller.scrollLeft=x;}}
function positionActive(scroller,ratio){var active=activeLink(scroller);if(!active)return;var sr=scroller.getBoundingClientRect(),rect=active.getBoundingClientRect();go(scroller,scroller.scrollLeft+(rect.left+rect.width/2-(sr.left+sr.width*ratio)));}
function targetIndex(scroller,target){if(!target)return-1;var list=N.links(scroller);for(var i=0;i<list.length;i++)if(N.anchor(list[i].getAttribute('href'))===target)return i;return-1;}
function centerActive(scroller){positionActive(scroller,.5);}
function revealActive(scroller,previous,target){var from=targetIndex(scroller,previous),to=targetIndex(scroller,target),ratio=to>=0&&from>=0&&to<from?.68:.32;positionActive(scroller,ratio);}
N.railPosition={centerActive:centerActive,revealActive:revealActive};N.centerActive=centerActive;N.revealActive=revealActive;
})();
