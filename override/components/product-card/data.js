(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,T=SC&&SC.templates;if(!SC||!U||!T||SC.__productCardDataBooted)return;SC.__productCardDataBooted=true;
var each=U.each,text=U.text;

function imageSource(card){
  var img=card.querySelector('.imgShop img, .imgLiquidNoFillShop img');
  if(img&&img.getAttribute('src'))return img.getAttribute('src');
  var box=card.querySelector('.imgShop, .imgLiquidNoFillShop');if(!box)return'';
  var bg=box.style.backgroundImage||getComputedStyle(box).backgroundImage||'';
  var match=bg.match(/^url\(["']?(.*?)["']?\)$/);return match?match[1]:'';
}
function cleanPriceText(node){
  if(!node)return'';
  var clone=node.cloneNode(true);
  each(clone.querySelectorAll('input,.sumar,button'),function(el){if(el.parentNode)el.parentNode.removeChild(el);});
  return text(clone);
}
function ensureId(node,base){if(!node)return'';if(!node.id)node.id=base;return node.id;}
function traitLabels(source){
  var seen={},labels=[];
  var root=source&&source.matches&&source.matches('.productoShop')?source:source&&source.closest?source.closest('.productoShop'):null;
  var selector=root?'.title-shop1 .sabores img[data-original-title]':'img[data-original-title]';
  each((root||source)?(root||source).querySelectorAll(selector):[],function(img){
    var label=(img.getAttribute('data-original-title')||'').trim();
    if(label&&!seen[label]){seen[label]=true;labels.push(label);}
  });
  return labels;
}
function buildTraitGroup(card,className){
  var labels=traitLabels(card);if(!labels.length)return null;
  var source=card.querySelector('.title-shop1 .sabores');if(!source)return null;
  var group=T.clone('product-trait-group');group.className=className||'sabores';
  group.setAttribute('aria-label','Características: '+labels.join(', '));
  each(source.querySelectorAll('img'),function(img){
    var clone=img.cloneNode(true);clone.setAttribute('alt','');clone.setAttribute('aria-hidden','true');
    clone.removeAttribute('data-toggle');clone.removeAttribute('title');group.appendChild(clone);
  });
  return group;
}

SC.productCardData={imageSource:imageSource,cleanPriceText:cleanPriceText,ensureId:ensureId,traitLabels:traitLabels,buildTraitGroup:buildTraitGroup};
})();
