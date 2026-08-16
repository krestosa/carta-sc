(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,S=C&&C.selectors,K=C&&C.classes,D=SC&&SC.productCardData;if(!SC||!U||!D||SC.__productCardContentBooted)return;SC.__productCardContentBooted=true;
var each=U.each,descriptionRaf=0,descriptionMeasureRaf=0;

function traitKey(label){return(label||'').trim().toLocaleLowerCase('es-AR');}
function markTrait(node,key){if(node&&node.setAttribute)node.setAttribute('data-sc-trait',key);return node;}
function appendTraitVisual(target,source,label){
  var key=traitKey(label),count=key==='algo picante'?2:key==='poco picante'?1:0,added=false,i,icon,node;
  if(count){
    for(i=0;i<count;i++){icon=D.createTraitIcon('algo picante');if(icon){markTrait(icon,key);target.appendChild(icon);added=true;}}
    if(added)return;
  }
  node=D.appendTraitVisual(target,source,label);markTrait(node,key);
}
function clearFlavorRows(){
  each(document.querySelectorAll(".sc-product-flavors,.sc-product-price-traits"),function(row){if(row.parentNode)row.parentNode.removeChild(row);});
}
function installTraitReferences(){
  each(document.querySelectorAll('.referencias_picor .refBox'),function(box){
    var labelNode=box.querySelector('.ref_label'),image=box.querySelector('.imgRef img'),host=box.querySelector('.imgRef');
    var label=((labelNode&&labelNode.textContent)||(image&&image.getAttribute('data-original-title'))||'').trim(),key=traitKey(label),icon;
    if(D.ignoredTrait(label)){if(box.parentNode)box.parentNode.removeChild(box);return;}
    if(!host)return;
    if(key==='poco picante'||key==='algo picante'){
      host.textContent='';appendTraitVisual(host,box,label);return;
    }
    icon=D.createTraitIcon(label);if(icon){host.textContent='';markTrait(icon,key);host.appendChild(icon);}
  });
}
function buildTraitRow(className,labels,source){
  var row=document.createElement('span');row.className=className;
  each(labels,function(label){appendTraitVisual(row,source,label);});
  if(labels.length){row.setAttribute('role','img');row.setAttribute('aria-label',D.traitsLabelPrefix+labels.join(', '));}
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

SC.productCardContent={clearFlavorRows:clearFlavorRows,installFlavorRows:installFlavorRows,buildTraitRow:buildTraitRow,measureDescriptions:measureDescriptions,scheduleDescriptionMeasure:scheduleDescriptionMeasure,cancelDescriptionMeasure:cancelDescriptionMeasure};
})();
