/* Enriquece las tarjetas con nombres, relaciones y metadatos accesibles sin modificar
   el contenido visible. Mantiene título, descripción, precio y rasgos ligados al enlace. */
(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,S=C&&C.selectors,D=SC&&SC.productCardData,T=SC&&SC.templates;if(!SC||!U||!D||!T||SC.__productCardA11yBooted)return;SC.__productCardA11yBooted=true;
var each=U.each,text=U.text,cardSequence=0,ID_PREFIX='sc-product-';

/* Genera una clave estable por instancia para evitar IDs repetidos entre productos. */
function cardKey(card){var key=card.getAttribute("data-sc-a11y-key");if(key)return key;var hidden=card.querySelector(".producto-id");var base=hidden&&hidden.value?String(hidden.value):'item';base=base.replace(/[^a-zA-Z0-9_-]/g,'-')||'item';key=base+'-'+(++cardSequence);card.setAttribute("data-sc-a11y-key",key);return key;}
/* Construye la descripción accesible del enlace con título, precios, rasgos y descripción. */
function enhanceCardLink(link){
  var card=link.closest(S.productCard);if(!card)return;var key=cardKey(card);var title=card.querySelector(S.productTitle),desc=card.querySelector(S.productDescription);var current=card.querySelector(".priceRow .priceHijass, .priceRow .price"),previous=card.querySelector(".priceRow .ofertaPrice");var titleId=D.ensureId(title,"sc-product-"+key+'-title'),descId=desc&&text(desc)?D.ensureId(desc,"sc-product-"+key+'-desc'):'';var currentText=D.cleanPriceText(current),previousText=D.cleanPriceText(previous),traits=D.traitLabels(card);
  if(current&&currentText)current.setAttribute('aria-label',(/^\$/.test(currentText)?'Precio actual: ':'Estado del producto: ')+currentText);if(previous&&previousText)previous.setAttribute('aria-label','Precio anterior: '+previousText);
  var meta=link.querySelector(".sc-card-a11y-meta");if(!meta){meta=T.clone('product-card-a11y-meta');link.appendChild(meta);}meta.id="sc-product-"+key+'-meta';var parts=[];if(currentText)parts.push((/^\$/.test(currentText)?'Precio actual ':'Estado ')+currentText);if(previousText)parts.push('Precio anterior '+previousText);if(traits.length)parts.push(D.traitsLabelPrefix+traits.join(', '));meta.textContent=parts.join('. ')+(parts.length?'.':'');link.removeAttribute('aria-label');var labelled=[];if(titleId)labelled.push(titleId);if(meta.textContent)labelled.push(meta.id);labelled.length?link.setAttribute('aria-labelledby',labelled.join(' ')):link.removeAttribute('aria-labelledby');if(descId)link.setAttribute('aria-describedby',descId);else link.removeAttribute('aria-describedby');link.setAttribute('aria-haspopup','dialog');
}
/* Ajusta el nivel semántico del título según la sección o subsección que contiene la card. */
function enhanceHeadingLevels(){var level=3,selector=S.productList+' '+S.sectionTitle+','+S.productList+' '+S.sectionSubtitle+','+S.productCards;each(document.querySelectorAll(selector),function(node){if(node.matches(S.sectionTitle)){level=3;return;}if(node.matches(S.sectionSubtitle)){level=4;return;}var title=node.querySelector(S.productTitle);if(title)title.setAttribute('aria-level',String(level));});}
function enhanceProductLinks(root){enhanceHeadingLevels();root=root&&root.querySelectorAll?root:document;each(root.querySelectorAll(S.productLink),enhanceCardLink);}

SC.productCardA11y={enhanceLink:enhanceCardLink,enhanceHeadings:enhanceHeadingLevels,enhanceAll:enhanceProductLinks};
})();
