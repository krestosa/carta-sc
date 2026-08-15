(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,S=C&&C.selectors,A=C&&C.attributes,L=C&&C.labels,P=C&&C.prefixes,D=SC&&SC.productCardData,T=SC&&SC.templates;if(!SC||!U||!D||!T||SC.__productCardA11yBooted)return;SC.__productCardA11yBooted=true;
var each=U.each,text=U.text,cardSequence=0;

function cardKey(card){
  var key=card.getAttribute(A.a11yKey);if(key)return key;
  var hidden=card.querySelector(S.productId);
  var base=hidden&&hidden.value?String(hidden.value):'item';
  base=base.replace(/[^a-zA-Z0-9_-]/g,'-')||'item';
  key=base+'-'+(++cardSequence);card.setAttribute(A.a11yKey,key);return key;
}
function enhanceCardLink(link){
  var card=link.closest(S.productCard);if(!card)return;
  var key=cardKey(card);
  var title=card.querySelector(S.productTitle),desc=card.querySelector(S.productDescription);
  var current=card.querySelector(S.productCurrentPrice),previous=card.querySelector(S.productPreviousPrice);
  var titleId=D.ensureId(title,P.product+key+'-title'),descId=desc&&text(desc)?D.ensureId(desc,P.product+key+'-desc'):'';
  var currentText=D.cleanPriceText(current),previousText=D.cleanPriceText(previous),traits=D.traitLabels(card);
  if(current&&currentText)current.setAttribute('aria-label',(/^\$/.test(currentText)?L.currentPricePrefix:L.productStatePrefix)+currentText);
  if(previous&&previousText)previous.setAttribute('aria-label',L.previousPricePrefix+previousText);
  var meta=link.querySelector(S.productA11yMeta);
  if(!meta){meta=T.clone(C.templates.names.productCardA11yMeta);link.appendChild(meta);}
  meta.id=P.product+key+'-meta';
  var parts=[];
  if(currentText)parts.push((/^\$/.test(currentText)?L.currentPriceMetaPrefix:L.productStateMetaPrefix)+currentText);
  if(previousText)parts.push(L.previousPriceMetaPrefix+previousText);
  if(traits.length)parts.push(L.traitsPrefix+traits.join(', '));
  meta.textContent=parts.join('. ')+(parts.length?'.':'');
  link.removeAttribute('aria-label');if(titleId)link.setAttribute('aria-labelledby',titleId);
  var described=[];if(descId)described.push(descId);if(meta.textContent)described.push(meta.id);
  described.length?link.setAttribute('aria-describedby',described.join(' ')):link.removeAttribute('aria-describedby');
  link.setAttribute('aria-haspopup','dialog');
}
function enhanceProductLinks(){each(document.querySelectorAll(S.productLink),enhanceCardLink);}

SC.productCardA11y={enhanceLink:enhanceCardLink,enhanceAll:enhanceProductLinks};
})();
