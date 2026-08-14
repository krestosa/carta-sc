(function(){
'use strict';
if(window.__scModalCtaBooted)return;
window.__scModalCtaBooted=true;

var CART_URL='https://www.sushiclub.com.ar/shop_init.php';
var observer=null;

function assetVersion(){return window.__scCatalogAssetVersion||'20260814-1600-lines-modal-v3';}

function ensureStyles(){
  if(document.getElementById('sc-modal-cta-css'))return;
  var link=document.createElement('link');
  link.id='sc-modal-cta-css';
  link.rel='stylesheet';
  link.href='overrides/modal-cta.css?v='+assetVersion();
  document.head.appendChild(link);
}

function ensureMotion(){
  if(document.getElementById('sc-modal-motion-js'))return;
  var script=document.createElement('script');
  script.id='sc-modal-motion-js';
  script.src='motion/modal-motion.js?v='+assetVersion();
  script.async=true;
  document.head.appendChild(script);
}

function enhanceModal(modal){
  if(!modal||modal.nodeType!==1)return;
  var content=modal.matches&&modal.matches('.sc-product-modal')
    ? modal.querySelector('.sc-product-modal__content')
    : modal.querySelector&&modal.querySelector('.sc-product-modal .sc-product-modal__content');
  if(!content)return;

  var footer=content.querySelector('.sc-product-modal__footer');
  var price=content.querySelector('.sc-product-modal__price-row');

  if(!footer){
    footer=document.createElement('div');
    footer.className='sc-product-modal__footer';
    if(price){
      content.insertBefore(footer,price);
      footer.appendChild(price);
    }else{
      content.appendChild(footer);
    }
  }else if(price&&price.parentNode!==footer){
    footer.insertBefore(price,footer.firstChild);
  }

  if(footer.querySelector('.sc-product-modal__cart-button'))return;

  var actions=document.createElement('div');
  actions.className='sc-product-modal__actions';

  var cta=document.createElement('a');
  cta.className='sc-product-modal__cart-button';
  cta.href=CART_URL;
  cta.textContent='Agregar al carro';
  cta.setAttribute('aria-label','Agregar al carro y continuar en SushiClub');

  actions.appendChild(cta);
  footer.appendChild(actions);
}

function scan(root){
  if(!root)return;
  if(root.matches&&root.matches('.sc-product-modal'))enhanceModal(root);
  if(root.querySelectorAll){
    root.querySelectorAll('.sc-product-modal').forEach(enhanceModal);
  }
}

function boot(){
  ensureStyles();
  ensureMotion();
  scan(document);
  if(!document.body||!window.MutationObserver)return;
  observer=new MutationObserver(function(mutations){
    mutations.forEach(function(mutation){
      Array.prototype.forEach.call(mutation.addedNodes,function(node){scan(node);});
    });
  });
  observer.observe(document.body,{childList:true,subtree:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
