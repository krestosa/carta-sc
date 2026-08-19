/* Mantiene visible la categoría activa sin cortar el traslado visual del indicador. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,N=SC&&SC.categoryNav;if(!SC||!C||!N||SC.__categoryNavRailPositionBooted)return;SC.__categoryNavRailPositionBooted=true;
var SCROLL_MARGIN=48;
function activeLink(scroller){return scroller&&scroller.querySelector("a.anchorLink.sc-motion-current,a.anchorLink[aria-current=\"location\"]");}
function clamp(x,scroller){var max=Math.max(0,scroller.scrollWidth-scroller.clientWidth);return Math.max(0,Math.min(max,x));}
/* Desplaza sólo lo necesario para conservar 48px de margen alrededor del tab activo. */
function positionActive(scroller){
  var active=activeLink(scroller);if(!active)return;
  var sr=scroller.getBoundingClientRect(),rect=active.getBoundingClientRect(),scroll=scroller.scrollLeft,offset=scroll+(rect.left-sr.left),extent=rect.width,hostExtent=scroller.clientWidth,min=offset-SCROLL_MARGIN,max=offset+extent-hostExtent+SCROLL_MARGIN,to=clamp(Math.min(min,Math.max(max,scroll)),scroller),behavior=C.queries.reducedMotion.matches?'auto':'smooth';
  if(Math.abs(to-scroll)<1)return;
  try{scroller.scrollTo({behavior:behavior,top:0,left:to});}catch(_){scroller.scrollLeft=to;}
}
function centerActive(scroller){positionActive(scroller);}
function revealActive(scroller){positionActive(scroller);}
N.railPosition={centerActive:centerActive,revealActive:revealActive};N.centerActive=centerActive;N.revealActive=revealActive;
})();