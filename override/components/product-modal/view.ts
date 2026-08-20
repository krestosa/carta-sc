/* Construye la vista del modal desde la card seleccionada. */
(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,T=SC&&SC.templates;if(!SC||!U||!C||!T||SC.__productModalViewBooted)return;SC.__productModalViewBooted=true;
var each=U.each,text=U.text,S=C.selectors,MS=SC.productModalSelectors=SC.productModalSelectors||{dialog:'.sc-product-modal__dialog'},CART_URL='https://www.sushiclub.com.ar/shop_init.php';
function required<T extends Element>(root:Element,selector:string):T{var node=root.querySelector<T>(selector);if(!node)throw new Error('[SushiClub modal] Falta '+selector);return node;}
function build(link:HTMLElement):HTMLElement|null{
  var card=link.closest<HTMLElement>(S.productCard);if(!card)return null;var cardApi=SC.productCard||{},contentApi=SC.productCardContent||{};if(contentApi.installFlavorRow)contentApi.installFlavorRow(link);
  var name=text(card.querySelector(S.productTitle)),description=text(card.querySelector(S.productDescription)),src=cardApi.imageSource?cardApi.imageSource(card):'',titleId='sc-product-modal-title-'+Date.now(),overlay=T.clone('product-modal') as HTMLElement;
  var dialog=required<HTMLElement>(overlay,MS.dialog),image=required<HTMLImageElement>(overlay,'.sc-product-modal__image'),title=required<HTMLElement>(overlay,'.sc-product-modal__title'),copy=required<HTMLElement>(overlay,'.sc-product-modal__description'),priceSlot=required<HTMLElement>(overlay,'.sc-product-modal__price-slot'),cta=required<HTMLAnchorElement>(overlay,'.sc-product-modal__cart-button');
  title.id=titleId;dialog.setAttribute('aria-labelledby',titleId);if(src){image.src=String(src);image.alt=name;}else image.remove();
  var labels:string[]=cardApi.traitLabels?cardApi.traitLabels(card):[],source=card.querySelector<HTMLElement>(S.productTitle+' '+S.productTraits)||card,traits:HTMLElement|null=contentApi.buildTraitRow?contentApi.buildTraitRow('sc-product-modal__traits sabores',labels,source):null;
  title.appendChild(document.createTextNode(name));if(description)copy.textContent=description;else copy.remove();
  var sourcePrice=card.querySelector<HTMLElement>('.priceRow');if(sourcePrice){var price=sourcePrice.cloneNode(true) as HTMLElement;price.className='sc-product-modal__price-row';each(price.querySelectorAll('.sumar,input,button,.sc-product-price-traits'),function(node:Element):void{if(node.parentNode)node.parentNode.removeChild(node);});var secondary=price.querySelector<HTMLElement>('.sc-product-secondary-meta');price.classList.toggle('sc-price-row-has-offer',!!price.querySelector('.ofertaPrice'));if(secondary){secondary.classList.add('sc-product-modal__secondary-meta');if(traits)secondary.appendChild(traits);}else if(traits)price.appendChild(traits);priceSlot.replaceWith(price);}else{priceSlot.remove();if(traits)title.insertBefore(traits,title.firstChild);}cta.href=CART_URL;return overlay;
}
SC.productModalView={build:build};
})();
