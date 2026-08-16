(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,S=C&&C.selectors,M=C&&C.motion,N=SC&&SC.categoryNav,T=SC&&SC.templates;
if(!SC||!U||!N||!T||!N.layout||!N.scheduleRail||!N.refreshMetrics||SC.__categoryNavBooted)return;SC.__categoryNavBooted=true;
var each=U.each,ready=U.ready,mq=N.mq,boundScrollers=new Set(),resizeRaf=0,structureObserver=null,structureRaf=0,motionRefreshRaf=0,geometryTimer=0,initialized=false;
var submenuHost=null,submenuParent=null,submenuPinned=false,submenuCloseTimer=0,submenuPositionRaf=0,submenuScroller=null;

function submenuLinks(parent){
  if(!parent)return[];var item=parent.closest('.nav-top-li'),source=item&&item.querySelector('.topPullDown .topPullChild');if(!source)return[];
  return Array.prototype.filter.call(source.querySelectorAll('a[href^="#"]'),function(link){return!!N.anchor(link.getAttribute('href'));});
}
function hasSubmenu(parent){return submenuLinks(parent).length>0;}
function clearCloseTimer(){if(submenuCloseTimer){clearTimeout(submenuCloseTimer);submenuCloseTimer=0;}}
function clearPositionRaf(){if(submenuPositionRaf){cancelAnimationFrame(submenuPositionRaf);submenuPositionRaf=0;}}
function unbindSubmenuScroller(){if(submenuScroller){submenuScroller.removeEventListener('scroll',scheduleSubmenuPosition);submenuScroller=null;}}
function setParentExpanded(parent,on){
  if(!parent)return;var item=parent.closest('.nav-top-li');if(item)item.classList.toggle('sc-submenu-open',!!on);parent.setAttribute('aria-expanded',on?'true':'false');
}
function ensureSubmenu(){
  if(submenuHost&&document.documentElement.contains(submenuHost))return submenuHost;
  submenuHost=T.clone('category-submenu');submenuHost.id='sc-category-submenu';document.body.appendChild(submenuHost);
  submenuHost.addEventListener('pointerenter',clearCloseTimer);
  submenuHost.addEventListener('pointerleave',function(){if(!submenuPinned)scheduleSubmenuClose();});
  return submenuHost;
}
function renderSubmenu(parent){
  var host=ensureSubmenu(),list=host.querySelector('.sc-category-submenu-list'),parentHref=parent.getAttribute('href')||'',label=(parent.textContent||'').trim();list.textContent='';
  submenuLinks(parent).forEach(function(source){
    var link=document.createElement('a');link.className='sc-category-submenu-link';link.setAttribute('role','menuitem');link.setAttribute('href',source.getAttribute('href'));link.setAttribute('data-sc-parent-href',parentHref);link.textContent=(source.textContent||'').trim();list.appendChild(link);
  });
  host.setAttribute('aria-label','Subcategorías de '+label);return host;
}
function bindSubmenuScroller(parent){
  unbindSubmenuScroller();submenuScroller=parent&&parent.closest(N.selectors.scroller+','+N.selectors.mobileScroller);if(submenuScroller)submenuScroller.addEventListener('scroll',scheduleSubmenuPosition,{passive:true});
}
function positionSubmenu(){
  submenuPositionRaf=0;if(!submenuHost||!submenuParent||!submenuHost.classList.contains('sc-category-submenu-open'))return;
  if(!document.documentElement.contains(submenuParent)){closeSubmenu(false);return;}
  var rect=submenuParent.getBoundingClientRect(),rail=submenuParent.closest(S.categoryToolbar+','+N.selectors.mobileWrapper),railRect=rail&&rail.getBoundingClientRect(),gap=7,edge=12,width=submenuHost.offsetWidth,height=submenuHost.offsetHeight;
  var left=Math.max(edge,Math.min(rect.left,innerWidth-width-edge)),top=(railRect?railRect.bottom:rect.bottom)+gap;
  if(top+height>innerHeight-edge&&rect.top-height-gap>=edge)top=rect.top-height-gap;
  submenuHost.style.left=Math.round(left)+'px';submenuHost.style.top=Math.round(Math.max(edge,top))+'px';
}
function scheduleSubmenuPosition(){if(submenuHost&&submenuHost.classList.contains('sc-category-submenu-open')&&!submenuPositionRaf)submenuPositionRaf=requestAnimationFrame(positionSubmenu);}
function openSubmenu(parent,pin){
  if(!hasSubmenu(parent))return false;clearCloseTimer();var same=parent===submenuParent;
  if(!same&&submenuParent)setParentExpanded(submenuParent,false);
  submenuParent=parent;submenuPinned=!!pin||(same&&submenuPinned);var host=renderSubmenu(parent);setParentExpanded(parent,true);parent.setAttribute('aria-controls',host.id);host.classList.add('sc-category-submenu-open');host.setAttribute('aria-hidden','false');bindSubmenuScroller(parent);scheduleSubmenuPosition();return true;
}
function closeSubmenu(restoreFocus){
  clearCloseTimer();clearPositionRaf();unbindSubmenuScroller();if(submenuHost){submenuHost.classList.remove('sc-category-submenu-open');submenuHost.setAttribute('aria-hidden','true');}
  var parent=submenuParent;submenuParent=null;submenuPinned=false;if(parent)setParentExpanded(parent,false);if(restoreFocus&&parent&&document.documentElement.contains(parent))parent.focus();
}
function scheduleSubmenuClose(){clearCloseTimer();submenuCloseTimer=setTimeout(function(){submenuCloseTimer=0;if(!submenuPinned)closeSubmenu(false);},110);}
function scanSubmenus(){
  each(document.querySelectorAll('.nav-top-li > a.anchorLink[href^="#"]'),function(link){
    var item=link.closest('.nav-top-li'),has=hasSubmenu(link);if(item)item.classList.toggle('sc-has-subcategories',has);
    if(has){link.setAttribute('aria-haspopup','menu');link.setAttribute('aria-controls','sc-category-submenu');if(link!==submenuParent)link.setAttribute('aria-expanded','false');}
    else{link.removeAttribute('aria-haspopup');link.removeAttribute('aria-controls');link.removeAttribute('aria-expanded');}
  });
  if(submenuParent&&!document.documentElement.contains(submenuParent))closeSubmenu(false);
}
function categoryParentFromEvent(event){var link=event.target&&event.target.closest?event.target.closest('.nav-top-li > a.anchorLink[href^="#"]'):null;return link&&hasSubmenu(link)?link:null;}
function pointerOver(event){if(event.pointerType==='touch')return;var parent=categoryParentFromEvent(event);if(!parent)return;if(submenuPinned&&submenuParent&&submenuParent!==parent)return;openSubmenu(parent,false);}
function pointerOut(event){
  if(event.pointerType==='touch'||submenuPinned)return;var parent=categoryParentFromEvent(event);if(!parent||parent!==submenuParent)return;var next=event.relatedTarget;if(next&&(parent.closest('.nav-top-li').contains(next)||(submenuHost&&submenuHost.contains(next))))return;scheduleSubmenuClose();
}
function focusIn(event){var parent=categoryParentFromEvent(event);if(parent&&!submenuPinned)openSubmenu(parent,false);}
function focusOut(event){if(submenuPinned||!submenuParent)return;var next=event.relatedTarget;if(next&&((submenuHost&&submenuHost.contains(next))||submenuParent.closest('.nav-top-li').contains(next)))return;scheduleSubmenuClose();}
function outsidePointer(event){if(!submenuParent)return;var target=event.target;if((submenuHost&&submenuHost.contains(target))||submenuParent.closest('.nav-top-li').contains(target))return;closeSubmenu(false);}
function keydown(event){if(event.key==='Escape'&&submenuParent){event.preventDefault();closeSubmenu(true);}}
function destroySubmenu(){closeSubmenu(false);if(submenuHost&&submenuHost.parentNode)submenuHost.parentNode.removeChild(submenuHost);submenuHost=null;}
N.categorySubmenu={scan:scanSubmenus,has:hasSubmenu,open:function(parent,pin){return openSubmenu(parent,pin!==false);},close:closeSubmenu,position:scheduleSubmenuPosition};

function pruneRailScrollers(){boundScrollers.forEach(function(scroller){if(document.documentElement.contains(scroller))return;scroller.removeEventListener('scroll',N.scheduleRail);boundScrollers.delete(scroller);});}
function bindRailScrollers(){
  pruneRailScrollers();
  each(document.querySelectorAll(N.selectors.scroller+','+N.selectors.mobileScroller),function(scroller){
    if(boundScrollers.has(scroller))return;boundScrollers.add(scroller);scroller.addEventListener('scroll',N.scheduleRail,{passive:true});
  });
}
function unbindRailScrollers(){boundScrollers.forEach(function(scroller){scroller.removeEventListener('scroll',N.scheduleRail);});boundScrollers.clear();}
function invalidateOffset(){if(N.invalidateOffset)N.invalidateOffset();}
function runResize(){resizeRaf=0;if(!initialized)return;invalidateOffset();N.refreshMetrics();N.scheduleRail();scheduleSubmenuPosition();}
function resize(){if(initialized&&!resizeRaf)resizeRaf=requestAnimationFrame(runResize);}
function windowScroll(){(N.scheduleSticky||N.scheduleRail)();N.scheduleSpy();scheduleSubmenuPosition();}
function interrupt(){if(N.interruptAutoScroll)N.interruptAutoScroll();if(N.releaseSpyHold)N.releaseSpyHold();}
function observeStructure(){if(structureObserver&&document.body)structureObserver.observe(document.body,{childList:true,subtree:true});}
function refreshMotionSafely(){
  if(!initialized||motionRefreshRaf)return;
  motionRefreshRaf=requestAnimationFrame(function(){
    motionRefreshRaf=0;if(!initialized||!SC.motion||typeof SC.motion.run!=='function')return;
    if(structureObserver)structureObserver.disconnect();
    SC.motion.run(function(deps){
      if(!deps||!deps.ScrollTrigger)return;
      try{deps.ScrollTrigger.refresh();}catch(error){if(!(error&&error.name==='SecurityError')&&window.console&&console.error)console.error('[SushiClub motion]',error);}
    });
    if(structureObserver){structureObserver.takeRecords();observeStructure();}
  });
}
function syncStructure(){
  structureRaf=0;if(!initialized)return;invalidateOffset();N.layout();N.semantics();scanSubmenus();bindRailScrollers();scheduleSubmenuPosition();
  if(structureObserver)structureObserver.takeRecords();
  refreshMotionSafely();
}
function breakpoint(){closeSubmenu(false);syncStructure();}
function refreshGeometry(){if(!initialized)return;invalidateOffset();N.refreshMetrics();N.scheduleRail();scheduleSubmenuPosition();}
function scheduleStructure(){if(initialized&&!structureRaf)structureRaf=requestAnimationFrame(syncStructure);}
function structural(node){
  if(!node||node.nodeType!==1)return false;
  var selector=S.container+', '+S.categoryToolbar+', '+N.selectors.mobileWrapper+', .wrapp-nav-tabsTopShop';
  if(node.matches&&node.matches(selector))return true;
  return !!(node.querySelector&&node.querySelector(S.container));
}
function watchStructure(){
  if(structureObserver||!window.MutationObserver||!document.body)return;
  structureObserver=new MutationObserver(function(mutations){for(var i=0;i<mutations.length;i++){var mutation=mutations[i],nodes=Array.prototype.concat.call([],Array.from(mutation.addedNodes||[]),Array.from(mutation.removedNodes||[]));if(nodes.some(structural)){scheduleStructure();return;}}});
  observeStructure();
}
function addListeners(){
  document.addEventListener('click',N.onCategory,true);document.addEventListener('change',N.onSelect,true);
  document.addEventListener('pointerover',pointerOver,true);document.addEventListener('pointerout',pointerOut,true);document.addEventListener('pointerdown',outsidePointer,true);document.addEventListener('focusin',focusIn,true);document.addEventListener('focusout',focusOut,true);document.addEventListener('keydown',keydown,true);
  window.addEventListener('scroll',windowScroll,{passive:true});window.addEventListener('resize',resize,{passive:true});
  window.addEventListener('wheel',interrupt,{passive:true});window.addEventListener('touchstart',interrupt,{passive:true});
  if(mq.addEventListener)mq.addEventListener('change',breakpoint);else mq.addListener(breakpoint);
}
function removeListeners(){
  document.removeEventListener('click',N.onCategory,true);document.removeEventListener('change',N.onSelect,true);
  document.removeEventListener('pointerover',pointerOver,true);document.removeEventListener('pointerout',pointerOut,true);document.removeEventListener('pointerdown',outsidePointer,true);document.removeEventListener('focusin',focusIn,true);document.removeEventListener('focusout',focusOut,true);document.removeEventListener('keydown',keydown,true);
  window.removeEventListener('scroll',windowScroll);window.removeEventListener('resize',resize);window.removeEventListener('wheel',interrupt);window.removeEventListener('touchstart',interrupt);
  if(mq.removeEventListener)mq.removeEventListener('change',breakpoint);else mq.removeListener(breakpoint);
}
function init(){
  if(initialized)return;initialized=true;addListeners();syncStructure();if(N.categoryIndicator&&N.categoryIndicator.resume)N.categoryIndicator.resume();watchStructure();if(N.installMotion)N.installMotion();
  geometryTimer=window.setTimeout(function(){geometryTimer=0;if(!initialized)return;N.semantics();scanSubmenus();refreshGeometry();},M.geometryRefreshDelay);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(refreshGeometry).catch(function(){});
}
function destroy(){
  if(!initialized)return;initialized=false;removeListeners();unbindRailScrollers();destroySubmenu();
  if(structureObserver){structureObserver.disconnect();structureObserver=null;}
  if(resizeRaf){cancelAnimationFrame(resizeRaf);resizeRaf=0;}if(structureRaf){cancelAnimationFrame(structureRaf);structureRaf=0;}if(motionRefreshRaf){cancelAnimationFrame(motionRefreshRaf);motionRefreshRaf=0;}if(geometryTimer){clearTimeout(geometryTimer);geometryTimer=0;}
  if(N.cancelRailState)N.cancelRailState();if(N.stopSpy)N.stopSpy();if(N.interruptAutoScroll)N.interruptAutoScroll();if(N.categoryIndicator&&N.categoryIndicator.pause)N.categoryIndicator.pause();
}

ready(init);
N.syncLayout=N.layout;N.scheduleRailState=N.scheduleRail;N.resolveAnchor=N.anchor;N.refreshSections=N.refreshMetrics;N.repairStructure=scheduleStructure;N.init=init;N.destroy=destroy;
})();
