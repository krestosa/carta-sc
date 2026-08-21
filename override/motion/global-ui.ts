(function(){
'use strict';
/* Motion global para superficies legacy que siguen montándose fuera de los componentes propios.
   Solo anima la aparición del dropdown y respeta la preferencia de movimiento reducido. */
var SC=window.SCOverride,C=SC&&SC.config,M=C&&C.motion,REDUCED_DURATION=.12,DURATION=.16,OFFSET_Y=-3;if(!SC||!C||!M||SC.__globalUiMotionBooted)return;SC.__globalUiMotionBooted=true;
if(!SC.motion||typeof SC.motion.whenReady!=='function')return;
var motionDeps:MotionDeps|null=null,initialized=false,EVENT='shown.bs.dropdown.scUxMotion',active=new WeakMap<HTMLElement,MotionHandle[]>();
function stop(menu:HTMLElement):void{var list=active.get(menu);if(list)list.forEach(function(handle){handle.cancel();});active.delete(menu);}
function clear(menu:HTMLElement):void{menu.style.removeProperty('transform');menu.style.removeProperty('opacity');menu.style.removeProperty('visibility');menu.style.removeProperty('will-change');}

/* Reacciona al evento existente y aplica una entrada breve sin asumir ownership del dropdown. */
function onShown(event:Event):void{
  if(!motionDeps||!window.jQuery)return;var node=window.jQuery(event.target).find('> .dropdown-menu, .dropdown-menu').first()[0];if(!(node instanceof HTMLElement))return;
  var menu=node,engine=motionDeps.engine,reduce=SC.motion.reduced(),duration=reduce?REDUCED_DURATION:DURATION;stop(menu);menu.style.opacity='0';menu.style.visibility='visible';menu.style.transform=reduce?'translate3d(0,0,0)':'translate3d(0,'+OFFSET_Y+'px,0)';
  var handles:MotionHandle[]=[];handles.push(engine.opacity(menu,1,{duration:duration,ease:M.easings.out,clear:true}));handles.push(engine.transform(menu,{y:0},{duration:duration,ease:M.easings.out,clear:true,onComplete:function(){active.delete(menu);clear(menu);}}));active.set(menu,handles);
}

function init():void{if(initialized||!motionDeps||!window.jQuery)return;initialized=true;window.jQuery(document).off(EVENT,onShown).on(EVENT,onShown);}
function destroy():void{if(window.jQuery)window.jQuery(document).off(EVENT,onShown);initialized=false;}
SC.globalUiMotion={init:init,destroy:destroy};
SC.motion.whenReady(function(deps:MotionDeps){motionDeps=deps;init();});
})();
