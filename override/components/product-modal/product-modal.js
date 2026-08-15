(function(){
'use strict';
var SC=window.SCOverride,utils=SC&&SC.utils,config=SC&&SC.config;
if(!SC||!utils||!config||SC.__productModalBooted)return;SC.__productModalBooted=true;
var each=utils.each,text=utils.text,ready=utils.ready;
var activeModal=null,previousFocus=null,backgroundState=[],template=null;

function ensureTemplate(){
  if(template)return template;
  template=document.createElement('template');
  template.innerHTML=[
    '<div class="sc-product-modal" role="presentation">',
      '<section class="sc-product-modal__dialog" role="dialog" aria-modal="true" tabindex="-1">',
        '<button class="sc-product-modal__close" type="button" aria-label="Cerrar detalle del producto">',
          '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/></svg>',
        '</button>',
        '<div class="sc-product-modal__image-stage"></div>',
        '<div class="sc-product-modal__content">',
          '<h2 class="sc-product-modal__title"></h2>',
          '<p class="sc-product-modal__description"></p>',
          '<div class="sc-product-modal__footer">',
            '<div class="sc-product-modal__price-slot"></div>',
            '<div class="sc-product-modal__actions">',
              '<a class="sc-product-modal__cart-button" aria-label="Pedilo Online en SushiClub">Pedilo Online</a>',
            '</div>',
          '</div>',
        '</div>',
      '</section>',
    '</div>'
  ].join('');
  return template;
}
function focusableElements(dialog){
  return Array.prototype.filter.call(
    dialog.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'),
    function(el){return el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';}
  );
}
function lockBackground(modal){
  backgroundState=[];
  var inertSupported=typeof HTMLElement!=='undefined'&&'inert' in HTMLElement.prototype;
  each(document.body.children,function(node){
    if(node===modal)return;
    var state={node:node,inertSupported:inertSupported};
    if(inertSupported){state.inert=!!node.inert;node.inert=true;}
    else{state.ariaHidden=node.getAttribute('aria-hidden');node.setAttribute('aria-hidden','true');}
    backgroundState.push(state);
  });
}
function unlockBackground(){
  backgroundState.forEach(function(state){
    if(!state.node||!document.documentElement.contains(state.node))return;
    if(state.inertSupported)state.node.inert=state.inert;
    else if(state.ariaHidden===null)state.node.removeAttribute('aria-hidden');
    else state.node.setAttribute('aria-hidden',state.ariaHidden);
  });
  backgroundState=[];
}
function closeModal(event){
  if(event)event.preventDefault();if(!activeModal)return;
  var modal=activeModal;activeModal=null;modal.classList.remove('is-visible');
  document.body.classList.remove('sc-product-modal-open');
  var restore=previousFocus;previousFocus=null;
  var delay=matchMedia('(prefers-reduced-motion: reduce)').matches?0:190;
  window.setTimeout(function(){
    if(modal.parentNode)modal.parentNode.removeChild(modal);
    unlockBackground();
    if(restore&&document.documentElement.contains(restore)){
      try{restore.focus({preventScroll:true});}catch(_){restore.focus();}
    }
  },delay);
}
function buildModal(link){
  var card=link.closest('.productoShop');if(!card)return null;
  var cardApi=SC.productCard||{};
  var name=text(card.querySelector('.title-shop1')),description=text(card.querySelector('.descrip'));
  var src=cardApi.imageSource?cardApi.imageSource(card):'';
  var titleId='sc-product-modal-title-'+Date.now();
  var overlay=ensureTemplate().content.firstElementChild.cloneNode(true);
  var dialog=overlay.querySelector('.sc-product-modal__dialog');
  var close=overlay.querySelector('.sc-product-modal__close');
  var stage=overlay.querySelector('.sc-product-modal__image-stage');
  var title=overlay.querySelector('.sc-product-modal__title');
  var copy=overlay.querySelector('.sc-product-modal__description');
  var priceSlot=overlay.querySelector('.sc-product-modal__price-slot');
  var cta=overlay.querySelector('.sc-product-modal__cart-button');

  title.id=titleId;dialog.setAttribute('aria-labelledby',titleId);
  close.addEventListener('click',closeModal);
  if(src){
    var image=new Image();image.className='sc-product-modal__image';image.src=src;image.alt=name;image.decoding='async';stage.appendChild(image);
  }
  var traits=cardApi.buildTraitGroup?cardApi.buildTraitGroup(card,'sc-product-modal__traits sabores'):null;
  if(traits)title.appendChild(traits);
  title.appendChild(document.createTextNode(name));
  if(description)copy.textContent=description;else copy.remove();

  var sourcePrice=card.querySelector('.priceRow');
  if(sourcePrice){
    var price=sourcePrice.cloneNode(true);price.className='sc-product-modal__price-row';
    each(price.querySelectorAll('.sumar,input,button'),function(node){if(node.parentNode)node.parentNode.removeChild(node);});
    priceSlot.replaceWith(price);
  }else priceSlot.remove();

  cta.href=config.urls.cart;
  overlay.addEventListener('mousedown',function(e){if(e.target===overlay)closeModal(e);});
  return overlay;
}
function openModal(link){
  if(activeModal)return;
  var modal=buildModal(link);if(!modal)return;
  previousFocus=link;document.body.appendChild(modal);document.body.classList.add('sc-product-modal-open');activeModal=modal;
  var close=modal.querySelector('.sc-product-modal__close');
  try{close.focus({preventScroll:true});}catch(_){close.focus();}
  lockBackground(modal);
  requestAnimationFrame(function(){if(activeModal===modal)modal.classList.add('is-visible');});
}
function installModal(){
  document.addEventListener('click',function(e){
    var link=e.target.closest&&e.target.closest('a.fancyboxModalAddProd');if(!link)return;
    if((e.button&&e.button!==0)||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();openModal(link);
  },true);
  document.addEventListener('keydown',function(e){
    if(!activeModal)return;
    if(e.key==='Escape'||e.key==='Esc'){e.preventDefault();closeModal();return;}
    if(e.key!=='Tab')return;
    var dialog=activeModal.querySelector('.sc-product-modal__dialog'),items=focusableElements(dialog);
    if(!items.length){e.preventDefault();dialog.focus();return;}
    var first=items[0],last=items[items.length-1],current=document.activeElement;
    if(e.shiftKey&&(current===first||!dialog.contains(current))){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&current===last){e.preventDefault();first.focus();}
  },true);
  document.addEventListener('focusin',function(e){
    if(!activeModal||activeModal.contains(e.target))return;
    var dialog=activeModal.querySelector('.sc-product-modal__dialog'),items=focusableElements(dialog);
    (items[0]||dialog).focus();
  });
}
ready(installModal);
SC.productModal={open:openModal,close:closeModal};
})();