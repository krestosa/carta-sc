/* Orquesta medición sticky, overflow y cache de nodos del riel. Separa lecturas de
   geometría de las escrituras visuales para mantener el scroll liviano y predecible. */
(function(){
'use strict';
var SC=window.SCOverride,Cfg=SC&&SC.config,S=Cfg&&Cfg.selectors,K=Cfg&&Cfg.classes,N=SC&&SC.categoryNav,C=N&&N.railControls,P=N&&N.railPosition,SS=N&&N.stickyState;
if(!SC||!Cfg||!N||!C||!P||!SS||SC.__categoryNavRailBooted)return;SC.__categoryNavRailBooted=true;
interface RailNodes{desktop:HTMLElement|null;wrapper:HTMLElement|null;rail:HTMLElement|null;desktopScroll:HTMLElement|null;mobileScroll:HTMLElement|null;}
var railRaf=0,measureRaf=0,measureRaf2=0,overflowDirty=true,stickyDirty=true,mobileInitialized=false,desktopTop:number|null=null,mobileTop:number|null=null,nodeCache:RailNodes|null=null,STICKY_TOLERANCE=.5;

/* Cachea referencias mientras sigan conectadas para evitar querySelector en cada scroll. */
function connected(node:Node|null):boolean{return!node||document.documentElement.contains(node);}
function nodes():RailNodes{
  if(nodeCache&&connected(nodeCache.desktop)&&connected(nodeCache.wrapper)&&connected(nodeCache.rail)&&connected(nodeCache.desktopScroll)&&connected(nodeCache.mobileScroll))return nodeCache;
  var desktop=document.querySelector<HTMLElement>(S.categoryToolbar),wrapper=document.querySelector<HTMLElement>(N.selectors.mobileWrapper),rail=wrapper&&wrapper.querySelector<HTMLElement>(N.selectors.mobileRail);
  nodeCache={desktop:desktop,wrapper:wrapper,rail:rail,desktopScroll:desktop&&desktop.querySelector<HTMLElement>(N.selectors.scroller),mobileScroll:rail&&rail.querySelector<HTMLElement>(N.selectors.mobileScroller)};return nodeCache;
}
function invalidateNodes():void{nodeCache=null;}
function mobileScroller():HTMLElement|null{return nodes().mobileScroll;}
function desktopScroller():HTMLElement|null{return nodes().desktopScroll;}
function scrollTop():number{return window.pageYOffset||document.documentElement.scrollTop||0;}
function pageTop(node:HTMLElement):number{var top=0,current:HTMLElement|null=node;while(current){top+=current.offsetTop||0;current=current.offsetParent as HTMLElement|null;}return top;}
function stableTop(node:HTMLElement|null,cached:number|null):number|null{if(!node)return null;if(cached!==null&&node.classList.contains('sc-is-stuck'))return cached;return pageTop(node);}
function measureSticky():void{measureRaf=0;measureRaf2=0;if(!stickyDirty)return;var refs=nodes(),desktop=refs.desktop,wrapper=refs.wrapper;desktopTop=stableTop(desktop,desktopTop);mobileTop=stableTop(wrapper,mobileTop);stickyDirty=false;scheduleFrame();}
function scheduleMeasure():void{if(measureRaf||measureRaf2)return;measureRaf=requestAnimationFrame(function(){measureRaf=0;measureRaf2=requestAnimationFrame(measureSticky);});}
function railState():void{railRaf=0;var refs=nodes(),desktop=refs.desktop,wrapper=refs.wrapper,rail=refs.rail,desktopScroll=refs.desktopScroll,mobileScroll=refs.mobileScroll,y=scrollTop();if(desktop){if(overflowDirty)C.overflow(desktop,desktopScroll);if(!stickyDirty&&desktopTop!==null)SS.set(desktop,!!(N.mq.matches&&y>0&&y+STICKY_TOLERANCE>=desktopTop));}if(rail){if(N.mq.matches){if(overflowDirty)C.hide(rail);}else{if(!mobileInitialized&&mobileScroll){mobileScroll.scrollLeft=0;mobileInitialized=true;}if(overflowDirty)C.overflow(rail,mobileScroll);}}if(wrapper&&!stickyDirty&&mobileTop!==null)SS.set(wrapper,!!(!N.mq.matches&&y>0&&y+STICKY_TOLERANCE>=mobileTop));overflowDirty=false;}
function scheduleFrame():void{if(!railRaf)railRaf=requestAnimationFrame(railState);}
function scheduleRail():void{invalidateNodes();overflowDirty=true;stickyDirty=true;scheduleMeasure();}
function scheduleOverflow():void{overflowDirty=true;scheduleFrame();}
function scheduleSticky():void{scheduleFrame();}
function cancel():void{if(railRaf)cancelAnimationFrame(railRaf);if(measureRaf)cancelAnimationFrame(measureRaf);if(measureRaf2)cancelAnimationFrame(measureRaf2);railRaf=measureRaf=measureRaf2=0;invalidateNodes();desktopTop=mobileTop=null;}
function requestCenter(previous:Element|null,target:Element|null):void{if(document.body.classList.contains(K.catalogSearching)){scheduleOverflow();return;}if(N.mq.matches){var desktop=desktopScroller();if(desktop&&P.revealActive)P.revealActive(desktop,previous,target);}else{var mobile=mobileScroller();if(mobile)P.centerActive(mobile);}scheduleOverflow();}
N.scheduleRail=scheduleRail;N.scheduleOverflow=scheduleOverflow;N.scheduleSticky=scheduleSticky;N.requestCenterActive=requestCenter;N.scheduleRailState=scheduleRail;N.railState=railState;N.cancelRailState=cancel;
})();