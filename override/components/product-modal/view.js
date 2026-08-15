(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,T=SC&&SC.templates;if(!SC||!U||!C||!T||SC.__productModalViewBooted)return;SC.__productModalViewBooted=true;
var each=U.each,text=U.text,S=C.selectors;

function build(link){
  var card=link.closest(S.productCard);if(!card)return null;
  var cardApi=SC.productCard||{};
  var name=text(card.querySelector(S.productTitle)),description=text(card.querySelector(S.productDescription));
  var src=cardApi.imageSource?cardApi.imageSource(card):'';
  var titleId='sc-product-modal-title-'+Date.now();
  var overlay=T.clone('product-modal');
  var dialog=overlay.querySelector(S.productModalDialog);
  var image=overlay.querySelector('.sc-product-modal__image');
  var title=overlay.querySelector('.sc-product-modal__title');
  var copy=overlay.querySelector('.sc-product-modal__description');
  var priceSlot=overlay.querySelector('.sc-product-modal__price-slot');
  var cta=overlay.querySelector('.sc-product-modal__cart-button');

  title.id=titleId;dialog.setAttribute('aria-labelledby',titleId);
  if(src){image.src=src;image.alt=name;}else image.remove();
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
  cta.href=C.urls.cart;
  return overlay;
}

SC.productModalView={build:build};
})();
