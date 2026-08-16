(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,S=C&&C.selectors,K=C&&C.classes,D=SC&&SC.productCardData;if(!SC||!U||!D||SC.__productCardContentBooted)return;SC.__productCardContentBooted=true;
var each=U.each,descriptionRaf=0,descriptionMeasureRaf=0,referenceStrip=null;

function traitKey(label){return(label||'').trim().toLocaleLowerCase('es-AR');}
function traitSpec(label){
  var key=traitKey(label);
  if(key==='poco picante')return{key:'algo picante',label:'Algo Picante',icon:'algo picante'};
  if(key==='algo picante')return{key:'picante',label:'Picante',icon:'poco picante'};
  if(key==='picante')return{key:'picante',label:'Picante',icon:'poco picante'};
  if(key==='muy picante')return{key:'muy picante',label:'Muy Picante',icon:'muy picante'};
  if(key==='vegetariano')return{key:'vegetariano',label:'Vegetariano',icon:'vegetariano'};
  return{key:key,label:(label||'').trim(),icon:key};
}
function markTrait(node,key){if(node&&node.setAttribute)node.setAttribute('data-sc-trait',key);return node;}
function appendTraitVisual(target,source,label){
  var spec=traitSpec(label),icon=D.createTraitIcon(spec.icon),node;
  if(icon){markTrait(icon,spec.key);target.appendChild(icon);return icon;}
  node=D.appendTraitVisual(target,source,label);markTrait(node,spec.key);return node;
}
function clearFlavorRows(){
  each(document.querySelectorAll(".sc-product-flavors,.sc-product-price-traits"),function(row){if(row.parentNode)row.parentNode.removeChild(row);});
}
function positionTraitReferences(){
  var strip=referenceStrip||document.querySelector('.referencias_picor'),tools=document.querySelector('.sc-catalog-tools'),results,spacer;
  if(!strip)return;referenceStrip=strip;strip.classList.add('sc-trait-reference-strip');
  spacer=strip.previousElementSibling;
  if(spacer&&!(spacer.textContent||'').trim()&&spacer.querySelector&&spacer.querySelector('br'))spacer.classList.add('sc-trait-reference-legacy-spacer');
  if(!tools)return;results=tools.querySelector('.sc-catalog-search-results');
  if(strip.parentNode!==tools||strip.nextElementSibling!==results)tools.insertBefore(strip,results||null);
}
function installTraitReferences(){
  each(document.querySelectorAll('.referencias_picor .refBox'),function(box){
    var labelNode=box.querySelector('.ref_label'),image=box.querySelector('.imgRef img'),host=box.querySelector('.imgRef');
    var label=((labelNode&&labelNode.textContent)||(image&&image.getAttribute('data-original-title'))||'').trim(),spec=traitSpec(label),icon;
    if(D.ignoredTrait(label)){if(box.parentNode)box.parentNode.removeChild(box);return;}
    if(labelNode)labelNode.textContent=spec.label;
    if(!host)return;
    icon=D.createTraitIcon(spec.icon);
    if(icon){host.textContent='';markTrait(icon,spec.key);host.appendChild(icon);}
  });
  positionTraitReferences();
}
function buildTraitRow(className,labels,source){
  var row=document.createElement('span');row.className=className;var accessible=[];
  each(labels,function(label){var spec=traitSpec(label);appendTraitVisual(row,source,label);if(accessible.indexOf(spec.label)<0)accessible.push(spec.label);});
  if(accessible.length){row.setAttribute('role','img');row.setAttribute('aria-label',D.traitsLabelPrefix+accessible.join(', '));}
  else row.setAttribute('aria-hidden','true');
  return row;
}
function installFlavorRows(){
  clearFlavorRows();installTraitReferences();
  each(document.querySelectorAll(S.productCard+' > '+S.productLink),function(link){
    var title=link.querySelector(S.productTitle),source=title&&title.querySelector(S.productTraits),priceRow=link.querySelector('.priceRow');
    if(source)source.setAttribute('aria-hidden','true');
    var labels=D.traitLabels(source||link),row=buildTraitRow('sc-product-flavors',labels,source||link);
    link.appendChild(row);
    if(priceRow){
      priceRow.classList.toggle('sc-price-row-has-offer',!!priceRow.querySelector('.ofertaPrice'));
      priceRow.appendChild(buildTraitRow('sc-product-price-traits',labels,source||link));
    }
  });
}
function measureDescriptions(){
  descriptionRaf=0;descriptionMeasureRaf=0;
  each(document.querySelectorAll(S.productCards+' '+S.productDescription),function(desc){
    desc.classList.remove("sc-description-truncated");
    if(desc.scrollHeight>desc.clientHeight+1||desc.scrollWidth>desc.clientWidth+1)desc.classList.add("sc-description-truncated");
  });
}
function scheduleDescriptionMeasure(){
  if(descriptionRaf)return;
  descriptionRaf=requestAnimationFrame(function(){descriptionMeasureRaf=requestAnimationFrame(measureDescriptions);});
}
function cancelDescriptionMeasure(){if(descriptionRaf)cancelAnimationFrame(descriptionRaf);if(descriptionMeasureRaf)cancelAnimationFrame(descriptionMeasureRaf);descriptionRaf=0;descriptionMeasureRaf=0;}

SC.productCardContent={clearFlavorRows:clearFlavorRows,installFlavorRows:installFlavorRows,buildTraitRow:buildTraitRow,positionTraitReferences:positionTraitReferences,measureDescriptions:measureDescriptions,scheduleDescriptionMeasure:scheduleDescriptionMeasure,cancelDescriptionMeasure:cancelDescriptionMeasure};
})();
