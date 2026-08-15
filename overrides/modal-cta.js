(function(){
'use strict';
if(window.__scModalCtaBooted)return;
window.__scModalCtaBooted=true;
function assetVersion(){return window.__scCatalogAssetVersion||'20260814-ux-hardening-v1';}
function ensureMotion(){
  if(document.getElementById('sc-modal-motion-js'))return;
  var script=document.createElement('script');
  script.id='sc-modal-motion-js';
  script.src='motion/modal-motion.js?v='+assetVersion();
  script.async=true;
  document.head.appendChild(script);
}
ensureMotion();
})();
