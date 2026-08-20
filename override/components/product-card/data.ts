/* Helpers de extracción y normalización de datos de producto. */
(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,S=C&&C.selectors;if(!SC||!U||!C||SC.__productCardDataBooted)return;SC.__productCardDataBooted=true;
var text=U.text;
var IGNORED_TRAITS=['sin tacc','sin gluten','gluten free'];
var TRAIT_LABEL_PREFIX='Características: ';
function cleanPriceText(node:Element|null):string{return text(node).replace(/\s+/g,' ').trim();}
function ignoredTrait(label:string):boolean{var key=(label||'').trim().toLocaleLowerCase('es-AR');return IGNORED_TRAITS.indexOf(key)>=0;}
function traitLabels(card:Element):string[]{var labels:string[]=[];card.querySelectorAll(S.productTraits+' img').forEach(function(img:Element){var value=(img.getAttribute('data-original-title')||img.getAttribute('title')||img.getAttribute('alt')||'').trim();if(value&&!ignoredTrait(value)&&labels.indexOf(value)<0)labels.push(value);});return labels;}
function imageSource(card:Element):string{var image=card.querySelector<HTMLImageElement>('img.productoImageShop');return image?(image.currentSrc||image.src||image.getAttribute('data-src')||''):'';}
function ensureId(node:Element|null,id:string):string{if(!node)return'';if(!node.id)node.id=id;return node.id;}
function createTraitIcon(label:string):SVGSVGElement|null{var key=(label||'').toLocaleLowerCase('es-AR'),name=key==='algo picante'?'poco-picante':key==='poco picante'?'picante':key==='muy picante'?'muy-picante':key==='vegetariano'?'vegetariano':'';if(!name)return null;var svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','sc-trait-icon sc-trait-icon--'+name);svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.setAttribute('viewBox','0 0 24 24');var use=document.createElementNS('http://www.w3.org/2000/svg','use');use.setAttribute('href','#sc-trait-'+name);svg.appendChild(use);return svg;}
function appendTraitVisual(target:HTMLElement,source:ParentNode,label:string):Element|null{var icon=createTraitIcon(label);if(icon){target.appendChild(icon);return icon;}var legacy=Array.from(source.querySelectorAll<HTMLImageElement>('img')).find(function(img){return text(img)||((img.getAttribute('data-original-title')||img.getAttribute('title')||img.getAttribute('alt')||'').trim()===label);});if(!legacy)return null;var clone=legacy.cloneNode(true) as HTMLImageElement;clone.removeAttribute('id');target.appendChild(clone);return clone;}
function buildTraitGroup(className:string,labels:string[],source:ParentNode):HTMLSpanElement{var row=document.createElement('span');row.className=className;labels.forEach(function(label:string){appendTraitVisual(row,source,label);});if(labels.length){row.setAttribute('role','img');row.setAttribute('aria-label',TRAIT_LABEL_PREFIX+labels.join(', '));}else row.setAttribute('aria-hidden','true');return row;}
SC.productCardData={cleanPriceText:cleanPriceText,ignoredTrait:ignoredTrait,traitLabels:traitLabels,imageSource:imageSource,ensureId:ensureId,createTraitIcon:createTraitIcon,appendTraitVisual:appendTraitVisual,buildTraitGroup:buildTraitGroup,traitsLabelPrefix:TRAIT_LABEL_PREFIX};
})();
