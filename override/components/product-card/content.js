(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,D=SC&&SC.productCardData;if(!SC||!U||!D||SC.__productCardContentBooted)return;SC.__productCardContentBooted=true;
var each=U.each,descriptionRaf=0;

function clearFlavorRows(){
  each(document.querySelectorAll('.sc-product-flavors'),function(row){if(row.parentNode)row.parentNode.removeChild(row);});
}
function installFlavorRows(){
  clearFlavorRows();
  each(document.querySelectorAll('.productoShop > a.fancyboxModalAddProd'),function(link){
    var title=link.querySelector('.title-shop1'),source=title&&title.querySelector('.sabores');
    if(source)source.setAttribute('aria-hidden','true');
    var row=document.createElement('span');row.className='sc-product-flavors';
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
    if(labels.length){row.setAttribute('role','img');row.setAttribute('aria-label','Características: '+labels.join(', '));}
    else row.setAttribute('aria-hidden','true');
    link.appendChild(row);
  });
}
function measureDescriptions(){
  descriptionRaf=0;
  each(document.querySelectorAll('.listadoShop .productoShop .descrip'),function(desc){
    desc.classList.remove('sc-description-truncated');
    if(desc.scrollHeight>desc.clientHeight+1||desc.scrollWidth>desc.clientWidth+1)desc.classList.add('sc-description-truncated');
  });
}
function scheduleDescriptionMeasure(){
  if(descriptionRaf)return;
  descriptionRaf=requestAnimationFrame(function(){requestAnimationFrame(measureDescriptions);});
}

SC.productCardContent={clearFlavorRows:clearFlavorRows,installFlavorRows:installFlavorRows,measureDescriptions:measureDescriptions,scheduleDescriptionMeasure:scheduleDescriptionMeasure};
})();