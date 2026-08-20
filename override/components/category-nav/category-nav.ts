/* Coordina lifecycle, submenús, listeners y cambios estructurales del riel de categorías.
   Los cálculos específicos viven en módulos menores; este archivo conecta sus contratos. */
(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,S=C&&C.selectors,M=C&&C.motion,N=SC&&SC.categoryNav;
if(!SC||!U||!N||!N.layout||!N.scheduleRail||!N.refreshMetrics||SC.__categoryNavBooted)return;SC.__categoryNavBooted=true;
var each=U.each,ready=U.ready,mq=N.mq as MediaQueryList,onRailScroll:()=>void=N.scheduleOverflow||N.scheduleRail,boundScrollers=new Set<HTMLElement>(),resizeRaf=0,structureObserver:MutationObserver|null=null,structureRaf=0,motionRefreshRaf=0,geometryTimer=0,initialized=false;
var submenuHost:HTMLElement|null=null,submenuParent:HTMLAnchorElement|null=null,submenuPinned=false,submenuCloseTimer=0,submenuPositionRaf=0,submenuScroller:HTMLElement|null=null;

/* Construye el submenú flotante desde la estructura legacy sin mover sus enlaces originales. */
function submenuLinks(parent:HTMLAnchorElement|null):HTMLAnchorElement[]{
  if(!parent)return[];var item=parent.closest<HTMLElement>('.nav-top-li'),source=item&&item.querySelector<HTMLElement>('.topPullDown .topPullChild');if(!source)return[];
  return Array.from(source.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')).filter(function(link:HTMLAnchorElement){return!!N.anchor(link.getAttribute('href'));});
}
function hasSubmenu(parent:HTMLAnchorElement|null):boolean{return submenuLinks(parent).length>0;}
function clearCloseTimer():void{if(submenuCloseTimer){clearTimeout(submenuCloseTimer);submenuCloseTimer=0;}}
function clearPositionRaf():void{if(submenuPositionRaf){cancelAnimationFrame(submenuPositionRaf);submenuPositionRaf=0;}}
function unbindSubmenuScroller():void{if(submenuScroller){submenuScroller.removeEventListener('scroll',scheduleSubmenuPosition);submenuScroller=null;}}
function setParentExpanded(parent:HTMLAnchorElement|null,on:boolean):void{
  if(!parent)return;var item=parent.closest<HTMLElement>('.nav-top-li');if(item)item.classList.toggle('sc-submenu-open',!!on);parent.setAttribute('aria-expanded',on?'true':'false');
}
/* Crea un único host en body para evitar que el overflow horizontal recorte el menú. */
function ensureSubmenu():HTMLElement{
  if(submenuHost&&document.documentElement.contains(submenuHost))return submenuHost;
  submenuHost=document.createElement('div');submenuHost.id='sc-category-submenu';submenuHost.className='sc-category-submenu';submenuHost.setAttribute('role','menu');submenuHost.setAttribute('aria-hidden','true');
  var list=document.createElement('div');list.className='sc-category-submenu-list';submenuHost.appendChild(list);document.body.appendChild(submenuHost);
  submenuHost.addEventListener('pointerenter',clearCloseTimer);
  submenuHost.addEventListener('pointerleave',function(){if(!submenuPinned)scheduleSubmenuClose();});
  return submenuHost;
}
function renderSubmenu(parent:HTMLAnchorElement):HTMLElement{
  var host=ensureSubmenu(),list=host.querySelector<HTMLElement>('.sc-category-submenu-list'),parentHref=parent.getAttribute('href')||'',label=(parent.textContent||'').trim();if(!list)return host;var listNode=list;listNode.textContent='';
  submenuLinks(parent).forEach(function(source:HTMLAnchorElement){
    var link=document.createElement('a');link.className='sc-category-submenu-link';link.setAttribute('role','menuitem');link.setAttribute('href',source.getAttribute('href')||'');link.setAttribute('data-sc-parent-href',parentHref);link.textContent=(source.textContent||'').trim();listNode.appendChild(link);
  });
  host.setAttribute('aria-label','Subcategorías de '+label);return host;
}
function bindSubmenuScroller(parent:HTMLAnchorElement):void{
  unbindSubmenuScroller();submenuScroller=parent.closest<HTMLElement>(N.selectors.scroller+','+N.selectors.mobileScroller);if(submenuScroller)submenuScroller.addEventListener('scroll',scheduleSubmenuPosition,{passive:true});
}
/* Posiciona el menú respecto del trigger y cambia arriba/abajo según espacio disponible. */
function positionSubmenu():void{
  submenuPositionRaf=0;if(!submenuHost||!submenuParent||!submenuHost.classList.contains('sc-category-submenu-open'))return;
  if(!document.documentElement.contains(submenuParent)){closeSubmenu(false);return;}
  var rect=submenuParent.getBoundingClientRect(),rail=submenuParent.closest<HTMLElement>(S.categoryToolbar+','+N.selectors.mobileWrapper),railRect=rail&&rail.getBoundingClientRect(),gap=7,edge=12,width=submenuHost.offsetWidth,height=submenuHost.offsetHeight,above=false;
  var left=Math.max(edge,Math.min(rect.left,innerWidth-width-edge)),top=(railRect?railRect.bottom:rect.bottom)+gap;
  if(top+height>innerHeight-edge&&rect.top-height-gap>=edge){top=rect.top-height-gap;above=true;}
  top=Math.max(edge,top);submenuHost.style.left=Math.round(left)+'px';submenuHost.style.top=Math.round(top)+'px';
  var originX=Math.max(12,Math.min(Math.max(12,width-12),(rect.left+rect.width*.5)-left));submenuHost.style.setProperty('--sc-submenu-origin-x',Math.round(originX)+'px');submenuHost.style.setProperty('--sc-submenu-origin-y',above?Math.round(height)+'px':'0px');
}
function scheduleSubmenuPosition():void{if(submenuHost&&submenuHost.classList.contains('sc-category-submenu-open')&&!submenuPositionRaf)submenuPositionRaf=requestAnimationFrame(positionSubmenu);}
/* Abrir/cerrar conserva estado ARIA y permite fijar el menú cuando el usuario hace click. */
function openSubmenu(parent:HTMLAnchorElement,pin:boolean):boolean{
  if(!hasSubmenu(parent))return false;clearCloseTimer();var same=parent===submenuParent;
  if(!same&&submenuParent)setParentExpanded(submenuParent,false);
  submenuParent=parent;submenuPinned=!!pin||(same&&submenuPinned);var host=renderSubmenu(parent);setParentExpanded(parent,true);parent.setAttribute('aria-controls',host.id);host.classList.add('sc-category-submenu-open');host.setAttribute('aria-hidden','false');bindSubmenuScroller(parent);scheduleSubmenuPosition();return true;
}
function closeSubmenu(restoreFocus:boolean):void{
  clearCloseTimer();clearPositionRaf();unbindSubmenuScroller();if(submenuHost){submenuHost.classList.remove('sc-category-submenu-open');submenuHost.setAttribute('aria-hidden','true');}
  var parent=submenuParent;submenuParent=null;submenuPinned=false;if(parent)setParentExpanded(parent,false);if(restoreFocus&&parent&&document.documentElement.contains(parent))parent.focus();
}
function scheduleSubmenuClose():void{clearCloseTimer();submenuCloseTimer=setTimeout(function(){submenuCloseTimer=0;if(!submenuPinned)closeSubmenu(false);},110);}
/* Revisa qué categorías tienen hijos y expone semántica de menú únicamente en ellas. */
function scanSubmenus():void{
  each(document.querySelectorAll<HTMLAnchorElement>('.nav-top-li > a.anchorLink[href^="#"]'),function(link:HTMLAnchorElement){
    var item=link.closest<HTMLElement>('.nav-top-li'),has=hasSubmenu(link);if(item)item.classList.toggle('sc-has-subcategories',has);
    if(has){link.setAttribute('aria-haspopup','menu');link.setAttribute('aria-controls','sc-category-submenu');if(link!==submenuParent)link.setAttribute('aria-expanded','false');}
    else{link.removeAttribute('aria-haspopup');link.removeAttribute('aria-controls');link.removeAttribute('aria-expanded');}
  });
  if(submenuParent&&!document.documentElement.contains(submenuParent))closeSubmenu(false);
}
/* Eventos de puntero y foco comparten la misma lógica para no bifurcar comportamiento. */
function categoryParentFromEvent(event:Event):HTMLAnchorElement|null{var target=event.target instanceof Element?event.target:null,link=target?target.closest<HTMLAnchorElement>('.nav-top-li > a.anchorLink[href^="#"]'):null;return link&&hasSubmenu(link)?link:null;}
function pointerOver(event:PointerEvent):void{if(event.pointerType==='touch')return;var parent=categoryParentFromEvent(event);if(!parent)return;if(submenuPinned&&submenuParent&&submenuParent!==parent)return;openSubmenu(parent,false);}
function pointerOut(event:PointerEvent):void{
  if(event.pointerType==='touch'||submenuPinned)return;var parent=categoryParentFromEvent(event);if(!parent||parent!==submenuParent)return;var next=event.relatedTarget;if(next instanceof Node&&(parent.closest<HTMLElement>('.nav-top-li')?.contains(next as Node)||(submenuHost&&submenuHost.contains(next))))return;scheduleSubmenuClose();
}
function focusIn(event:FocusEvent):void{var parent=categoryParentFromEvent(event);if(parent&&!submenuPinned)openSubmenu(parent,false);}
function focusOut(event:FocusEvent):void{if(submenuPinned||!submenuParent)return;var next=event.relatedTarget;if(next instanceof Node&&((submenuHost&&submenuHost.contains(next))||submenuParent.closest<HTMLElement>('.nav-top-li')?.contains(next as Node)))return;scheduleSubmenuClose();}
function outsidePointer(event:PointerEvent):void{if(!submenuParent)return;var target=event.target;if(!(target instanceof Node))return;if((submenuHost&&submenuHost.contains(target))||submenuParent.closest<HTMLElement>('.nav-top-li')?.contains(target as Node))return;closeSubmenu(false);}
function keydown(event:KeyboardEvent):void{if(event.key==='Escape'&&submenuParent){event.preventDefault();closeSubmenu(true);}}
function destroySubmenu():void{closeSubmenu(false);if(submenuHost&&submenuHost.parentNode)submenuHost.parentNode.removeChild(submenuHost);submenuHost=null;}
N.categorySubmenu={scan:scanSubmenus,has:hasSubmenu,open:function(parent:HTMLAnchorElement,pin?:boolean):boolean{return openSubmenu(parent,pin!==false);},close:closeSubmenu,position:scheduleSubmenuPosition};

/* Mantiene listeners de scroll ligados solo a scrollers que siguen conectados al documento. */
function pruneRailScrollers():void{boundScrollers.forEach(function(scroller:HTMLElement){if(document.documentElement.contains(scroller))return;scroller.removeEventListener('scroll',onRailScroll);boundScrollers.delete(scroller);});}
function bindRailScrollers():void{
  pruneRailScrollers();
  each(document.querySelectorAll<HTMLElement>(N.selectors.scroller+','+N.selectors.mobileScroller),function(scroller:HTMLElement){
    if(boundScrollers.has(scroller))return;boundScrollers.add(scroller);scroller.addEventListener('scroll',onRailScroll,{passive:true});
  });
}
function unbindRailScrollers():void{boundScrollers.forEach(function(scroller:HTMLElement){scroller.removeEventListener('scroll',onRailScroll);});boundScrollers.clear();}
function invalidateOffset():void{if(N.invalidateOffset)N.invalidateOffset();}
function runResize():void{resizeRaf=0;if(!initialized)return;invalidateOffset();N.refreshMetrics();N.scheduleRail();scheduleSubmenuPosition();}
function resize():void{if(initialized&&!resizeRaf)resizeRaf=requestAnimationFrame(runResize);}
function windowScroll():void{(N.scheduleSticky||N.scheduleRail)();N.scheduleSpy();scheduleSubmenuPosition();}
function interrupt():void{if(N.interruptAutoScroll)N.interruptAutoScroll();if(N.releaseSpyHold)N.releaseSpyHold();}
function observeStructure():void{if(structureObserver&&document.body)structureObserver.observe(document.body,{childList:true,subtree:true});}
/* Refresca ScrollTrigger fuera del callback del observer y evita observar sus propias mutaciones. */
function refreshMotionSafely():void{
  if(!initialized||motionRefreshRaf)return;
  motionRefreshRaf=requestAnimationFrame(function(){
    motionRefreshRaf=0;if(!initialized||!SC.motion||typeof SC.motion.run!=='function')return;
    if(structureObserver)structureObserver.disconnect();
    SC.motion.run(function(deps:MotionDeps){
      if(!deps||!deps.ScrollTrigger)return;
      try{deps.ScrollTrigger.refresh();}catch(error){if(!(error instanceof DOMException&&error.name==='SecurityError')&&window.console&&console.error)console.error('[SushiClub motion]',error);}
    });
    if(structureObserver){structureObserver.takeRecords();observeStructure();}
  });
}
/* Repara layout, semántica, submenús y métricas después de un cambio estructural real. */
function syncStructure():void{
  if(structureRaf){cancelAnimationFrame(structureRaf);structureRaf=0;}if(!initialized)return;invalidateOffset();N.layout();N.semantics();scanSubmenus();bindRailScrollers();scheduleSubmenuPosition();
  if(structureObserver)structureObserver.takeRecords();
  refreshMotionSafely();
}
function breakpoint():void{closeSubmenu(false);syncStructure();}
function refreshGeometry():void{if(!initialized)return;invalidateOffset();N.refreshMetrics();N.scheduleRail();scheduleSubmenuPosition();}
function scheduleStructure():void{if(initialized&&!structureRaf)structureRaf=requestAnimationFrame(syncStructure);}
function structural(node:Node):boolean{
  if(!node||node.nodeType!==1)return false;
  var selector=S.container+', '+S.categoryToolbar+', '+N.selectors.mobileWrapper+', .wrapp-nav-tabsTopShop';
  var element=node as Element;if(element.matches(selector))return true;
  return !!element.querySelector(S.container);
}
function watchStructure():void{
  if(structureObserver||!window.MutationObserver||!document.body)return;
  structureObserver=new MutationObserver(function(mutations:MutationRecord[]){for(var i=0;i<mutations.length;i++){var mutation=mutations[i];if(!mutation)continue;var nodes:Node[]=Array.from(mutation.addedNodes).concat(Array.from(mutation.removedNodes));if(nodes.some(structural)){scheduleStructure();return;}}});
  observeStructure();
}
/* Registra eventos una sola vez y usa listeners pasivos donde no se cancela el evento. */
function addListeners():void{
  document.addEventListener('click',N.onCategory,true);document.addEventListener('change',N.onSelect,true);
  document.addEventListener('pointerover',pointerOver,true);document.addEventListener('pointerout',pointerOut,true);document.addEventListener('pointerdown',outsidePointer,true);document.addEventListener('focusin',focusIn,true);document.addEventListener('focusout',focusOut,true);document.addEventListener('keydown',keydown,true);
  window.addEventListener('scroll',windowScroll,{passive:true});window.addEventListener('resize',resize,{passive:true});
  window.addEventListener('wheel',interrupt,{passive:true});window.addEventListener('touchstart',interrupt,{passive:true});
  if(mq.addEventListener)mq.addEventListener('change',breakpoint);else mq.addListener(breakpoint);
}
function removeListeners():void{
  document.removeEventListener('click',N.onCategory,true);document.removeEventListener('change',N.onSelect,true);
  document.removeEventListener('pointerover',pointerOver,true);document.removeEventListener('pointerout',pointerOut,true);document.removeEventListener('pointerdown',outsidePointer,true);document.removeEventListener('focusin',focusIn,true);document.removeEventListener('focusout',focusOut,true);document.removeEventListener('keydown',keydown,true);
  window.removeEventListener('scroll',windowScroll);window.removeEventListener('resize',resize);window.removeEventListener('wheel',interrupt);window.removeEventListener('touchstart',interrupt);
  if(mq.removeEventListener)mq.removeEventListener('change',breakpoint);else mq.removeListener(breakpoint);
}
/* Monta todo el coordinador y programa una segunda medición cuando fuentes/layout se estabilizan. */
function init():void{
  if(initialized)return;initialized=true;addListeners();syncStructure();if(N.categoryIndicator&&N.categoryIndicator.resume)N.categoryIndicator.resume();watchStructure();if(N.installMotion)N.installMotion();
  geometryTimer=window.setTimeout(function(){geometryTimer=0;if(!initialized)return;N.semantics();scanSubmenus();refreshGeometry();},M.geometryRefreshDelay);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(refreshGeometry).catch(function(){});
}
/* Cleanup simétrico: listeners, observers, RAF, timers, scroll automático e indicador. */
function destroy():void{
  if(!initialized)return;initialized=false;removeListeners();unbindRailScrollers();destroySubmenu();
  if(structureObserver){structureObserver.disconnect();structureObserver=null;}
  if(resizeRaf){cancelAnimationFrame(resizeRaf);resizeRaf=0;}if(structureRaf){cancelAnimationFrame(structureRaf);structureRaf=0;}if(motionRefreshRaf){cancelAnimationFrame(motionRefreshRaf);motionRefreshRaf=0;}if(geometryTimer){clearTimeout(geometryTimer);geometryTimer=0;}
  if(N.cancelRailState)N.cancelRailState();if(N.stopSpy)N.stopSpy();if(N.interruptAutoScroll)N.interruptAutoScroll();if(N.categoryIndicator&&N.categoryIndicator.pause)N.categoryIndicator.pause();
}

ready(init);
N.syncLayout=N.layout;N.scheduleRailState=N.scheduleRail;N.resolveAnchor=N.anchor;N.refreshSections=N.refreshMetrics;N.repairStructure=scheduleStructure;N.init=init;N.destroy=destroy;
})();