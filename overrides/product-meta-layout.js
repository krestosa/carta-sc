(function(){
'use strict';
if(window.__scProductMetaLayoutBooted)return;
window.__scProductMetaLayoutBooted=true;

var desktopQuery=window.matchMedia('(min-width: 993px)');
var railStateRaf=0;
var railObserver=null;

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

function setOverflowState(host,scroller){
  if(!host||!scroller)return;
  var max=Math.max(0,scroller.scrollWidth-scroller.clientWidth);
  host.classList.toggle('sc-overflow-right',max>1&&scroller.scrollLeft<max-1);
}

function updateRailState(){
  railStateRaf=0;

  var toolbar=document.querySelector('.sc-catalog-toolbar');
  if(toolbar){
    var desktopScroller=toolbar.querySelector('.sc-catalog-categories');
    setOverflowState(toolbar,desktopScroller);
    var toolbarRect=toolbar.getBoundingClientRect();
    toolbar.classList.toggle(
      'sc-is-stuck',
      desktopQuery.matches&&window.scrollY>0&&toolbarRect.top<=0.5&&toolbarRect.bottom>0
    );
  }

  var mobileWrapper=document.querySelector('.fixedTopShop.wtopShopMenuMobile');
  var mobileRail=mobileWrapper&&mobileWrapper.querySelector('.topShopMenuMobile');
  var mobileScroller=mobileRail&&mobileRail.querySelector('.topShopMenuMobileScroller');

  if(mobileRail){
    if(desktopQuery.matches)mobileRail.classList.remove('sc-overflow-right');
    else setOverflowState(mobileRail,mobileScroller);
  }

  if(mobileWrapper){
    var mobileRect=mobileWrapper.getBoundingClientRect();
    mobileWrapper.classList.toggle(
      'sc-is-stuck',
      !desktopQuery.matches&&window.scrollY>0&&mobileRect.top<=0.5&&mobileRect.bottom>0
    );
  }
}

function scheduleRailState(){
  if(railStateRaf)return;
  railStateRaf=requestAnimationFrame(updateRailState);
}

function installRailState(){
  scheduleRailState();
  window.addEventListener('scroll',scheduleRailState,{passive:true});
  window.addEventListener('resize',scheduleRailState,{passive:true});
  document.addEventListener('scroll',scheduleRailState,true);

  if(document.fonts&&document.fonts.ready){
    document.fonts.ready.then(scheduleRailState).catch(function(){});
  }

  if(document.body&&window.MutationObserver){
    railObserver=new MutationObserver(scheduleRailState);
    railObserver.observe(document.body,{childList:true,subtree:true});
  }
}

function ready(fn){
  document.readyState==='loading'
    ? document.addEventListener('DOMContentLoaded',fn,{once:true})
    : fn();
}

function handleBreakpoint(){
  installRows();
  scheduleRailState();
}

ready(function(){
  installRows();
  installRailState();
});
if(desktopQuery.addEventListener)desktopQuery.addEventListener('change',handleBreakpoint);
else desktopQuery.addListener(handleBreakpoint);
})();
