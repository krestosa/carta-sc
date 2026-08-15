(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,P=C&&C.prefixes,T=SC&&SC.templates;if(!SC||!U||!C||!T||SC.__productModalViewBooted)return;SC.__productModalViewBooted=true;
var each=U.each,text=U.text,S=C.selectors;

function build(link){
  var card=link.closest(S.productCard);if(!card)return null;
  var cardApi=SC.productCard||{};
  var name=text(card.querySelector(S.productTitle)),description=text(card.querySelector(S.productDescription));
  var src=cardApi.imageSource?cardApi.imageSource(card):'';
  var titleId=P.productModalTitle+Date.now();
  var overlay=T.clone(C.templates.names.productModal);
  var dialog=overlay.querySelector(S.productModalDialog);
  var image=overlay.querySelector(S.productModalImage);
  var title=overlay.querySelector(S.productModalTitle);
  var copy=overlay.querySelector(S.productModalDescription);
  var priceSlot=overlay.querySelector(S.productModalPriceSlot);
  var cta=overlay.querySelector(S.productModalCartButton);

  title.id=titleId;dialog.setAttribute('aria-labelledby',titleId);
  if(src){image.src=src;image.alt=name;}else image.remove();
  var traits=cardApi.buildTraitGroup?cardApi.buildTraitGroup(card,C.classes.productModalTraits):null;
  if(traits)title.appendChild(traits);
  title.appendChild(document.createTextNode(name));
  if(description)copy.textContent=description;else copy.remove();

  var sourcePrice=card.querySelector(S.productModalSourcePrice);
  if(sourcePrice){
    var price=sourcePrice.cloneNode(true);price.className=C.classes.productModalPriceRow;
    each(price.querySelectorAll(S.productModalLegacyControls),function(node){if(node.parentNode)node.parentNode.removeChild(node);});
    priceSlot.replaceWith(price);
  }else priceSlot.remove();
  cta.href=C.urls.cart;
  return overlay;
}

SC.productModalView={build:build};
})();
