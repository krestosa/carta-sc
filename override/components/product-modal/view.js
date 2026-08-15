(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config;if(!SC||!U||!C||SC.__productModalViewBooted)return;SC.__productModalViewBooted=true;
var each=U.each,text=U.text,template=null;

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
function build(link){
  var card=link.closest('.productoShop');if(!card)return null;
  var cardApi=SC.productCard||{};
  var name=text(card.querySelector('.title-shop1')),description=text(card.querySelector('.descrip'));
  var src=cardApi.imageSource?cardApi.imageSource(card):'';
  var titleId='sc-product-modal-title-'+Date.now();
  var overlay=ensureTemplate().content.firstElementChild.cloneNode(true);
  var dialog=overlay.querySelector('.sc-product-modal__dialog');
  var stage=overlay.querySelector('.sc-product-modal__image-stage');
  var title=overlay.querySelector('.sc-product-modal__title');
  var copy=overlay.querySelector('.sc-product-modal__description');
  var priceSlot=overlay.querySelector('.sc-product-modal__price-slot');
  var cta=overlay.querySelector('.sc-product-modal__cart-button');

  title.id=titleId;dialog.setAttribute('aria-labelledby',titleId);
  if(src){var image=new Image();image.className='sc-product-modal__image';image.src=src;image.alt=name;image.decoding='async';stage.appendChild(image);}
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