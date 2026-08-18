/* Normaliza contenido visual de las tarjetas: rasgos, iconos y truncado de descripción.
   Las mediciones se agrupan por lotes para evitar lecturas y escrituras de layout mezcladas. */
(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,S=C&&C.selectors,K=C&&C.classes,D=SC&&SC.productCardData;if(!SC||!U||!D||SC.__productCardContentBooted)return;SC.__productCardContentBooted=true;
var each=U.each,descriptionStartRaf=0,descriptionMeasureRaf=0,descriptionWriteRaf=0,descriptionIdle=0,descriptionTimer=0,descriptionQueue=[],descriptionStates=[],descriptionRerun=false,descriptionVisibilityObserver=null,descriptionObservedCards=new Set(),referenceStrip=null,DESCRIPTION_BATCH=8,DESCRIPTION_BUDGET_MS=4,DESCRIPTION_WRITE_BATCH=24,DESCRIPTION_IDLE_TIMEOUT=1400;

/* Traduce etiquetas legacy a una clave, etiqueta e icono consistentes para todo el catálogo. */
function traitKey(label){return(label||'').trim().toLocaleLowerCase('es-AR');}
function traitSpec(label){var key=traitKey(label);if(key==='poco picante')return{key:'poco picante',label:'Poco Picante',icon:'algo picante'};if(key==='algo picante')return{key:'picante',label:'Picante',icon:'poco picante'};if(key==='picante')return{key:'picante',label:'Picante',icon:'poco picante'};if(key==='muy picante')return{key:'muy picante',label:'Muy Picante',icon:'muy picante'};if(key==='vegetariano')return{key:'vegetariano',label:'Vegetariano',icon:'vegetariano'};return{key:key,label:(label||'').trim(),icon:key};}
function markTrait(node,key){if(node&&node.setAttribute)node.setAttribute('data-sc-trait',key);return node;}
function appendTraitVisual(target,source,label){var spec=traitSpec(label),icon=D.createTraitIcon(spec.icon),node;if(icon){markTrait(icon,spec.key);target.appendChild(icon);return icon;}node=D.appendTraitVisual(target,source,label);markTrait(node,spec.key);return node;}

/* Envuelve el texto de descripción en una caja propia para medir exactamente sus dos líneas. */
function descriptionNode(target){if(!target)return null;if(target.matches&&target.matches(S.productDescription))return target;return target.querySelector?target.querySelector(S.productDescription):null;}
function ensureDescriptionCopy(target){
  var desc=descriptionNode(target),copy,child;if(!desc)return null;
  child=desc.firstElementChild;while(child){if(child.classList&&child.classList.contains('sc-description-copy')){copy=child;break;}child=child.nextElementSibling;}
  if(copy)return copy;
  copy=document.createElement('span');copy.className='sc-description-copy';
  while(desc.firstChild)copy.appendChild(desc.firstChild);
  desc.appendChild(copy);return copy;
}

/* Reconstruye rasgos visibles desde una única fuente y elimina filas duplicadas anteriores. */
function clearFlavorRows(root){
  root=root&&root.querySelectorAll?root:document;
  each(root.querySelectorAll('.sc-product-secondary-meta'),function(group){var offer=group.querySelector('.ofertaPrice'),parent=group.parentNode;if(!parent)return;if(offer)parent.insertBefore(offer,group);parent.removeChild(group);});
  each(root.querySelectorAll('.sc-product-flavors,.sc-product-price-traits'),function(row){if(row.parentNode)row.parentNode.removeChild(row);});
}
function positionTraitReferences(){var strip=referenceStrip||document.querySelector('.referencias_picor'),tools=document.querySelector('.sc-catalog-tools'),results,spacer;if(!strip)return;referenceStrip=strip;strip.classList.add('sc-trait-reference-strip');spacer=strip.previousElementSibling;if(spacer&&!(spacer.textContent||'').trim()&&spacer.querySelector&&spacer.querySelector('br'))spacer.classList.add('sc-trait-reference-legacy-spacer');if(!tools)return;results=tools.querySelector('.sc-catalog-search-results');if(strip.parentNode!==tools||strip.nextElementSibling!==results)tools.insertBefore(strip,results||null);}
function installTraitReferences(){each(document.querySelectorAll('.referencias_picor .refBox'),function(box){var labelNode=box.querySelector('.ref_label'),image=box.querySelector('.imgRef img'),host=box.querySelector('.imgRef');var label=((labelNode&&labelNode.textContent)||(image&&image.getAttribute('data-original-title'))||'').trim(),spec=traitSpec(label),icon;if(D.ignoredTrait(label)){if(box.parentNode)box.parentNode.removeChild(box);return;}if(labelNode)labelNode.textContent=spec.label;if(!host)return;icon=D.createTraitIcon(spec.icon);if(icon){host.textContent='';markTrait(icon,spec.key);host.appendChild(icon);}});positionTraitReferences();}
function buildTraitRow(className,labels,source){var row=document.createElement('span');row.className=className;var accessible=[];each(labels,function(label){var spec=traitSpec(label);appendTraitVisual(row,source,label);if(accessible.indexOf(spec.label)<0)accessible.push(spec.label);});if(accessible.length){row.setAttribute('role','img');row.setAttribute('aria-label',D.traitsLabelPrefix+accessible.join(', '));}else row.setAttribute('aria-hidden','true');return row;}
function installFlavorRow(link){
  if(!link)return;ensureDescriptionCopy(link);clearFlavorRows(link);
  var title=link.querySelector(S.productTitle),source=title&&title.querySelector(S.productTraits),priceRow=link.querySelector('.priceRow');if(source)source.setAttribute('aria-hidden','true');var labels=D.traitLabels(source||link),row=buildTraitRow('sc-product-flavors',labels,source||link);link.appendChild(row);
  if(priceRow){
    var offer=priceRow.querySelector('.ofertaPrice'),secondary=document.createElement('span'),priceTraits=buildTraitRow('sc-product-price-traits',labels,source||link);
    priceRow.classList.toggle('sc-price-row-has-offer',!!offer);secondary.className='sc-product-secondary-meta';if(offer)secondary.appendChild(offer);secondary.appendChild(priceTraits);priceRow.appendChild(secondary);
  }
}
function installFlavorRows(root){root=root&&root.querySelectorAll?root:document;installTraitReferences();each(root.querySelectorAll(S.productCard+' > '+S.productLink),installFlavorRow);}

/* El truncado separa lectura y escritura para no forzar layout repetidamente en listas largas. */
function measurementActive(){return!!(descriptionStartRaf||descriptionMeasureRaf||descriptionWriteRaf||descriptionIdle||descriptionTimer||descriptionQueue.length||descriptionStates.length);}
function ensureDescriptionVisibilityObserver(){
  if(descriptionVisibilityObserver||!window.IntersectionObserver)return descriptionVisibilityObserver;
  descriptionVisibilityObserver=new IntersectionObserver(function(entries){var rerun=false;entries.forEach(function(entry){if(!entry.isIntersecting)return;descriptionVisibilityObserver.unobserve(entry.target);descriptionObservedCards.delete(entry.target);rerun=true;});if(rerun)scheduleDescriptionMeasure();},{root:null,rootMargin:'0px 0px 1px 0px',threshold:0});
  return descriptionVisibilityObserver;
}
/* Omite cards saltadas por content-visibility y las mide recién cuando vuelven a ser relevantes. */
function deferSkippedDescription(desc){
  var card=desc&&desc.closest?desc.closest(S.productCard):null,visible=true,observer;
  if(!card||typeof card.checkVisibility!=='function')return false;
  try{visible=card.checkVisibility({contentVisibilityAuto:true});}catch(_){return false;}
  if(visible){if(descriptionVisibilityObserver&&descriptionObservedCards.has(card)){descriptionVisibilityObserver.unobserve(card);descriptionObservedCards.delete(card);}return false;}
  observer=ensureDescriptionVisibilityObserver();if(!observer)return false;
  if(!descriptionObservedCards.has(card)){descriptionObservedCards.add(card);observer.observe(card);}return true;
}
function pruneDescriptionVisibilityObserver(){if(!descriptionVisibilityObserver)return;descriptionObservedCards.forEach(function(card){if(document.documentElement.contains(card))return;descriptionVisibilityObserver.unobserve(card);descriptionObservedCards.delete(card);});}
/* Lee scroll/client sizes en lotes cortos y almacena únicamente el resultado booleano. */
function scheduleReadBatch(){if(descriptionIdle||descriptionTimer)return;if(typeof window.requestIdleCallback==='function'){descriptionIdle=window.requestIdleCallback(runReadBatch,{timeout:DESCRIPTION_IDLE_TIMEOUT});return;}descriptionTimer=window.setTimeout(function(){runReadBatch(null);},32);}
function runReadBatch(deadline){
  descriptionIdle=0;descriptionTimer=0;var start=performance.now(),count=0;
  while(descriptionQueue.length&&count<DESCRIPTION_BATCH&&performance.now()-start<DESCRIPTION_BUDGET_MS&&(!deadline||deadline.didTimeout||deadline.timeRemaining()>2)){
    var desc=descriptionQueue.shift(),copy=desc&&desc.querySelector?desc.querySelector('.sc-description-copy'):null;if(document.documentElement.contains(desc)){copy=copy||desc;descriptionStates.push([desc,copy.scrollHeight>copy.clientHeight+1||copy.scrollWidth>copy.clientWidth+1]);}count++;
  }
  if(descriptionQueue.length){scheduleReadBatch();return;}descriptionWriteRaf=requestAnimationFrame(writeBatch);
}
/* Aplica clases de truncado después de finalizar las lecturas para evitar layout thrashing. */
function writeBatch(){
  descriptionWriteRaf=0;var count=0;while(descriptionStates.length&&count<DESCRIPTION_WRITE_BATCH){var item=descriptionStates.shift();if(document.documentElement.contains(item[0]))item[0].classList.toggle('sc-description-truncated',item[1]);count++;}
  if(descriptionStates.length){descriptionWriteRaf=requestAnimationFrame(writeBatch);return;}
  if(descriptionRerun){descriptionRerun=false;scheduleDescriptionMeasure();}
}
function measureDescriptions(){descriptionMeasureRaf=0;pruneDescriptionVisibilityObserver();var descriptions=Array.prototype.slice.call(document.querySelectorAll(S.productCards+' '+S.productDescription));descriptionQueue=[];descriptionStates=[];descriptions.forEach(function(desc){ensureDescriptionCopy(desc);if(!deferSkippedDescription(desc))descriptionQueue.push(desc);});if(descriptionQueue.length)scheduleReadBatch();else if(descriptionRerun){descriptionRerun=false;scheduleDescriptionMeasure();}}
function scheduleDescriptionMeasure(){
  if(measurementActive()){descriptionRerun=true;return;}
  descriptionStartRaf=requestAnimationFrame(function(){descriptionStartRaf=0;descriptionMeasureRaf=requestAnimationFrame(measureDescriptions);});
}
/* Cancela todas las colas y observers para que un remount no herede trabajo pendiente. */
function cancelDescriptionMeasure(){if(descriptionStartRaf)cancelAnimationFrame(descriptionStartRaf);if(descriptionMeasureRaf)cancelAnimationFrame(descriptionMeasureRaf);if(descriptionWriteRaf)cancelAnimationFrame(descriptionWriteRaf);if(descriptionIdle&&window.cancelIdleCallback)window.cancelIdleCallback(descriptionIdle);if(descriptionTimer)clearTimeout(descriptionTimer);if(descriptionVisibilityObserver){descriptionVisibilityObserver.disconnect();descriptionVisibilityObserver=null;}descriptionObservedCards.clear();descriptionStartRaf=descriptionMeasureRaf=descriptionWriteRaf=descriptionIdle=descriptionTimer=0;descriptionQueue=[];descriptionStates=[];descriptionRerun=false;}

SC.productCardContent={clearFlavorRows:clearFlavorRows,installTraitReferences:installTraitReferences,installFlavorRow:installFlavorRow,installFlavorRows:installFlavorRows,buildTraitRow:buildTraitRow,positionTraitReferences:positionTraitReferences,ensureDescriptionCopy:ensureDescriptionCopy,measureDescriptions:measureDescriptions,scheduleDescriptionMeasure:scheduleDescriptionMeasure,cancelDescriptionMeasure:cancelDescriptionMeasure};
})();
