(function(){
'use strict';
/* Stable metadata/rail layout: no catalogue-wide MutationObserver. */
if(window.__scProductMetaLayoutBooted)return;
window.__scProductMetaLayoutBooted=true;

var desktopQuery=window.matchMedia('(min-width: 993px)');
var railStateRaf=0;
var descriptionRaf=0;

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

function measureDescriptions(){
  descriptionRaf=0;
  document.querySelectorAll('.listadoShop .productoShop .descrip').forEach(function(desc){
    desc.classList.remove('sc-description-truncated');
    var truncated=desc.scrollHeight>desc.clientHeight+1||desc.scrollWidth>desc.clientWidth+1;
    if(truncated)desc.classList.add('sc-description-truncated');
  });
}

function scheduleDescriptionMeasure(){
  if(descriptionRaf)return;
  descriptionRaf=requestAnimationFrame(function(){
    requestAnimationFrame(measureDescriptions);
  });
}

function setOverflowState(host,scroller){
  if(!host||!scroller)return;
  var max=Math.max(0,scroller.scrollWidth-scroller.clientWidth);
  var canLeft=max>1&&scroller.scrollLeft>1;
  var canRight=max>1&&scroller.scrollLeft<max-1;
  host.classList.toggle('sc-overflow-left',canLeft);
  host.classList.toggle('sc-overflow-right',canRight);
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
    if(desktopQuery.matches)mobileRail.classList.remove('sc-overflow-left','sc-overflow-right');
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

function ready(fn){
  document.readyState==='loading'
    ? document.addEventListener('DOMContentLoaded',fn,{once:true})
    : fn();
}

function handleResize(){
  scheduleRailState();
  scheduleDescriptionMeasure();
}

function handleBreakpoint(){
  installRows();
  handleResize();
}

ready(function(){
  installRows();
  scheduleRailState();
  scheduleDescriptionMeasure();

  window.addEventListener('scroll',scheduleRailState,{passive:true});
  document.addEventListener('scroll',scheduleRailState,true);
  window.addEventListener('resize',handleResize,{passive:true});

  /* Toolbar creation and font settling are finite events; a couple of deferred
     passes replace the previous unbounded subtree MutationObserver. */
  setTimeout(handleResize,0);
  setTimeout(handleResize,180);

  if(document.fonts&&document.fonts.ready){
    document.fonts.ready.then(handleResize).catch(function(){});
  }
});

if(desktopQuery.addEventListener)desktopQuery.addEventListener('change',handleBreakpoint);
else desktopQuery.addListener(handleBreakpoint);
})();
