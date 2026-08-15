(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,D=SC&&SC.productCardData;if(!SC||!U||!D||SC.__productCardA11yBooted)return;SC.__productCardA11yBooted=true;
var each=U.each,text=U.text,cardSequence=0;

function cardKey(card){
  var key=card.getAttribute('data-sc-a11y-key');if(key)return key;
  var hidden=card.querySelector('.producto-id');
  var base=hidden&&hidden.value?String(hidden.value):'item';
  base=base.replace(/[^a-zA-Z0-9_-]/g,'-')||'item';
  key=base+'-'+(++cardSequence);card.setAttribute('data-sc-a11y-key',key);return key;
}
function enhanceCardLink(link){
  var card=link.closest('.productoShop');if(!card)return;
  var key=cardKey(card);
  var title=card.querySelector('.title-shop1'),desc=card.querySelector('.descrip');
  var current=card.querySelector('.priceRow .priceHijass, .priceRow .price'),previous=card.querySelector('.priceRow .ofertaPrice');
  var titleId=D.ensureId(title,'sc-product-'+key+'-title'),descId=desc&&text(desc)?D.ensureId(desc,'sc-product-'+key+'-desc'):'';
  var currentText=D.cleanPriceText(current),previousText=D.cleanPriceText(previous),traits=D.traitLabels(card);
  if(current&&currentText)current.setAttribute('aria-label',(/^\$/.test(currentText)?'Precio actual: ':'Estado del producto: ')+currentText);
  if(previous&&previousText)previous.setAttribute('aria-label','Precio anterior: '+previousText);
  var meta=link.querySelector('.sc-card-a11y-meta');
  if(!meta){meta=document.createElement('span');meta.className='sc-card-a11y-meta sc-sr-only';link.appendChild(meta);}
  meta.id='sc-product-'+key+'-meta';
  var parts=[];
  if(currentText)parts.push((/^\$/.test(currentText)?'Precio actual ':'Estado ')+currentText);
  if(previousText)parts.push('Precio anterior '+previousText);
  if(traits.length)parts.push('Características: '+traits.join(', '));
  meta.textContent=parts.join('. ')+(parts.length?'.':'');
  link.removeAttribute('aria-label');if(titleId)link.setAttribute('aria-labelledby',titleId);
  var described=[];if(descId)described.push(descId);if(meta.textContent)described.push(meta.id);
  described.length?link.setAttribute('aria-describedby',described.join(' ')):link.removeAttribute('aria-describedby');
  link.setAttribute('aria-haspopup','dialog');
}
function enhanceProductLinks(){each(document.querySelectorAll('a.fancyboxModalAddProd'),enhanceCardLink);}

SC.productCardA11y={enhanceLink:enhanceCardLink,enhanceAll:enhanceProductLinks};
})();
