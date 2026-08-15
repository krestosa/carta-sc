(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,N=SC&&SC.categoryNav;if(!SC||!U||!N||SC.__categoryNavRailBooted)return;SC.__categoryNavRailBooted=true;
var each=U.each,railRaf=0;

function arrow(host,scroller,dir){
  var button=host.querySelector('.sc-rail-arrow--'+dir);if(button)return button;
  button=document.createElement('button');button.type='button';button.className='sc-rail-arrow sc-rail-arrow--'+dir;
  button.setAttribute('aria-label',dir==='left'?'Ver categorías anteriores':'Ver más categorías');
  button.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#666" aria-hidden="true"><path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"/></svg>';
  button.addEventListener('click',function(){
    var x=Math.max(140,Math.round(scroller.clientWidth*.65))*(dir==='left'?-1:1);
    try{scroller.scrollBy({left:x,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}catch(_){scroller.scrollLeft+=x;}
    scheduleRail();
  });
  host.appendChild(button);return button;
}
function arrowVisible(button,on){
  if(!button)return;
  button.style.setProperty('opacity',on?'1':'0','important');
  button.style.setProperty('visibility',on?'visible':'hidden','important');
  button.style.setProperty('pointer-events',on?'auto':'none','important');
  button.disabled=!on;
}
function overflow(host,scroller){
  if(!host||!scroller)return;
  var max=Math.max(0,scroller.scrollWidth-scroller.clientWidth),left=max>1&&scroller.scrollLeft>1,right=max>1&&scroller.scrollLeft<max-1;
  host.classList.toggle('sc-overflow-left',left);host.classList.toggle('sc-overflow-right',right);
  arrowVisible(arrow(host,scroller,'left'),left);arrowVisible(arrow(host,scroller,'right'),right);
}
function centerActive(scroller){
  if(!scroller)return;
  var active=scroller.querySelector('a.anchorLink.sc-motion-current,a.anchorLink[aria-current="location"]');if(!active)return;
  var sr=scroller.getBoundingClientRect(),rect=active.getBoundingClientRect();
  var x=scroller.scrollLeft+(rect.left+rect.width/2-(sr.left+sr.width/2)),max=Math.max(0,scroller.scrollWidth-scroller.clientWidth);
  x=Math.max(0,Math.min(max,x));if(Math.abs(x-scroller.scrollLeft)<1)return;
  try{scroller.scrollTo({left:x,top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}catch(_){scroller.scrollLeft=x;}
}
function railState(){
  railRaf=0;
  var desktop=document.querySelector('.sc-catalog-toolbar');
  if(desktop){
    var scroller=desktop.querySelector('.sc-catalog-categories');overflow(desktop,scroller);
    var rect=desktop.getBoundingClientRect();desktop.classList.toggle('sc-is-stuck',N.mq.matches&&scrollY>0&&rect.top<=.5&&rect.bottom>0);
  }
  var wrapper=document.querySelector('.fixedTopShop.wtopShopMenuMobile');
  var rail=wrapper&&wrapper.querySelector('.topShopMenuMobile'),mobileScroller=rail&&rail.querySelector('.topShopMenuMobileScroller');
  if(rail){
    if(N.mq.matches){rail.classList.remove('sc-overflow-left','sc-overflow-right');each(rail.querySelectorAll('.sc-rail-arrow'),function(button){arrowVisible(button,false);});}
    else{overflow(rail,mobileScroller);centerActive(mobileScroller);}
  }
  if(wrapper){var wr=wrapper.getBoundingClientRect();wrapper.classList.toggle('sc-is-stuck',!N.mq.matches&&scrollY>0&&wr.top<=.5&&wr.bottom>0);}
}
function scheduleRail(){if(!railRaf)railRaf=requestAnimationFrame(railState);}

N.scheduleRail=scheduleRail;
N.scheduleRailState=scheduleRail;
N.railState=railState;
N.centerActive=centerActive;
})();