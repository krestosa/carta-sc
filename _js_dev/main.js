(function(){
'use strict';
if(window.__scLegacyMainLoaderBooted)return;window.__scLegacyMainLoaderBooted=true;

var version='unversioned';
window.__scCatalogAssetVersion=version;

var root=document.documentElement;
root.classList.add('sc-catalog-prepaint','sc-no-loading-state');
['sc-catalog-skeleton','sc-catalog-content-loading','sc-catalog-skeleton-leaving','sc-skeleton-ready'].forEach(function(name){root.classList.remove(name);});

function applyRememberedView(){
  var width=window.innerWidth||root.clientWidth||0,context=width<=640?'phone':width<=992?'tablet':'desktop',mode='',legacy='';
  function migrate(value){if(value==='list')return'list';if(context==='phone')return value==='two'?'compact':value==='one'?'normal':'';if(context==='tablet')return value==='three'||value==='four'?'compact':value==='two'?'normal':'';return value==='four'?'compact':value==='three'?'normal':'';}
  try{mode=localStorage.getItem('scCatalogView:v3')||'';if(['normal','compact','list'].indexOf(mode)<0){legacy=localStorage.getItem('scCatalogView:v2:'+context)||localStorage.getItem(context==='desktop'?'scCatalogView:desktop':'scCatalogView:mobile')||'';mode=migrate(legacy);if(mode){try{localStorage.setItem('scCatalogView:v3',mode);}catch(_){}}}}catch(_){mode='';}
  if(['normal','compact','list'].indexOf(mode)<0)mode='normal';
  root.setAttribute('data-sc-catalog-view',mode);
}
applyRememberedView();

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
