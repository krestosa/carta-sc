/* Construye la vista del modal desde la card seleccionada. Reutiliza datos, precio y rasgos
   ya normalizados para que el detalle no mantenga una segunda fuente de información. */
(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,T=SC&&SC.templates;if(!SC||!U||!C||!T||SC.__productModalViewBooted)return;SC.__productModalViewBooted=true;
var each=U.each,text=U.text,S=C.selectors,MS=SC.productModalSelectors=SC.productModalSelectors||{dialog:'.sc-product-modal__dialog'},CART_URL='https://www.sushiclub.com.ar/shop_init.php';

/* Clona el template y copia únicamente contenido útil desde la tarjeta de origen. */
function build(link){
  var card=link.closest(S.productCard);if(!card)return null;
  var cardApi=SC.productCard||{},contentApi=SC.productCardContent||{};
  var name=text(card.querySelector(S.productTitle)),description=text(card.querySelector(S.productDescription));
  var src=cardApi.imageSource?cardApi.imageSource(card):'';
  var titleId="sc-product-modal-title-"+Date.now();
  var overlay=T.clone('product-modal');
  var dialog=overlay.querySelector(MS.dialog);
  var image=overlay.querySelector(".sc-product-modal__image");
  var title=overlay.querySelector(".sc-product-modal__title");
  var copy=overlay.querySelector(".sc-product-modal__description");
  var priceSlot=overlay.querySelector(".sc-product-modal__price-slot");
  var cta=overlay.querySelector(".sc-product-modal__cart-button");

  /* Vincula título e imagen al diálogo y elimina slots que no tengan contenido real. */
  title.id=titleId;dialog.setAttribute('aria-labelledby',titleId);
  if(src){image.src=src;image.alt=name;}else image.remove();
  var labels=cardApi.traitLabels?cardApi.traitLabels(card):[],source=card.querySelector(S.productTitle+' '+S.productTraits)||card;
  var traits=contentApi.buildTraitRow?contentApi.buildTraitRow('sc-product-modal__traits sabores',labels,source):null;
  title.appendChild(document.createTextNode(name));
  if(description)copy.textContent=description;else copy.remove();

  /* Clona la fila de precio, quita controles legacy y vuelve a insertar los rasgos propios. */
  var sourcePrice=card.querySelector(".priceRow");
  if(sourcePrice){
    var price=sourcePrice.cloneNode(true);price.className="sc-product-modal__price-row";
    each(price.querySelectorAll(".sumar,input,button,.sc-product-price-traits"),function(node){if(node.parentNode)node.parentNode.removeChild(node);});
    price.classList.toggle('sc-price-row-has-offer',!!price.querySelector('.ofertaPrice'));
    if(traits)price.appendChild(traits);
    priceSlot.replaceWith(price);
  }else{
    priceSlot.remove();
    if(traits)title.insertBefore(traits,title.firstChild);
  }
  cta.href=CART_URL;
  return overlay;
}

SC.productModalView={build:build};
})();
