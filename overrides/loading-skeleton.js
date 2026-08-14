(function(){
'use strict';
if(window.__scCatalogSkeletonDisabled)return;
window.__scCatalogSkeletonDisabled=true;

var currentScript=document.currentScript;
if(currentScript)currentScript.dataset.loaded='true';

var root=document.documentElement;
[
  'sc-catalog-skeleton',
  'sc-catalog-content-loading',
  'sc-catalog-skeleton-leaving',
  'sc-skeleton-ready'
].forEach(function(name){
  if(root.classList.contains(name))root.classList.remove(name);
});

var guard=document.getElementById('sc-skeleton-guard');
if(guard&&guard.parentNode)guard.parentNode.removeChild(guard);
})();
