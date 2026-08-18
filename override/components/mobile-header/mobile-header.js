(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,S=C&&C.selectors,H={pluginDataKey:'plugin_slicknav',repairDelays:[0,60,120,240]};
if(!SC||!U||!C||SC.__mobileHeaderBooted)return;SC.__mobileHeaderBooted=true;

/* Estado de reparación, bindings y geometría del icono. */
var desktopQuery=C.queries.desktop,retryTimer=0,syncTimers=new Set(),bindings=[],initialized=false,SVG_NS='http://www.w3.org/2000/svg';
var MENU_ICON='M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z';
var CLOSE_ICON='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z';

/* Crea el SVG único del botón de menú. */
function ensureMenuIcon(button){
  if(!button)return null;var host=button.querySelector('.slicknav_icon');
  if(!host){host=document.createElement('span');host.className='slicknav_icon';button.appendChild(host);}
  var path=host.querySelector('[data-sc-mobile-menu-icon-path]');if(path)return path;
  host.textContent='';var svg=document.createElementNS(SVG_NS,'svg');svg.setAttribute('class','sc-mobile-menu-state-icon');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
  path=document.createElementNS(SVG_NS,'path');path.setAttribute('data-sc-mobile-menu-icon-path','');path.setAttribute('d',MENU_ICON);svg.appendChild(path);host.appendChild(svg);return path;
}

/* Sincroniza menú/cerrar y sus atributos accesibles. */
function syncIcon(button,open){
  var path=ensureMenuIcon(button),state=open?'close':'menu',shape=open?CLOSE_ICON:MENU_ICON,previous=path&&path.getAttribute('data-sc-icon-state');if(!path)return;
  if(previous&&previous!==state&&SC.motion&&SC.motion.morphIcon)SC.motion.morphIcon(path,shape,{duration:.24});else path.setAttribute('d',shape);
  path.setAttribute('data-sc-icon-state',state);
}
function menuOpen(button,nav){
  if(button.classList.contains('slicknav_open'))return true;
  if(button.classList.contains('slicknav_collapsed'))return false;
  return nav.getAttribute('aria-hidden')==='false'||nav.style.display==='block';
}
function syncMenuButton(button,nav){
  if(!button||!nav)return;
  var open=menuOpen(button,nav);
  if(!nav.id)nav.id='sc-mobile-primary-menu';
  nav.setAttribute('aria-hidden',open?'false':'true');
  button.setAttribute('aria-controls',nav.id);button.setAttribute('aria-expanded',open?'true':'false');button.setAttribute('aria-label',open?'Cerrar menú de navegación':'Abrir menú de navegación');button.setAttribute('title',open?'Cerrar menú':'Abrir menú');syncIcon(button,open);
}

/* Detecta la instancia real del menú existente. */
function pluginMenu(){
  var source=document.getElementById('menuMobile'),jq=window.jQuery;if(!source||!jq)return null;
  try{var instance=jq(source).data(H.pluginDataKey);var button=instance&&instance.btn&&instance.btn[0];return button&&button.closest?button.closest('.slicknav_menu'):null;}catch(_){return null;}
}
function isPluginMenu(menu){var live=pluginMenu();return !!(live&&live===menu);}
function bindingFor(button){
  for(var i=0;i<bindings.length;i++)if(bindings[i].button===button)return bindings[i];
  var binding={button:button,nav:null,fallback:null,sync:null,syncKey:null};bindings.push(binding);return binding;
}

/* Fallback mínimo si el menú existe sin instancia activa. */
function removeFallbackToggle(button){
  for(var i=0;i<bindings.length;i++){var binding=bindings[i];if(binding.button!==button||!binding.fallback)continue;button.removeEventListener('click',binding.fallback);binding.fallback=null;button.removeAttribute('data-sc-fallback-toggle');return;}
}
function installFallbackMenuToggle(menu){
  var button=menu&&menu.querySelector('.slicknav_btn'),nav=menu&&menu.querySelector('.slicknav_nav');if(!button||!nav)return;
  var binding=bindingFor(button);binding.nav=nav;if(binding.fallback)return;
  binding.fallback=function(e){
    e.preventDefault();var currentNav=binding.nav;if(!currentNav)return;
    var next=!menuOpen(button,currentNav);
    button.classList.toggle('slicknav_open',next);button.classList.toggle('slicknav_collapsed',!next);currentNav.classList.toggle('slicknav_hidden',!next);currentNav.setAttribute('aria-hidden',next?'false':'true');currentNav.style.display=next?'block':'none';syncMenuButton(button,currentNav);
  };
  button.setAttribute('data-sc-fallback-toggle','true');button.addEventListener('click',binding.fallback);
}

/* Sincroniza ARIA después de cada interacción que cambia el estado real del plugin. */
function installA11ySync(button,nav){
  if(!button||!nav)return;var binding=bindingFor(button);binding.nav=nav;if(binding.sync)return;
  binding.sync=function(){
    var timer=window.setTimeout(function(){syncTimers.delete(timer);if(initialized&&document.documentElement.contains(button))syncMenuButton(button,binding.nav);},0);syncTimers.add(timer);
  };
  binding.syncKey=function(e){var menu=button.closest&&button.closest('.slicknav_menu');if((e.key==='Enter'||e.keyCode===13)&&isPluginMenu(menu))binding.sync();};
  button.setAttribute('data-sc-a11y-sync','true');button.addEventListener('click',binding.sync);button.addEventListener('keydown',binding.syncKey);
}

/* Limpia bindings de nodos reemplazados. */
function unbind(binding){
  if(!binding||!binding.button)return;var button=binding.button;
  if(binding.fallback)button.removeEventListener('click',binding.fallback);if(binding.sync)button.removeEventListener('click',binding.sync);if(binding.syncKey)button.removeEventListener('keydown',binding.syncKey);
  button.removeAttribute('data-sc-fallback-toggle');button.removeAttribute('data-sc-a11y-sync');binding.fallback=null;binding.sync=null;binding.syncKey=null;binding.nav=null;
}
function pruneBindings(){for(var i=bindings.length-1;i>=0;i--){if(document.documentElement.contains(bindings[i].button))continue;unbind(bindings[i]);bindings.splice(i,1);}}
function clearSyncTimers(){syncTimers.forEach(function(timer){clearTimeout(timer);});syncTimers.clear();}

/* Conserva un solo menú móvil y repara su estado. */
function repairMobileHeader(finalAttempt){
  pruneBindings();if(desktopQuery.matches)return true;
  var menus=Array.prototype.slice.call(document.querySelectorAll('body > .slicknav_menu'));if(!menus.length)return false;
  var live=pluginMenu();if(live&&menus.indexOf(live)===-1)live=null;if(!live&&!finalAttempt)return false;if(!live)live=menus[0];
  menus.forEach(function(menu){if(menu!==live&&menu.parentNode)menu.parentNode.removeChild(menu);});pruneBindings();
  live.classList.add('sc-mobile-main-menu');live.style.removeProperty('visibility');live.style.removeProperty('pointer-events');
  var button=live.querySelector('.slicknav_btn'),nav=live.querySelector('.slicknav_nav');
  if(isPluginMenu(live))removeFallbackToggle(button);else installFallbackMenuToggle(live);syncMenuButton(button,nav);installA11ySync(button,nav);
  return true;
}

/* Reintenta mientras el menú legacy termina de montarse. */
function clearRetry(){if(retryTimer){clearTimeout(retryTimer);retryTimer=0;}}
function schedule(){
  clearRetry();if(!initialized||desktopQuery.matches)return;
  var delays=H.repairDelays,index=0;
  function attempt(){retryTimer=0;if(!initialized)return;var finalAttempt=index===delays.length-1;if(repairMobileHeader(finalAttempt))return;index+=1;if(index<delays.length)retryTimer=window.setTimeout(attempt,delays[index]);}
  retryTimer=window.setTimeout(attempt,delays[0]);
}

/* Ciclo público y breakpoint desktop/móvil. */
function addBreakpointListener(){if(desktopQuery.addEventListener)desktopQuery.addEventListener('change',schedule);else desktopQuery.addListener(schedule);}
function removeBreakpointListener(){if(desktopQuery.removeEventListener)desktopQuery.removeEventListener('change',schedule);else desktopQuery.removeListener(schedule);}
function init(){if(initialized)return;initialized=true;addBreakpointListener();schedule();}
function destroy(){
  if(initialized){initialized=false;removeBreakpointListener();}clearRetry();clearSyncTimers();bindings.forEach(unbind);bindings=[];
}
U.ready(init);
SC.mobileHeader={repair:repairMobileHeader,schedule:schedule,init:init,destroy:destroy};
})();
