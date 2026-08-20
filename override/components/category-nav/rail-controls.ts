/* Gestiona flechas y estados de overflow del riel. Los controles se crean una sola vez
   por host y su estado se deriva siempre del scroll real del contenedor. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,N=SC&&SC.categoryNav,T=SC&&SC.templates;if(!SC||!N||!T||SC.__categoryNavRailControlsBooted)return;SC.__categoryNavRailControlsBooted=true;var RAIL_STEP_MIN=140,RAIL_STEP_RATIO=.65;
type RailDirection='left'|'right';
type RailButton=HTMLButtonElement&{__scRailState?:'enabled'|'disabled'|'hidden'};
type RailHost=HTMLElement&{__scRailArrows?:Partial<Record<RailDirection,RailButton>>};
/* Crea la flecha bajo demanda y desplaza una fracción estable del ancho visible. */
function arrow(host:RailHost,scroller:HTMLElement,dir:RailDirection):RailButton{var cache=host.__scRailArrows||(host.__scRailArrows={}),button=cache[dir];if(button&&host.contains(button))return button;button=host.querySelector<RailButton>('.'+"sc-rail-arrow--"+dir)||undefined;if(button){cache[dir]=button;return button;}button=T.clone('category-arrow-'+dir) as RailButton;button.addEventListener('click',function(){var x=Math.max(RAIL_STEP_MIN,Math.round(scroller.clientWidth*RAIL_STEP_RATIO))*(dir==='left'?-1:1);try{scroller.scrollBy({left:x,behavior:C.queries.reducedMotion.matches?'auto':'smooth'});}catch(_error){scroller.scrollLeft+=x;}if(N.scheduleOverflow)N.scheduleOverflow();else if(N.scheduleRail)N.scheduleRail();});host.appendChild(button);cache[dir]=button;return button;}
function state(button:RailButton|null,canScroll:boolean):void{if(!button)return;var next:'enabled'|'disabled'=canScroll?'enabled':'disabled';if(button.__scRailState===next)return;button.__scRailState=next;button.style.setProperty('opacity','1','important');button.style.setProperty('visibility','visible','important');button.style.setProperty('pointer-events','auto','important');button.disabled=!canScroll;button.setAttribute('aria-disabled',canScroll?'false':'true');}
function hidden(button:RailButton):void{if(button.__scRailState==='hidden')return;button.__scRailState='hidden';button.style.setProperty('opacity','0','important');button.style.setProperty('visibility','hidden','important');button.style.setProperty('pointer-events','none','important');button.disabled=true;button.setAttribute('aria-disabled','true');}
/* Calcula qué dirección todavía tiene contenido y sincroniza clases + botones. */
function overflow(host:RailHost|null,scroller:HTMLElement|null):void{if(!host||!scroller)return;var max=Math.max(0,scroller.scrollWidth-scroller.clientWidth),left=max>1&&scroller.scrollLeft>1,right=max>1&&scroller.scrollLeft<max-1;host.classList.toggle("sc-overflow-left",left);host.classList.toggle("sc-overflow-right",right);state(arrow(host,scroller,'left'),left);state(arrow(host,scroller,'right'),right);}
function hide(host:RailHost|null):void{if(!host)return;host.classList.remove("sc-overflow-left","sc-overflow-right");host.querySelectorAll<RailButton>(".sc-rail-arrow").forEach(hidden);}
N.railControls={overflow:overflow,hide:hide};
})();