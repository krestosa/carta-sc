(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,S=C&&C.selectors,K=C&&C.classes,D=SC&&SC.productCardData;if(!SC||!U||!D||SC.__productCardContentBooted)return;SC.__productCardContentBooted=true;
var each=U.each,descriptionStartRaf=0,descriptionMeasureRaf=0,descriptionWriteRaf=0,descriptionIdle=0,descriptionTimer=0,descriptionQueue=[],descriptionStates=[],descriptionRerun=false,referenceStrip=null,DESCRIPTION_BATCH=8,DESCRIPTION_BUDGET_MS=4,DESCRIPTION_WRITE_BATCH=24,DESCRIPTION_IDLE_TIMEOUT=1400;

function traitKey(label){return(label||'').trim().toLocaleLowerCase('es-AR');}
function traitSpec(label){var key=traitKey(label);if(key==='poco picante')return{key:'poco picante',label:'Poco Picante',icon:'algo picante'};if(key==='algo picante')return{key:'picante',label:'Picante',icon:'poco picante'};if(key==='picante')return{key:'picante',label:'Picante',icon:'poco picante'};if(key==='muy picante')return{key:'muy picante',label:'Muy Picante',icon:'muy picante'};if(key==='vegetariano')return{key:'vegetariano',label:'Vegetariano',icon:'vegetariano'};return{key:key,label:(label||'').trim(),icon:key};}
function markTrait(node,key){if(node&&node.setAttribute)node.setAttribute('data-sc-trait',key);return node;}
function appendTraitVisual(target,source,label){var spec=traitSpec(label),icon=D.createTraitIcon(spec.icon),node;if(icon){markTrait(icon,spec.key);target.appendChild(icon);return icon;}node=D.appendTraitVisual(target,source,label);markTrait(node,spec.key);return node;}
function clearFlavorRows(root){root=root&&root.querySelectorAll?root:document;each(root.querySelectorAll(".sc-product-flavors,.sc-product-price-traits"),function(row){if(row.parentNode)row.parentNode.removeChild(row);});}
function positionTraitReferences(){var strip=referenceStrip||document.querySelector('.referencias_picor'),tools=document.querySelector('.sc-catalog-tools'),results,spacer;if(!strip)return;referenceStrip=strip;strip.classList.add('sc-trait-reference-strip');spacer=strip.previousElementSibling;if(spacer&&!(spacer.textContent||'').trim()&&spacer.querySelector&&spacer.querySelector('br'))spacer.classList.add('sc-trait-reference-legacy-spacer');if(!tools)return;results=tools.querySelector('.sc-catalog-search-results');if(strip.parentNode!==tools||strip.nextElementSibling!==results)tools.insertBefore(strip,results||null);}
function installTraitReferences(){each(document.querySelectorAll('.referencias_picor .refBox'),function(box){var labelNode=box.querySelector('.ref_label'),image=box.querySelector('.imgRef img'),host=box.querySelector('.imgRef');var label=((labelNode&&labelNode.textContent)||(image&&image.getAttribute('data-original-title'))||'').trim(),spec=traitSpec(label),icon;if(D.ignoredTrait(label)){if(box.parentNode)box.parentNode.removeChild(box);return;}if(labelNode)labelNode.textContent=spec.label;if(!host)return;icon=D.createTraitIcon(spec.icon);if(icon){host.textContent='';markTrait(icon,spec.key);host.appendChild(icon);}});positionTraitReferences();}
function buildTraitRow(className,labels,source){var row=document.createElement('span');row.className=className;var accessible=[];each(labels,function(label){var spec=traitSpec(label);appendTraitVisual(row,source,label);if(accessible.indexOf(spec.label)<0)accessible.push(spec.label);});if(accessible.length){row.setAttribute('role','img');row.setAttribute('aria-label',D.traitsLabelPrefix+accessible.join(', '));}else row.setAttribute('aria-hidden','true');return row;}
function installFlavorRow(link){
  if(!link)return;clearFlavorRows(link);
  var title=link.querySelector(S.productTitle),source=title&&title.querySelector(S.productTraits),priceRow=link.querySelector('.priceRow');if(source)source.setAttribute('aria-hidden','true');var labels=D.traitLabels(source||link),row=buildTraitRow('sc-product-flavors',labels,source||link);link.appendChild(row);if(priceRow){priceRow.classList.toggle('sc-price-row-has-offer',!!priceRow.querySelector('.ofertaPrice'));priceRow.appendChild(buildTraitRow('sc-product-price-traits',labels,source||link));}
}
function installFlavorRows(root){root=root&&root.querySelectorAll?root:document;installTraitReferences();each(root.querySelectorAll(S.productCard+' > '+S.productLink),installFlavorRow);}
function measurementActive(){return!!(descriptionStartRaf||descriptionMeasureRaf||descriptionWriteRaf||descriptionIdle||descriptionTimer||descriptionQueue.length||descriptionStates.length);}
function scheduleReadBatch(){if(descriptionIdle||descriptionTimer)return;if(typeof window.requestIdleCallback==='function'){descriptionIdle=window.requestIdleCallback(runReadBatch,{timeout:DESCRIPTION_IDLE_TIMEOUT});return;}descriptionTimer=window.setTimeout(function(){runReadBatch(null);},32);}
function runReadBatch(deadline){
  descriptionIdle=0;descriptionTimer=0;var start=performance.now(),count=0;
  while(descriptionQueue.length&&count<DESCRIPTION_BATCH&&performance.now()-start<DESCRIPTION_BUDGET_MS&&(!deadline||deadline.didTimeout||deadline.timeRemaining()>2)){
    var desc=descriptionQueue.shift();if(document.documentElement.contains(desc))descriptionStates.push([desc,desc.scrollHeight>desc.clientHeight+1||desc.scrollWidth>desc.clientWidth+1]);count++;
  }
  if(descriptionQueue.length){scheduleReadBatch();return;}descriptionWriteRaf=requestAnimationFrame(writeBatch);
}
function writeBatch(){
  descriptionWriteRaf=0;var count=0;while(descriptionStates.length&&count<DESCRIPTION_WRITE_BATCH){var item=descriptionStates.shift();if(document.documentElement.contains(item[0]))item[0].classList.toggle('sc-description-truncated',item[1]);count++;}
  if(descriptionStates.length){descriptionWriteRaf=requestAnimationFrame(writeBatch);return;}
  if(descriptionRerun){descriptionRerun=false;scheduleDescriptionMeasure();}
}
function measureDescriptions(){descriptionMeasureRaf=0;descriptionQueue=Array.prototype.slice.call(document.querySelectorAll(S.productCards+' '+S.productDescription));descriptionStates=[];if(descriptionQueue.length)scheduleReadBatch();else if(descriptionRerun){descriptionRerun=false;scheduleDescriptionMeasure();}}
function scheduleDescriptionMeasure(){
  if(measurementActive()){descriptionRerun=true;return;}
  descriptionStartRaf=requestAnimationFrame(function(){descriptionStartRaf=0;descriptionMeasureRaf=requestAnimationFrame(measureDescriptions);});
}
function cancelDescriptionMeasure(){if(descriptionStartRaf)cancelAnimationFrame(descriptionStartRaf);if(descriptionMeasureRaf)cancelAnimationFrame(descriptionMeasureRaf);if(descriptionWriteRaf)cancelAnimationFrame(descriptionWriteRaf);if(descriptionIdle&&window.cancelIdleCallback)window.cancelIdleCallback(descriptionIdle);if(descriptionTimer)clearTimeout(descriptionTimer);descriptionStartRaf=descriptionMeasureRaf=descriptionWriteRaf=descriptionIdle=descriptionTimer=0;descriptionQueue=[];descriptionStates=[];descriptionRerun=false;}

SC.productCardContent={clearFlavorRows:clearFlavorRows,installTraitReferences:installTraitReferences,installFlavorRow:installFlavorRow,installFlavorRows:installFlavorRows,buildTraitRow:buildTraitRow,positionTraitReferences:positionTraitReferences,measureDescriptions:measureDescriptions,scheduleDescriptionMeasure:scheduleDescriptionMeasure,cancelDescriptionMeasure:cancelDescriptionMeasure};
})();
