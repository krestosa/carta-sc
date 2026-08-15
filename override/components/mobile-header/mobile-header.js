(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,S=C&&C.selectors,K=C&&C.classes,H={pluginDataKey:'plugin_slicknav',repairDelays:[0,60,120,240]};
if(!SC||!U||!C||SC.__mobileHeaderBooted)return;SC.__mobileHeaderBooted=true;
var desktopQuery=C.queries.desktop,retryTimer=0;

function syncMenuButton(button,nav){
  if(!button||!nav)return;
  var open=button.classList.contains("slicknav_open")||nav.getAttribute('aria-hidden')==='false'||nav.style.display==='block';
  if(!nav.id)nav.id="sc-mobile-primary-menu";
  button.setAttribute('aria-controls',nav.id);
  button.setAttribute('aria-expanded',open?'true':'false');
  button.setAttribute('aria-label',open?'Cerrar menú de navegación':'Abrir menú de navegación');
  button.setAttribute('title','Menú');
}
function pluginMenu(){
  var source=document.getElementById("menuMobile"),jq=window.jQuery;
  if(!source||!jq)return null;
  try{
    var instance=jq(source).data(H.pluginDataKey);
    var button=instance&&instance.btn&&instance.btn[0];
    return button&&button.closest?button.closest(".slicknav_menu"):null;
  }catch(_){return null;}
}
function isPluginMenu(menu){var live=pluginMenu();return !!(live&&live===menu);}
function installFallbackMenuToggle(menu){
  var button=menu&&menu.querySelector(".slicknav_btn"),nav=menu&&menu.querySelector(".slicknav_nav");
  if(!button||!nav||button.getAttribute("data-sc-fallback-toggle")==='true')return;
  button.setAttribute("data-sc-fallback-toggle",'true');
  button.addEventListener('click',function(e){
    e.preventDefault();
    var open=button.classList.contains("slicknav_open")||nav.getAttribute('aria-hidden')==='false'||nav.style.display==='block',next=!open;
    button.classList.toggle("slicknav_open",next);button.classList.toggle("slicknav_collapsed",!next);
    nav.classList.toggle("slicknav_hidden",!next);nav.setAttribute('aria-hidden',next?'false':'true');nav.style.display=next?'block':'none';
    syncMenuButton(button,nav);
  });
}
function repairMobileHeader(finalAttempt){
  if(desktopQuery.matches)return true;
  var menus=Array.prototype.slice.call(document.querySelectorAll("body > .slicknav_menu"));if(!menus.length)return false;
  var live=pluginMenu();
  if(live&&menus.indexOf(live)===-1)live=null;
  if(!live&&!finalAttempt)return false;
  if(!live)live=menus[0];
  menus.forEach(function(menu){if(menu!==live&&menu.parentNode)menu.parentNode.removeChild(menu);});
  live.classList.add("sc-mobile-main-menu");live.style.removeProperty('visibility');live.style.removeProperty('pointer-events');
  var button=live.querySelector(".slicknav_btn"),nav=live.querySelector(".slicknav_nav");
  if(!isPluginMenu(live))installFallbackMenuToggle(live);
  syncMenuButton(button,nav);
  if(button&&button.getAttribute("data-sc-a11y-sync")!=='true'){
    button.setAttribute("data-sc-a11y-sync",'true');
    button.addEventListener('click',function(){window.setTimeout(function(){syncMenuButton(button,nav);},0);});
  }
  var logo=document.querySelector(".brandOnlyMobile img");
  if(logo){logo.style.removeProperty('margin-left');logo.style.removeProperty('transform');}
  return true;
}
function schedule(){
  if(retryTimer){clearTimeout(retryTimer);retryTimer=0;}
  if(desktopQuery.matches)return;
  var delays=H.repairDelays,index=0;
  function attempt(){
    retryTimer=0;
    var finalAttempt=index===delays.length-1;
    if(repairMobileHeader(finalAttempt))return;
    index+=1;
    if(index<delays.length)retryTimer=window.setTimeout(attempt,delays[index]);
  }
  retryTimer=window.setTimeout(attempt,delays[0]);
}
U.ready(schedule);
if(desktopQuery.addEventListener)desktopQuery.addEventListener('change',schedule);else desktopQuery.addListener(schedule);
SC.mobileHeader={repair:repairMobileHeader,schedule:schedule};
})();
