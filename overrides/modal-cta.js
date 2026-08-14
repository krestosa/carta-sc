(function(){
'use strict';
if(window.__scModalCtaBooted)return;
window.__scModalCtaBooted=true;

var CART_URL='https://www.sushiclub.com.ar/shop_init.php';
var observer=null;

function enhanceModal(modal){
  if(!modal||modal.nodeType!==1)return;
  var content=modal.matches&&modal.matches('.sc-product-modal')
    ? modal.querySelector('.sc-product-modal__content')
    : modal.querySelector&&modal.querySelector('.sc-product-modal .sc-product-modal__content');
  if(!content||content.querySelector('.sc-product-modal__cart-button'))return;

  var actions=document.createElement('div');
  actions.className='sc-product-modal__actions';

  var cta=document.createElement('a');
  cta.className='sc-product-modal__cart-button';
  cta.href=CART_URL;
  cta.textContent='Agregar al carro';
  cta.setAttribute('aria-label','Agregar al carro y continuar en SushiClub');

  actions.appendChild(cta);
  content.appendChild(actions);
}

function scan(root){
  if(!root)return;
  if(root.matches&&root.matches('.sc-product-modal'))enhanceModal(root);
  if(root.querySelectorAll){
    root.querySelectorAll('.sc-product-modal').forEach(enhanceModal);
  }
}

function boot(){
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
