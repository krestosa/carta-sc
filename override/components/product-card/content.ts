/* Normaliza contenido visual de las tarjetas: rasgos, iconos y truncado de descripción.
   Las mediciones se agrupan por lotes para evitar lecturas y escrituras de layout mezcladas. */
(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,S=C&&C.selectors,K=C&&C.classes,D=SC&&SC.productCardData;
if(!SC||!U||!D||SC.__productCardContentBooted)return;
SC.__productCardContentBooted=true;
var each=U.each;
var descriptionStartRaf=0,descriptionMeasureRaf=0,descriptionWriteRaf=0,descriptionIdle=0,descriptionTimer=0;
var descriptionQueue:HTMLElement[]=[];
var descriptionStates:Array<[HTMLElement,boolean]>=[];
var descriptionRerun=false;
var descriptionVisibilityObserver:IntersectionObserver|null=null;
var descriptionObservedCards=new Set<HTMLElement>();
var referenceStrip:HTMLElement|null=null;
var DESCRIPTION_BATCH=8,DESCRIPTION_BUDGET_MS=4,DESCRIPTION_WRITE_BATCH=24,DESCRIPTION_IDLE_TIMEOUT=1400;

interface TraitSpec { key:string; label:string; icon:string; }

/* Traduce etiquetas legacy a una clave, etiqueta e icono consistentes para todo el catálogo. */
function traitKey(label:string):string{return(label||'').trim().toLocaleLowerCase('es-AR');}
function traitSpec(label:string):TraitSpec{
  var key=traitKey(label);
  if(key==='poco picante')return{key:'poco picante',label:'Poco Picante',icon:'algo picante'};
  if(key==='algo picante'||key==='picante')return{key:'picante',label:'Picante',icon:'poco picante'};
  if(key==='muy picante')return{key:'muy picante',label:'Muy Picante',icon:'muy picante'};
  if(key==='vegetariano')return{key:'vegetariano',label:'Vegetariano',icon:'vegetariano'};
  return{key:key,label:(label||'').trim(),icon:key};
}
function markTrait<T extends Element|null>(node:T,key:string):T{if(node)node.setAttribute('data-sc-trait',key);return node;}
function appendTraitVisual(target:HTMLElement,source:ParentNode,label:string):Element|null{
  var spec=traitSpec(label),icon=D.createTraitIcon(spec.icon) as SVGSVGElement|null,node:Element|null;
  if(icon){markTrait(icon,spec.key);target.appendChild(icon);return icon;}
  node=D.appendTraitVisual(target,source,label) as Element|null;markTrait(node,spec.key);return node;
}

/* Envuelve el texto de descripción en una caja propia para medir exactamente sus dos líneas. */
function descriptionNode(target:Element|null):HTMLElement|null{
  if(!target)return null;
  if(target.matches(S.productDescription))return target as HTMLElement;
  return target.querySelector<HTMLElement>(S.productDescription);
}
function ensureDescriptionCopy(target:Element|null):HTMLElement|null{
  var desc=descriptionNode(target),copy:HTMLElement|null=null,child:Element|null;
  if(!desc)return null;
  child=desc.firstElementChild;
  while(child){if(child.classList.contains('sc-description-copy')){copy=child as HTMLElement;break;}child=child.nextElementSibling;}
  if(copy)return copy;
  copy=document.createElement('span');copy.className='sc-description-copy';
  while(desc.firstChild)copy.appendChild(desc.firstChild);
  desc.appendChild(copy);return copy;
}

/* Reconstruye rasgos visibles desde una única fuente y elimina filas duplicadas anteriores. */
function clearFlavorRows(root?:ParentNode):void{
  var scope=root||document;
  each(scope.querySelectorAll('.sc-product-secondary-meta'),function(group:Element){
    var offer=group.querySelector('.ofertaPrice'),parent=group.parentNode;if(!parent)return;
    if(offer)parent.insertBefore(offer,group);parent.removeChild(group);
  });
  each(scope.querySelectorAll('.sc-product-flavors,.sc-product-price-traits'),function(row:Element){if(row.parentNode)row.parentNode.removeChild(row);});
}
function positionTraitReferences():void{
  var strip=referenceStrip||document.querySelector<HTMLElement>('.referencias_picor');
  var tools=document.querySelector<HTMLElement>('.sc-catalog-tools');
  if(!strip)return;
  referenceStrip=strip;strip.classList.add('sc-trait-reference-strip');
  var spacer=strip.previousElementSibling;
  if(spacer&&!(spacer.textContent||'').trim()&&spacer.querySelector('br'))spacer.classList.add('sc-trait-reference-legacy-spacer');
  if(!tools)return;
  var results=tools.querySelector('.sc-catalog-search-results');
  if(strip.parentNode!==tools||strip.nextElementSibling!==results)tools.insertBefore(strip,results||null);
}
function installTraitReferences():void{
  each(document.querySelectorAll('.referencias_picor .refBox'),function(box:Element){
    var labelNode=box.querySelector<HTMLElement>('.ref_label'),image=box.querySelector<HTMLImageElement>('.imgRef img'),host=box.querySelector<HTMLElement>('.imgRef');
    var label=((labelNode&&labelNode.textContent)||(image&&image.getAttribute('data-original-title'))||'').trim(),spec=traitSpec(label);
    if(D.ignoredTrait(label)){if(box.parentNode)box.parentNode.removeChild(box);return;}
    if(labelNode)labelNode.textContent=spec.label;if(!host)return;
    var icon=D.createTraitIcon(spec.icon) as SVGSVGElement|null;
    if(icon){host.textContent='';markTrait(icon,spec.key);host.appendChild(icon);}
  });
  positionTraitReferences();
}
function buildTraitRow(className:string,labels:string[],source:ParentNode):HTMLSpanElement{
  var row=document.createElement('span');row.className=className;var accessible:string[]=[];
  each(labels,function(label:string){var spec=traitSpec(label);appendTraitVisual(row,source,label);if(accessible.indexOf(spec.label)<0)accessible.push(spec.label);});
  if(accessible.length){row.setAttribute('role','img');row.setAttribute('aria-label',D.traitsLabelPrefix+accessible.join(', '));}
  else row.setAttribute('aria-hidden','true');
  return row;
}
function installFlavorRow(link:HTMLElement|null):void{
  if(!link)return;ensureDescriptionCopy(link);clearFlavorRows(link);
  var title=link.querySelector<HTMLElement>(S.productTitle),source=title&&title.querySelector<HTMLElement>(S.productTraits),priceRow=link.querySelector<HTMLElement>('.priceRow');
  if(source)source.setAttribute('aria-hidden','true');
  var visualSource:ParentNode=source||link,labels=D.traitLabels(link),offer=priceRow&&priceRow.querySelector<HTMLElement>('.ofertaPrice'),secondary:HTMLSpanElement|null=null;
  if(!priceRow)return;
  if(offer){secondary=document.createElement('span');secondary.className='sc-product-secondary-meta';priceRow.insertBefore(secondary,offer);secondary.appendChild(offer);}
  if(labels.length){var row=buildTraitRow('sc-product-price-traits sabores',labels,visualSource);(secondary||priceRow).appendChild(row);}
}

/* Mide el clamp sólo en cards visibles y difiere el resto hasta que entren cerca del viewport. */
function hideDescriptionState(card:HTMLElement,clamped:boolean):void{
  var desc=card.querySelector<HTMLElement>(S.productDescription);if(!desc)return;desc.classList.toggle('sc-description-clamped',clamped);card.classList.toggle('sc-description-is-clamped',clamped);
}
function measureDescriptionCard(card:HTMLElement):boolean{
  var desc=card.querySelector<HTMLElement>(S.productDescription),copy=ensureDescriptionCopy(desc);if(!desc||!copy)return false;
  var style=getComputedStyle(copy),line=parseFloat(style.lineHeight)||0;
  if(!line)return false;
  var max=line*2+.5,full=copy.scrollHeight;return full>max;
}
function flushDescriptionWrites():void{
  descriptionWriteRaf=0;var batch=descriptionStates.splice(0,DESCRIPTION_WRITE_BATCH);for(var i=0;i<batch.length;i++){var state=batch[i];if(state)hideDescriptionState(state[0],state[1]);}
  if(descriptionStates.length)descriptionWriteRaf=requestAnimationFrame(flushDescriptionWrites);else if(descriptionQueue.length)scheduleDescriptionMeasure();
}
function queueDescriptionWrite(card:HTMLElement,clamped:boolean):void{descriptionStates.push([card,clamped]);if(!descriptionWriteRaf)descriptionWriteRaf=requestAnimationFrame(flushDescriptionWrites);}
function measureDescriptionBatch(deadline?:IdleDeadline|null):void{
  descriptionMeasureRaf=0;descriptionIdle=0;descriptionTimer=0;var start=performance.now(),count=0;
  while(descriptionQueue.length&&count<DESCRIPTION_BATCH){if(deadline&&deadline.timeRemaining()<1&&!deadline.didTimeout)break;if(performance.now()-start>DESCRIPTION_BUDGET_MS)break;var card=descriptionQueue.shift();if(!card)continue;if(card.hidden||card.offsetParent===null){observeDescriptionCard(card);continue;}queueDescriptionWrite(card,measureDescriptionCard(card));count++;}
  if(descriptionQueue.length)scheduleDescriptionMeasure();else if(descriptionRerun){descriptionRerun=false;scheduleDescriptionMeasure();}
}
function observeDescriptionCard(card:HTMLElement):void{
  if(!window.IntersectionObserver)return;
  if(!descriptionVisibilityObserver)descriptionVisibilityObserver=new IntersectionObserver(function(entries:IntersectionObserverEntry[]){entries.forEach(function(entry:IntersectionObserverEntry){if(!entry.isIntersecting)return;var node=entry.target as HTMLElement;descriptionObservedCards.delete(node);descriptionVisibilityObserver&&descriptionVisibilityObserver.unobserve(node);descriptionQueue.push(node);scheduleDescriptionMeasure();});},{rootMargin:'180px 0px'});
  if(!descriptionObservedCards.has(card)){descriptionObservedCards.add(card);descriptionVisibilityObserver.observe(card);}
}
function cancelDescriptionMeasure():void{
  if(descriptionStartRaf)cancelAnimationFrame(descriptionStartRaf);if(descriptionMeasureRaf)cancelAnimationFrame(descriptionMeasureRaf);if(descriptionWriteRaf)cancelAnimationFrame(descriptionWriteRaf);if(descriptionIdle&&window.cancelIdleCallback)window.cancelIdleCallback(descriptionIdle);if(descriptionTimer)clearTimeout(descriptionTimer);
  descriptionStartRaf=descriptionMeasureRaf=descriptionWriteRaf=descriptionIdle=descriptionTimer=0;descriptionQueue=[];descriptionStates=[];descriptionRerun=false;
}
function scheduleDescriptionMeasure():void{
  if(descriptionStartRaf||descriptionMeasureRaf||descriptionIdle||descriptionTimer){descriptionRerun=true;return;}
  descriptionStartRaf=requestAnimationFrame(function(){descriptionStartRaf=0;if(!descriptionQueue.length)descriptionQueue=Array.from(document.querySelectorAll<HTMLElement>(S.productCards));if(typeof window.requestIdleCallback==='function')descriptionIdle=window.requestIdleCallback(measureDescriptionBatch,{timeout:DESCRIPTION_IDLE_TIMEOUT});else descriptionTimer=window.setTimeout(function(){measureDescriptionBatch(null);},30);});
}

function installFlavorRows(root?:ParentNode):void{
  var scope=root||document;installTraitReferences();each(scope.querySelectorAll<HTMLElement>(S.productCard+' > '+S.productLink),function(link:HTMLElement){installFlavorRow(link);});
}
function measureDescriptions():void{scheduleDescriptionMeasure();}

SC.productCardContent={buildTraitRow:buildTraitRow,installFlavorRow:installFlavorRow,installFlavorRows:installFlavorRows,installTraitReferences:installTraitReferences,positionTraitReferences:positionTraitReferences,ensureDescriptionCopy:ensureDescriptionCopy,measureDescriptions:measureDescriptions,scheduleDescriptionMeasure:scheduleDescriptionMeasure,cancelDescriptionMeasure:cancelDescriptionMeasure,clearFlavorRows:clearFlavorRows};
})();
