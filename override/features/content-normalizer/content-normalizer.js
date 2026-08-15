(function(){
'use strict';
if(window.__scContentNormalizerBooted)return;
window.__scContentNormalizerBooted=true;

var CONNECTORS=new Set([
  'a','al','ante','bajo','con','contra','de','del','desde','durante','e','el','en','entre',
  'hacia','hasta','la','las','los','mediante','ni','o','para','por','que','según','sin','sobre',
  'su','sus','tras','tu','tus','u','un','una','unos','unas','y'
]);
var PROTECTED={
  'aqa':'AQA',
  'sushiclub':'SushiClub'
};
var HOST_SELECTOR='.titleShopSeccion,.subTitleShopSeccion,.productoShop .title-shop1,.productoShop .descrip';
var scheduled=false;
var observer=null;
var pending=new Set();

function ready(fn){
  document.readyState==='loading'
    ? document.addEventListener('DOMContentLoaded',fn,{once:true})
    : fn();
}

function titlePeriodClean(text){
  return text.replace(/\./g,function(dot,index,source){
    var before=source.charAt(index-1);
    var after=source.charAt(index+1);
    return /\d/.test(before)&&/\d/.test(after)?dot:'';
  });
}

function capitalize(lower){
  if(PROTECTED[lower])return PROTECTED[lower];
  return lower.replace(/[a-záéíóúüñ]/i,function(letter){return letter.toLocaleUpperCase('es-AR');});
}

function smartCase(text,state,removePeriods){
  if(removePeriods)text=titlePeriodClean(text);
  var rx=/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+(?:['’][A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+)*/g;
  var out='';
  var last=0;
  var match;

  while((match=rx.exec(text))){
    var separator=text.slice(last,match.index);
    out+=separator;
    if(/[.!?¡¿:]/.test(separator))state.sentenceStart=true;

    var raw=match[0];
    var lower=raw.toLocaleLowerCase('es-AR');
    var numeric=/^\d/.test(raw);
    var word;

    if(numeric){
      word=lower;
    }else if(CONNECTORS.has(lower)&&!state.sentenceStart){
      word=lower;
    }else{
      word=capitalize(lower);
    }

    out+=word;
    state.sentenceStart=false;
    state.words++;
    last=rx.lastIndex;
  }

  out+=text.slice(last);
  return out;
}

function textNodes(root,skipSelector){
  var nodes=[];
  var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{
    acceptNode:function(node){
      var parent=node.parentElement;
      if(!parent)return NodeFilter.FILTER_REJECT;
      if(parent.closest('script,style'))return NodeFilter.FILTER_REJECT;
      if(skipSelector&&parent.closest(skipSelector))return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  var node;
  while((node=walker.nextNode()))nodes.push(node);
  return nodes;
}

function normalizeUpper(root){
  textNodes(root).forEach(function(node){
    var next=titlePeriodClean(node.nodeValue).toLocaleUpperCase('es-AR');
    if(next!==node.nodeValue)node.nodeValue=next;
  });
}

function normalizeEditorial(root,options){
  var state={sentenceStart:true,words:0};
  textNodes(root,options&&options.skip).forEach(function(node){
    var next=smartCase(node.nodeValue,state,!!(options&&options.removePeriods));
    if(next!==node.nodeValue)node.nodeValue=next;
  });
}

function unwrapTypography(description){
  description.querySelectorAll('b,strong').forEach(function(node){
    var parent=node.parentNode;
    if(!parent)return;
    while(node.firstChild)parent.insertBefore(node.firstChild,node);
    parent.removeChild(node);
  });

  description.querySelectorAll('[style]').forEach(function(node){
    ['font-family','font-size','font-weight','font-style','text-transform','letter-spacing','line-height']
      .forEach(function(prop){node.style.removeProperty(prop);});
    if(!node.getAttribute('style')||!node.getAttribute('style').trim())node.removeAttribute('style');
  });
}

function normalizeHost(host){
  if(!host||host.nodeType!==1||!document.documentElement.contains(host))return;
  if(host.matches('.titleShopSeccion,.subTitleShopSeccion')){
    normalizeUpper(host);
    return;
  }
  if(host.matches('.productoShop .title-shop1')){
    normalizeEditorial(host,{skip:'.sabores',removePeriods:true});
    return;
  }
  if(host.matches('.productoShop .descrip')){
    unwrapTypography(host);
    normalizeEditorial(host,{removePeriods:false});
  }
}

function normalizeCatalogue(){
  document.querySelectorAll(HOST_SELECTOR).forEach(normalizeHost);
}

function collect(node){
  var el=node&&node.nodeType===1?node:node&&node.parentElement;
  if(!el)return;
  var host=el.closest&&el.closest(HOST_SELECTOR);
  if(host)pending.add(host);
  if(el.querySelectorAll)el.querySelectorAll(HOST_SELECTOR).forEach(function(item){pending.add(item);});
}

function flush(){
  scheduled=false;
  var hosts=Array.from(pending);
  pending.clear();
  hosts.forEach(normalizeHost);
  if(observer)observer.takeRecords();
}

function schedule(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(flush);
}

function observe(){
  if(observer)observer.disconnect();
  var root=document.querySelector('.containerShop')||document.body;
  if(!root)return;
  observer=new MutationObserver(function(mutations){
    mutations.forEach(function(mutation){
      collect(mutation.target);
      Array.prototype.forEach.call(mutation.addedNodes||[],collect);
    });
    if(pending.size)schedule();
  });
  observer.observe(root,{subtree:true,childList:true,characterData:true});
}

ready(function(){
  normalizeCatalogue();
  observe();
});
})();
