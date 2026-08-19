/* Orquesta medición sticky, overflow y cache de nodos del riel. Separa lecturas de
   geometría de las escrituras visuales para mantener el scroll liviano y predecible. */
(function(){
'use strict';
var SC=window.SCOverride,Cfg=SC&&SC.config,S=Cfg&&Cfg.selectors,K=Cfg&&Cfg.classes,N=SC&&SC.categoryNav,C=N&&N.railControls,P=N&&N.railPosition,SS=N&&N.stickyState;
if(!SC||!Cfg||!N||!C||!P||!SS||SC.__categoryNavRailBooted)return;SC.__categoryNavRailBooted=true;
var railRaf=0,measureRaf=0,measureRaf2=0,overflowDirty=true,stickyDirty=true,mobileInitialized=false,desktopTop=null,mobileTop=null,nodeCache=null,STICKY_TOLERANCE=.5;

/* Cachea referencias mientras sigan conectadas para evitar querySelector en cada scroll. */
function connected(node){return!node||document.documentElement.contains(node);}
function nodes(){
  if(nodeCache&&connected(nodeCache.desktop)&&connected(nodeCache.wrapper)&&connected(nodeCache.rail)&&connected(nodeCache.desktopScroll)&&connected(nodeCache.mobileScroll))return nodeCache;
  var desktop=document.querySelector(S.categoryToolbar),wrapper=document.querySelector(N.selectors.mobileWrapper),rail=wrapper&&wrapper.querySelector(N.selectors.mobileRail);
  nodeCache={desktop:desktop,wrapper:wrapper,rail:rail,desktopScroll:desktop&&desktop.querySelector(N.selectors.scroller),mobileScroll:rail&&rail.querySelector(N.selectors.mobileScroller)};return nodeCache;
}
function invalidateNodes(){nodeCache=null;}
function mobileScroller(){return nodes().mobileScroll;}
function desktopScroller(){return nodes().desktopScroll;}
function scrollTop(){return window.pageYOffset||document.documentElement.scrollTop||0;}
function pageTop(node){var top=0,current=node;while(current){top+=current.offsetTop||0;current=current.offsetParent;}return top;}

/* Conserva el umbral normal del documento mientras el riel ya está sticky. Releer offsetTop
   durante ese estado puede devolver una posición ligada al scroll actual en algunos motores. */
function stableTop(node,cached){
  if(!node)return null;
  if(cached!==null&&node.classList.contains('sc-is-stuck'))return cached;
  return pageTop(node);
}

/* Mide posiciones en dos frames para leer geometría después de que el layout se estabiliza. */
function measureSticky(){
  measureRaf=0;measureRaf2=0;if(!stickyDirty)return;var refs=nodes(),desktop=refs.desktop,wrapper=refs.wrapper;
  desktopTop=stableTop(desktop,desktopTop);mobileTop=stableTop(wrapper,mobileTop);stickyDirty=false;scheduleFrame();
}
function scheduleMeasure(){
  if(measureRaf||measureRaf2)return;measureRaf=requestAnimationFrame(function(){measureRaf=0;measureRaf2=requestAnimationFrame(measureSticky);});
}

/* Escribe clases sticky y estados de flechas usando únicamente valores ya medidos. La
   comparación depende solo de posición vertical, nunca de la dirección del scroll. */
function railState(){
  railRaf=0;var refs=nodes(),desktop=refs.desktop,wrapper=refs.wrapper,rail=refs.rail,desktopScroll=refs.desktopScroll,mobileScroll=refs.mobileScroll,y=scrollTop();
  if(desktop){if(overflowDirty)C.overflow(desktop,desktopScroll);if(!stickyDirty&&desktopTop!==null)SS.set(desktop,!!(N.mq.matches&&y>0&&y+STICKY_TOLERANCE>=desktopTop));}
  if(rail){if(N.mq.matches){if(overflowDirty)C.hide(rail);}else{if(!mobileInitialized&&mobileScroll){mobileScroll.scrollLeft=0;mobileInitialized=true;}if(overflowDirty)C.overflow(rail,mobileScroll);}}
  if(wrapper&&!stickyDirty&&mobileTop!==null)SS.set(wrapper,!!(!N.mq.matches&&y>0&&y+STICKY_TOLERANCE>=mobileTop));
  overflowDirty=false;
}
function scheduleFrame(){if(!railRaf)railRaf=requestAnimationFrame(railState);}
function scheduleRail(){
  /* Cambios estructurales sí invalidan geometría vertical y fuerzan una nueva medición. */
  invalidateNodes();overflowDirty=true;stickyDirty=true;scheduleMeasure();
}
function scheduleOverflow(){overflowDirty=true;scheduleFrame();}
function scheduleSticky(){scheduleFrame();}
function cancel(){if(railRaf)cancelAnimationFrame(railRaf);if(measureRaf)cancelAnimationFrame(measureRaf);if(measureRaf2)cancelAnimationFrame(measureRaf2);railRaf=measureRaf=measureRaf2=0;invalidateNodes();desktopTop=mobileTop=null;}

/* Reposiciona el activo horizontalmente sin invalidar el umbral sticky vertical. El propio
   scroll del riel vuelve a calcular overflow mientras la animación horizontal progresa. */
function requestCenter(previous,target){if(document.body.classList.contains(K.catalogSearching)){scheduleOverflow();return;}if(N.mq.matches){var desktop=desktopScroller();if(desktop&&P.revealActive)P.revealActive(desktop,previous,target);}else{var mobile=mobileScroller();if(mobile)P.centerActive(mobile);}scheduleOverflow();}
N.scheduleRail=scheduleRail;N.scheduleOverflow=scheduleOverflow;N.scheduleSticky=scheduleSticky;N.requestCenterActive=requestCenter;N.scheduleRailState=scheduleRail;N.railState=railState;N.cancelRailState=cancel;
})();
