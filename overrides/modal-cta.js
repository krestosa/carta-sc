(function(){
'use strict';
if(window.__scModalCtaBooted)return;
window.__scModalCtaBooted=true;

/* UX regression guard: never trap vertical wheel input on the horizontal
   category rail, and do not let the browser restore an old scroll position
   during the initial navigation/reload. */
if('scrollRestoration' in history)history.scrollRestoration='manual';

function ensureScrollChainFix(){
  if(document.getElementById('sc-scroll-chain-fix'))return;
  var style=document.createElement('style');
  style.id='sc-scroll-chain-fix';
  style.textContent='body.sushiShop .sc-catalog-categories,body.sushiShop .topShopMenuMobileScroller{overscroll-behavior-x:contain!important;overscroll-behavior-y:auto!important;}';
  document.head.appendChild(style);
}

function assetVersion(){return window.__scCatalogAssetVersion||'20260814-ux-hardening-v1';}
function ensureMotion(){
  if(document.getElementById('sc-modal-motion-js'))return;
  var script=document.createElement('script');
  script.id='sc-modal-motion-js';
  script.src='motion/modal-motion.js?v='+assetVersion();
  script.async=true;
  document.head.appendChild(script);
}

ensureScrollChainFix();
ensureMotion();
})();
