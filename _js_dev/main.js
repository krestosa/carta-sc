(function(){
'use strict';
if(window.__scLegacyMainLoaderBooted)return;window.__scLegacyMainLoaderBooted=true;

var version='unversioned';
window.__scCatalogAssetVersion=version;

var root=document.documentElement;
root.classList.add('sc-catalog-prepaint','sc-no-loading-state');
['sc-catalog-skeleton','sc-catalog-content-loading','sc-catalog-skeleton-leaving','sc-skeleton-ready'].forEach(function(name){root.classList.remove(name);});

function applyRememberedTheme(){
  var mode='system',actual='light',dark=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;
  try{mode=localStorage.getItem('scTheme:v1')||'system';}catch(_){mode='system';}
  if(['system','light','dark'].indexOf(mode)<0)mode='system';actual=mode==='system'?(dark?'dark':'light'):mode;
  root.setAttribute('data-sc-theme',mode);root.setAttribute('data-sc-theme-resolved',actual);root.style.colorScheme=actual;
}
function applyRememberedView(){
  var width=window.innerWidth||root.clientWidth||0,context=width<=640?'phone':width<=992?'tablet':'desktop',mode='',legacy='';
  function migrate(value){return value==='list'?'list':value?'compact':'';}
  try{
    mode=localStorage.getItem('scCatalogView:v3')||'';
    if(mode==='normal')mode='compact';
    if(['compact','list'].indexOf(mode)<0){
      legacy=localStorage.getItem('scCatalogView:v2:'+context)||localStorage.getItem(context==='desktop'?'scCatalogView:desktop':'scCatalogView:mobile')||'';
      mode=migrate(legacy);
      if(mode){try{localStorage.setItem('scCatalogView:v3',mode);}catch(_){}}
    }
  }catch(_){mode='';}
  if(['compact','list'].indexOf(mode)<0)mode='compact';
  root.setAttribute('data-sc-catalog-view',mode);
}
applyRememberedTheme();applyRememberedView();

function writeBootstrap(){
  document.write('<script src="_js_dev/main-legacy.js?v='+version+'"><\/script>');
  document.write('<link id="sc-override-main-css" rel="stylesheet" href="override/main.css?v='+version+'">');
  document.write('<script id="sc-override-main-js" src="override/main.js?v='+version+'"><\/script>');
}
function appendBootstrap(){
  var legacy=document.createElement('script');legacy.src='_js_dev/main-legacy.js?v='+version;legacy.async=false;
  legacy.onload=function(){
    var css=document.createElement('link');css.id='sc-override-main-css';css.rel='stylesheet';css.href='override/main.css?v='+version;document.head.appendChild(css);
    var script=document.createElement('script');script.id='sc-override-main-js';script.src='override/main.js?v='+version;script.async=false;document.head.appendChild(script);
  };
  document.head.appendChild(legacy);
}
if(document.readyState==='loading')writeBootstrap();else appendBootstrap();
})();
