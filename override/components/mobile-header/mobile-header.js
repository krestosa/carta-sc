(function(){
'use strict';
var SC=window.SCOverride,utils=SC&&SC.utils,config=SC&&SC.config;
if(!SC||!utils||!config||SC.__mobileHeaderBooted)return;SC.__mobileHeaderBooted=true;
var desktopQuery=config.desktopQuery;

function syncMenuButton(button,nav){
  if(!button||!nav)return;
  var open=button.classList.contains('slicknav_open')||nav.getAttribute('aria-hidden')==='false'||nav.style.display==='block';
  if(!nav.id)nav.id='sc-mobile-primary-menu';
  button.setAttribute('aria-controls',nav.id);
  button.setAttribute('aria-expanded',open?'true':'false');
  button.setAttribute('aria-label',open?'Cerrar menú de navegación':'Abrir menú de navegación');
  button.setAttribute('title','Menú');
}
function pluginMenu(){
  var source=document.getElementById('menuMobile'),jq=window.jQuery;
  if(!source||!jq)return null;
  try{
    var instance=jq(source).data('plugin_slicknav');
    var button=instance&&instance.btn&&instance.btn[0];
    return button&&button.closest?button.closest('.slicknav_menu'):null;
  }catch(_){return null;}
}
function isPluginMenu(menu){var live=pluginMenu();return !!(live&&live===menu);}
function installFallbackMenuToggle(menu){
  var button=menu&&menu.querySelector('.slicknav_btn'),nav=menu&&menu.querySelector('.slicknav_nav');
  if(!button||!nav||button.getAttribute('data-sc-fallback-toggle')==='true')return;
  button.setAttribute('data-sc-fallback-toggle','true');
  button.addEventListener('click',function(e){
    e.preventDefault();
    var open=button.classList.contains('slicknav_open')||nav.getAttribute('aria-hidden')==='false'||nav.style.display==='block',next=!open;
    button.classList.toggle('slicknav_open',next);button.classList.toggle('slicknav_collapsed',!next);
    nav.classList.toggle('slicknav_hidden',!next);nav.setAttribute('aria-hidden',next?'false':'true');nav.style.display=next?'block':'none';
    syncMenuButton(button,nav);
  });
}
function repairMobileHeader(finalAttempt){
  if(desktopQuery.matches)return;
  var menus=Array.prototype.slice.call(document.querySelectorAll('body > .slicknav_menu'));if(!menus.length)return;
  var live=pluginMenu();
  if(live&&menus.indexOf(live)===-1)live=null;
  if(!live&&!finalAttempt)return;
  if(!live)live=menus[0];
  menus.forEach(function(menu){if(menu!==live&&menu.parentNode)menu.parentNode.removeChild(menu);});
  live.classList.add('sc-mobile-main-menu');live.style.removeProperty('visibility');live.style.removeProperty('pointer-events');
  var button=live.querySelector('.slicknav_btn'),nav=live.querySelector('.slicknav_nav');
  if(!isPluginMenu(live))installFallbackMenuToggle(live);
  syncMenuButton(button,nav);
  if(button&&button.getAttribute('data-sc-a11y-sync')!=='true'){
    button.setAttribute('data-sc-a11y-sync','true');
    button.addEventListener('click',function(){window.setTimeout(function(){syncMenuButton(button,nav);},0);});
  }
  var logo=document.querySelector('.brandOnlyMobile img');
  if(logo){logo.style.removeProperty('margin-left');logo.style.removeProperty('transform');}
}
function schedule(){
  if(desktopQuery.matches)return;
  window.setTimeout(function(){repairMobileHeader(false);},0);
  window.setTimeout(function(){repairMobileHeader(false);},60);
  window.setTimeout(function(){repairMobileHeader(false);},180);
  window.setTimeout(function(){repairMobileHeader(true);},420);
}
utils.ready(schedule);
if(desktopQuery.addEventListener)desktopQuery.addEventListener('change',schedule);else desktopQuery.addListener(schedule);
SC.mobileHeader={repair:repairMobileHeader,schedule:schedule};
})();