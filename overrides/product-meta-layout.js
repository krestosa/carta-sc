(function(){
'use strict';
/* Stable metadata/rail layout with finite listeners and clickable rail controls. */
if(window.__scProductMetaLayoutBooted)return;
window.__scProductMetaLayoutBooted=true;

var desktopQuery=window.matchMedia('(min-width: 993px)');
var railStateRaf=0;
var descriptionRaf=0;

function loadMobileResponsiveStyles(){
  if(document.getElementById('sc-mobile-responsive-css'))return;
  var link=document.createElement('link');
  link.id='sc-mobile-responsive-css';
  link.rel='stylesheet';
  link.href='overrides/mobile-responsive.css?v=20260814-1830-mobile-v2';
  document.head.appendChild(link);
}

loadMobileResponsiveStyles();

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

function makeRailArrow(host,scroller,direction){
  var selector='.sc-rail-arrow--'+direction;
  var existing=host.querySelector(selector);
  if(existing)return existing;

  var button=document.createElement('button');
  button.type='button';
  button.className='sc-rail-arrow sc-rail-arrow--'+direction;
  button.setAttribute('aria-label',direction==='left'?'Ver categorías anteriores':'Ver más categorías');
  button.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#666" aria-hidden="true"><path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"/></svg>';

  button.addEventListener('click',function(){
    var amount=Math.max(140,Math.round(scroller.clientWidth*.65));
    if(direction==='left')amount*=-1;
    try{scroller.scrollBy({left:amount,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
    catch(_){scroller.scrollLeft+=amount;}
    requestAnimationFrame(scheduleRailState);
  });

  host.appendChild(button);
  return button;
}

function setRailArrowVisible(button,visible){
  if(!button)return;
  button.style.setProperty('opacity',visible?'1':'0','important');
  button.style.setProperty('visibility',visible?'visible':'hidden','important');
  button.style.setProperty('pointer-events',visible?'auto':'none','important');
  button.disabled=!visible;
}

function setRailArrowState(host,scroller,canLeft,canRight){
  if(!host)return;
  var left=host.querySelector('.sc-rail-arrow--left');
  var right=host.querySelector('.sc-rail-arrow--right');

  if(scroller){
    left=left||makeRailArrow(host,scroller,'left');
    right=right||makeRailArrow(host,scroller,'right');
  }

  setRailArrowVisible(left,!!canLeft);
  setRailArrowVisible(right,!!canRight);
}

function setOverflowState(host,scroller){
  if(!host||!scroller)return;
  var max=Math.max(0,scroller.scrollWidth-scroller.clientWidth);
  var canLeft=max>1&&scroller.scrollLeft>1;
  var canRight=max>1&&scroller.scrollLeft<max-1;
  host.classList.toggle('sc-overflow-left',canLeft);
  host.classList.toggle('sc-overflow-right',canRight);
  setRailArrowState(host,scroller,canLeft,canRight);
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
    if(desktopQuery.matches){
      mobileRail.classList.remove('sc-overflow-left','sc-overflow-right');
      setRailArrowState(mobileRail,null,false,false);
    }else{
      setOverflowState(mobileRail,mobileScroller);
    }
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

function repairMobileHeader(){
  if(desktopQuery.matches)return;

  var menus=Array.prototype.slice.call(document.querySelectorAll('body > .slicknav_menu'));
  if(!menus.length)return;

  /* main.js creates the live SlickNav instance after the static snapshot menu.
     Keep that event-bound instance and remove only the older captured copies. */
  var liveMenu=menus[menus.length-1];
  menus.forEach(function(menu){
    if(menu!==liveMenu&&menu.parentNode)menu.parentNode.removeChild(menu);
  });

  liveMenu.classList.add('sc-mobile-main-menu');
  liveMenu.style.removeProperty('visibility');
  liveMenu.style.removeProperty('pointer-events');

  var button=liveMenu.querySelector('.slicknav_btn');
  if(button){
    button.setAttribute('aria-label','Abrir menú de navegación');
    button.setAttribute('title','Menú');
  }

  var logo=document.querySelector('.brandOnlyMobile img');
  if(logo){
    logo.style.removeProperty('margin-left');
    logo.style.removeProperty('transform');
  }
}

function handleResize(){
  scheduleRailState();
  scheduleDescriptionMeasure();
}

function handleBreakpoint(){
  installRows();
  handleResize();
  if(!desktopQuery.matches)setTimeout(repairMobileHeader,0);
}

function loadProductImageParallax(){
  if(document.getElementById('sc-product-image-parallax-js'))return;
  var script=document.createElement('script');
  script.id='sc-product-image-parallax-js';
  script.src='motion/product-image-parallax.js?v=20260814-1753-parallax-v1';
  script.async=true;
  document.head.appendChild(script);
}

ready(function(){
  installRows();
  scheduleRailState();
  scheduleDescriptionMeasure();
  loadProductImageParallax();

  /* Preserve the already working legacy SlickNav instance and remove only
     duplicate snapshot markup after the DOM-ready queue has finished. */
  setTimeout(repairMobileHeader,0);

  window.addEventListener('scroll',scheduleRailState,{passive:true});
  document.addEventListener('scroll',scheduleRailState,true);
  window.addEventListener('resize',handleResize,{passive:true});

  document.querySelectorAll('.sc-catalog-categories, .topShopMenuMobileScroller').forEach(function(scroller){
    scroller.addEventListener('scroll',scheduleRailState,{passive:true});
  });

  setTimeout(handleResize,0);
  setTimeout(handleResize,180);

  if(document.fonts&&document.fonts.ready){
    document.fonts.ready.then(handleResize).catch(function(){});
  }
});

if(desktopQuery.addEventListener)desktopQuery.addEventListener('change',handleBreakpoint);
else desktopQuery.addListener(handleBreakpoint);
})();
