(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,S=C&&C.selectors,K=C&&C.classes,L=C&&C.labels,D=SC&&SC.productCardData;if(!SC||!U||!D||SC.__productCardContentBooted)return;SC.__productCardContentBooted=true;
var each=U.each,descriptionRaf=0;

function clearFlavorRows(){
  each(document.querySelectorAll(S.productFlavors),function(row){if(row.parentNode)row.parentNode.removeChild(row);});
}
function installFlavorRows(){
  clearFlavorRows();
  each(document.querySelectorAll(S.productCard+' > '+S.productLink),function(link){
    var title=link.querySelector(S.productTitle),source=title&&title.querySelector(S.productTraits);
    if(source)source.setAttribute('aria-hidden','true');
    var row=document.createElement('span');row.className=S.productFlavors.slice(1);
    var labels=D.traitLabels(source||link);
    if(source){
      each(source.children,function(node){
        var clone=node.cloneNode(true);
        if(clone.tagName==='IMG'){
          clone.setAttribute('alt','');clone.setAttribute('aria-hidden','true');
          clone.removeAttribute('data-toggle');clone.removeAttribute('title');
        }
        row.appendChild(clone);
      });
    }
    if(labels.length){row.setAttribute('role','img');row.setAttribute('aria-label',L.traitsPrefix+labels.join(', '));}
    else row.setAttribute('aria-hidden','true');
    link.appendChild(row);
  });
}
function measureDescriptions(){
  descriptionRaf=0;
  each(document.querySelectorAll(S.productCards+' '+S.productDescription),function(desc){
    desc.classList.remove(K.descriptionTruncated);
    if(desc.scrollHeight>desc.clientHeight+1||desc.scrollWidth>desc.clientWidth+1)desc.classList.add(K.descriptionTruncated);
  });
}
function scheduleDescriptionMeasure(){
  if(descriptionRaf)return;
  descriptionRaf=requestAnimationFrame(function(){requestAnimationFrame(measureDescriptions);});
}

SC.productCardContent={clearFlavorRows:clearFlavorRows,installFlavorRows:installFlavorRows,measureDescriptions:measureDescriptions,scheduleDescriptionMeasure:scheduleDescriptionMeasure};
})();