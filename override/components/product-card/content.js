(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,S=C&&C.selectors,K=C&&C.classes,D=SC&&SC.productCardData;if(!SC||!U||!D||SC.__productCardContentBooted)return;SC.__productCardContentBooted=true;
var each=U.each,descriptionRaf=0,descriptionMeasureRaf=0;

function clearFlavorRows(){
  each(document.querySelectorAll(".sc-product-flavors"),function(row){if(row.parentNode)row.parentNode.removeChild(row);});
}
function installTraitReferences(){
  each(document.querySelectorAll('.referencias_picor .refBox'),function(box){
    var labelNode=box.querySelector('.ref_label'),image=box.querySelector('.imgRef img'),host=box.querySelector('.imgRef');
    var label=((labelNode&&labelNode.textContent)||(image&&image.getAttribute('data-original-title'))||'').trim();
    if(D.ignoredTrait(label)){if(box.parentNode)box.parentNode.removeChild(box);return;}
    var icon=D.createTraitIcon(label);if(icon&&host){host.textContent='';host.appendChild(icon);}
  });
}
function installFlavorRows(){
  clearFlavorRows();installTraitReferences();
  each(document.querySelectorAll(S.productCard+' > '+S.productLink),function(link){
    var title=link.querySelector(S.productTitle),source=title&&title.querySelector(S.productTraits);
    if(source)source.setAttribute('aria-hidden','true');
    var row=document.createElement('span');row.className=".sc-product-flavors".slice(1);
    var labels=D.traitLabels(source||link);
    each(labels,function(label){D.appendTraitVisual(row,source||link,label);});
    if(labels.length){row.setAttribute('role','img');row.setAttribute('aria-label',D.traitsLabelPrefix+labels.join(', '));}
    else row.setAttribute('aria-hidden','true');
    link.appendChild(row);
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

SC.productCardContent={clearFlavorRows:clearFlavorRows,installFlavorRows:installFlavorRows,measureDescriptions:measureDescriptions,scheduleDescriptionMeasure:scheduleDescriptionMeasure,cancelDescriptionMeasure:cancelDescriptionMeasure};
})();
