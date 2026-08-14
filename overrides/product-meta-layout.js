(function(){
'use strict';
if(window.__scProductMetaLayoutBooted)return;
window.__scProductMetaLayoutBooted=true;

var desktopQuery=window.matchMedia('(min-width: 993px)');

function clearRows(){
  document.querySelectorAll('.sc-product-flavors').forEach(function(row){
    if(row.parentNode)row.parentNode.removeChild(row);
  });
}

function installRows(){
  clearRows();
  if(!desktopQuery.matches)return;

  document.querySelectorAll('.productoShop > a.fancyboxModalAddProd').forEach(function(link){
    var title=link.querySelector('.title-shop1');
    var source=title&&title.querySelector('.sabores');
    var row=document.createElement('span');
    row.className='sc-product-flavors';

    if(source){
      Array.prototype.forEach.call(source.children,function(node){
        var clone=node.cloneNode(true);
        if(clone.tagName==='IMG'){
          if(!clone.getAttribute('alt'))clone.setAttribute('alt',clone.getAttribute('data-original-title')||'');
          clone.removeAttribute('data-toggle');
        }
        row.appendChild(clone);
      });
    }

    if(!row.children.length)row.setAttribute('aria-hidden','true');
    link.appendChild(row);
  });
}

function ready(fn){
  document.readyState==='loading'
    ? document.addEventListener('DOMContentLoaded',fn,{once:true})
    : fn();
}

ready(installRows);
if(desktopQuery.addEventListener)desktopQuery.addEventListener('change',installRows);
else desktopQuery.addListener(installRows);
})();
