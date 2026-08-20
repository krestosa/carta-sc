/* Mantiene visible la categoría activa dentro del riel horizontal. En desktop adelanta
   espacio en la dirección de avance; en mobile centra el elemento para dar contexto. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,N=SC&&SC.categoryNav;if(!SC||!C||!N||SC.__categoryNavRailPositionBooted)return;SC.__categoryNavRailPositionBooted=true;var CENTER_RATIO=.5,DESKTOP_FORWARD_RATIO=.32,DESKTOP_BACKWARD_RATIO=.68;
function activeLink(scroller:HTMLElement):HTMLAnchorElement|null{return scroller.querySelector<HTMLAnchorElement>("a.anchorLink.sc-motion-current,a.anchorLink[aria-current=\"location\"]");}
function clamp(x:number,scroller:HTMLElement):number{var max=Math.max(0,scroller.scrollWidth-scroller.clientWidth);return Math.max(0,Math.min(max,x));}
/* Usa scroll nativo suave y cae a asignación directa cuando el navegador no lo soporta. */
function go(scroller:HTMLElement,x:number):void{x=clamp(x,scroller);if(Math.abs(x-scroller.scrollLeft)<1)return;try{scroller.scrollTo({left:x,top:0,behavior:C.queries.reducedMotion.matches?'auto':'smooth'});}catch(_error){scroller.scrollLeft=x;}}
function positionActive(scroller:HTMLElement,ratio:number):void{var active=activeLink(scroller);if(!active)return;var sr=scroller.getBoundingClientRect(),rect=active.getBoundingClientRect();go(scroller,scroller.scrollLeft+(rect.left+rect.width/2-(sr.left+sr.width*ratio)));}
function targetIndex(scroller:HTMLElement,target:Element|null):number{if(!target)return-1;var list=N.links(scroller) as HTMLAnchorElement[];for(var i=0;i<list.length;i++)if(N.anchor(list[i]!.getAttribute('href'))===target)return i;return-1;}
function centerActive(scroller:HTMLElement):void{positionActive(scroller,CENTER_RATIO);}
function revealActive(scroller:HTMLElement,previous:Element|null,target:Element|null):void{var from=targetIndex(scroller,previous),to=targetIndex(scroller,target),ratio=to>=0&&from>=0&&to<from?DESKTOP_BACKWARD_RATIO:DESKTOP_FORWARD_RATIO;positionActive(scroller,ratio);}
N.railPosition={centerActive:centerActive,revealActive:revealActive};N.centerActive=centerActive;N.revealActive=revealActive;
})();