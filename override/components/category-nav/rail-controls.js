(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,K=C&&C.classes,CFG=C&&C.categoryNav,N=SC&&SC.categoryNav,T=SC&&SC.templates;if(!SC||!N||!T||SC.__categoryNavRailControlsBooted)return;SC.__categoryNavRailControlsBooted=true;
function arrow(host,scroller,dir){var button=host.querySelector('.sc-rail-arrow--'+dir);if(button)return button;button=T.clone('category-arrow-'+dir);button.addEventListener('click',function(){var x=Math.max(CFG.railStepMin,Math.round(scroller.clientWidth*CFG.railStepRatio))*(dir==='left'?-1:1);try{scroller.scrollBy({left:x,behavior:C.queries.reducedMotion.matches?'auto':'smooth'});}catch(_){scroller.scrollLeft+=x;}if(N.scheduleRail)N.scheduleRail();});host.appendChild(button);return button;}
function state(button,canScroll){if(!button)return;button.style.setProperty('opacity','1','important');button.style.setProperty('visibility','visible','important');button.style.setProperty('pointer-events','auto','important');button.disabled=!canScroll;button.setAttribute('aria-disabled',canScroll?'false':'true');}
function hidden(button){if(!button)return;button.style.setProperty('opacity','0','important');button.style.setProperty('visibility','hidden','important');button.style.setProperty('pointer-events','none','important');button.disabled=true;button.setAttribute('aria-disabled','true');}
function overflow(host,scroller){if(!host||!scroller)return;var max=Math.max(0,scroller.scrollWidth-scroller.clientWidth),left=max>1&&scroller.scrollLeft>1,right=max>1&&scroller.scrollLeft<max-1;host.classList.toggle(K.overflowLeft,left);host.classList.toggle(K.overflowRight,right);state(arrow(host,scroller,'left'),left);state(arrow(host,scroller,'right'),right);}
function hide(host){if(!host)return;host.classList.remove(K.overflowLeft,K.overflowRight);Array.prototype.forEach.call(host.querySelectorAll(S.railArrow),hidden);}
N.railControls={overflow:overflow,hide:hide};
})();
