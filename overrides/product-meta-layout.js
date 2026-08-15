(function(){
'use strict';
if(window.__scProductMetaLayoutBooted)return;
window.__scProductMetaLayoutBooted=true;

var desktopQuery=window.matchMedia('(min-width: 993px)');
var railStateRaf=0,descriptionRaf=0,lastMobileActiveCategory=null;

function each(list,fn){Array.prototype.forEach.call(list||[],fn);}
function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}

function loadMobileResponsiveStyles(){
  if(document.getElementById('sc-mobile-responsive-css'))return;
  var link=document.createElement('link');link.id='sc-mobile-responsive-css';link.rel='stylesheet';
  link.href='overrides/mobile-responsive.css?v='+(window.__scCatalogAssetVersion||'20260814-ux-hardening-v1');document.head.appendChild(link);
}
loadMobileResponsiveStyles();

/* mobile-responsive.css is injected after catalog.js. Move the already-created
   hardening stylesheet to the end of <head> so accessibility fixes keep
   precedence without touching the snapshot/source files. */
(function raiseHardeningStyles(){
  var hardening=document.getElementById('sc-ux-hardening-css');
  if(hardening&&hardening.parentNode)document.head.appendChild(hardening);
})();

function traitLabels(source){
  var seen={},labels=[];
  each(source?source.querySelectorAll('img[data-original-title]'):[],function(img){
    var label=(img.getAttribute('data-original-title')||'').trim();
    if(label&&!seen[label]){seen[label]=true;labels.push(label);}
  });
  return labels;
}

function clearRows(){each(document.querySelectorAll('.sc-product-flavors'),function(row){if(row.parentNode)row.parentNode.removeChild(row);});}

function installRows(){
  clearRows();
  each(document.querySelectorAll('.productoShop > a.fancyboxModalAddProd'),function(link){
    var title=link.querySelector('.title-shop1'),source=title&&title.querySelector('.sabores');
    if(source)source.setAttribute('aria-hidden','true');
    var row=document.createElement('span');row.className='sc-product-flavors';
    var labels=traitLabels(source);
    if(source){
      each(source.children,function(node){
        var clone=node.cloneNode(true);
        if(clone.tagName==='IMG'){
          clone.setAttribute('alt','');clone.setAttribute('aria-hidden','true');clone.removeAttribute('data-toggle');clone.removeAttribute('title');
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
function scheduleDescriptionMeasure(){if(descriptionRaf)return;descriptionRaf=requestAnimationFrame(function(){requestAnimationFrame(measureDescriptions);});}

function makeRailArrow(host,scroller,direction){
  var selector='.sc-rail-arrow--'+direction,existing=host.querySelector(selector);if(existing)return existing;
  var button=document.createElement('button');button.type='button';button.className='sc-rail-arrow sc-rail-arrow--'+direction;
  button.setAttribute('aria-label',direction==='left'?'Ver categorías anteriores':'Ver más categorías');
  button.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#666" aria-hidden="true"><path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"/></svg>';
  button.addEventListener('click',function(){
    var amount=Math.max(140,Math.round(scroller.clientWidth*.65));if(direction==='left')amount*=-1;
    try{scroller.scrollBy({left:amount,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}catch(_){scroller.scrollLeft+=amount;}
    requestAnimationFrame(scheduleRailState);
  });
  host.appendChild(button);return button;
}

function setRailArrowVisible(button,visible){
  if(!button)return;button.style.setProperty('opacity',visible?'1':'0','important');button.style.setProperty('visibility',visible?'visible':'hidden','important');button.style.setProperty('pointer-events',visible?'auto':'none','important');button.disabled=!visible;
}
function setRailArrowState(host,scroller,canLeft,canRight){
  if(!host)return;var left=host.querySelector('.sc-rail-arrow--left'),right=host.querySelector('.sc-rail-arrow--right');
  if(scroller){left=left||makeRailArrow(host,scroller,'left');right=right||makeRailArrow(host,scroller,'right');}
  setRailArrowVisible(left,!!canLeft);setRailArrowVisible(right,!!canRight);
}
function setOverflowState(host,scroller){
  if(!host||!scroller)return;var max=Math.max(0,scroller.scrollWidth-scroller.clientWidth),canLeft=max>1&&scroller.scrollLeft>1,canRight=max>1&&scroller.scrollLeft<max-1;
  host.classList.toggle('sc-overflow-left',canLeft);host.classList.toggle('sc-overflow-right',canRight);setRailArrowState(host,scroller,canLeft,canRight);
}

function mobileActiveCategoryLink(rail){
  if(!rail)return null;return rail.querySelector('.nav-top-li > a.anchorLink.sc-motion-current')||rail.querySelector('.nav-top-li > a.anchorLink[aria-current="location"]')||rail.querySelector('.nav-top-li.active > a.anchorLink')||rail.querySelector('.nav-top-li > a.anchorLink.active');
}
function autoScrollMobileCategory(rail,scroller){
  if(desktopQuery.matches||!rail||!scroller)return;var link=mobileActiveCategoryLink(rail);if(!link||link===lastMobileActiveCategory)return;lastMobileActiveCategory=link;
  requestAnimationFrame(function(){
    if(!document.documentElement.contains(link)||!document.documentElement.contains(scroller))return;
    var railRect=scroller.getBoundingClientRect(),itemRect=link.getBoundingClientRect();
    var target=scroller.scrollLeft+(itemRect.left+itemRect.width/2-(railRect.left+railRect.width/2)),max=Math.max(0,scroller.scrollWidth-scroller.clientWidth);target=Math.max(0,Math.min(max,target));
    if(Math.abs(target-scroller.scrollLeft)<1)return;
    try{scroller.scrollTo({left:target,top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}catch(_){scroller.scrollLeft=target;}
  });
}

function updateRailState(){
  railStateRaf=0;
  var toolbar=document.querySelector('.sc-catalog-toolbar');
  if(toolbar){var desktopScroller=toolbar.querySelector('.sc-catalog-categories');setOverflowState(toolbar,desktopScroller);var rect=toolbar.getBoundingClientRect();toolbar.classList.toggle('sc-is-stuck',desktopQuery.matches&&window.scrollY>0&&rect.top<=.5&&rect.bottom>0);}
  var wrapper=document.querySelector('.fixedTopShop.wtopShopMenuMobile'),rail=wrapper&&wrapper.querySelector('.topShopMenuMobile'),scroller=rail&&rail.querySelector('.topShopMenuMobileScroller');
  if(rail){if(desktopQuery.matches){rail.classList.remove('sc-overflow-left','sc-overflow-right');setRailArrowState(rail,null,false,false);lastMobileActiveCategory=null;}else{setOverflowState(rail,scroller);autoScrollMobileCategory(rail,scroller);}}
  if(wrapper){var mobileRect=wrapper.getBoundingClientRect();wrapper.classList.toggle('sc-is-stuck',!desktopQuery.matches&&window.scrollY>0&&mobileRect.top<=.5&&mobileRect.bottom>0);}
}
function scheduleRailState(){if(!railStateRaf)railStateRaf=requestAnimationFrame(updateRailState);}

function syncMenuButton(button,nav){
  if(!button||!nav)return;var open=button.classList.contains('slicknav_open')||nav.getAttribute('aria-hidden')==='false'||nav.style.display==='block';
  if(!nav.id)nav.id='sc-mobile-primary-menu';button.setAttribute('aria-controls',nav.id);button.setAttribute('aria-expanded',open?'true':'false');button.setAttribute('aria-label',open?'Cerrar menú de navegación':'Abrir menú de navegación');button.setAttribute('title','Menú');
}
function menuHasBoundClick(menu){
  var button=menu&&menu.querySelector('.slicknav_btn'),jq=window.jQuery;if(!button||!jq||typeof jq._data!=='function')return false;
  try{var events=jq._data(button,'events');return !!(events&&events.click&&events.click.length);}catch(_){return false;}
}
function installFallbackMenuToggle(menu){
  var button=menu&&menu.querySelector('.slicknav_btn'),nav=menu&&menu.querySelector('.slicknav_nav');if(!button||!nav||button.getAttribute('data-sc-fallback-toggle')==='true')return;
  button.setAttribute('data-sc-fallback-toggle','true');button.addEventListener('click',function(e){
    e.preventDefault();var open=button.classList.contains('slicknav_open')||nav.getAttribute('aria-hidden')==='false'||nav.style.display==='block',next=!open;
    button.classList.toggle('slicknav_open',next);button.classList.toggle('slicknav_collapsed',!next);nav.classList.toggle('slicknav_hidden',!next);nav.setAttribute('aria-hidden',next?'false':'true');nav.style.display=next?'block':'none';syncMenuButton(button,nav);
  });
}
function repairMobileHeader(finalAttempt){
  if(desktopQuery.matches)return;var menus=Array.prototype.slice.call(document.querySelectorAll('body > .slicknav_menu'));if(!menus.length)return;
  var live=null;for(var i=0;i<menus.length;i+=1){if(menuHasBoundClick(menus[i])){live=menus[i];break;}}if(!live&&!finalAttempt)return;if(!live)live=menus[0];
  menus.forEach(function(menu){if(menu!==live&&menu.parentNode)menu.parentNode.removeChild(menu);});live.classList.add('sc-mobile-main-menu');live.style.removeProperty('visibility');live.style.removeProperty('pointer-events');
  var button=live.querySelector('.slicknav_btn'),nav=live.querySelector('.slicknav_nav');if(!menuHasBoundClick(live))installFallbackMenuToggle(live);syncMenuButton(button,nav);
  if(button&&button.getAttribute('data-sc-a11y-sync')!=='true'){button.setAttribute('data-sc-a11y-sync','true');button.addEventListener('click',function(){window.setTimeout(function(){syncMenuButton(button,nav);},0);});}
  var logo=document.querySelector('.brandOnlyMobile img');if(logo){logo.style.removeProperty('margin-left');logo.style.removeProperty('transform');}
}
function scheduleMobileHeaderRepair(){if(desktopQuery.matches)return;window.setTimeout(function(){repairMobileHeader(false);},0);window.setTimeout(function(){repairMobileHeader(false);},60);window.setTimeout(function(){repairMobileHeader(false);},180);window.setTimeout(function(){repairMobileHeader(true);},420);}

function handleResize(){scheduleRailState();scheduleDescriptionMeasure();}
function handleBreakpoint(){installRows();lastMobileActiveCategory=null;handleResize();scheduleMobileHeaderRepair();}
function loadProductImageParallax(){
  if(document.getElementById('sc-product-image-parallax-js'))return;var script=document.createElement('script');script.id='sc-product-image-parallax-js';script.src='motion/product-image-parallax.js?v='+(window.__scCatalogAssetVersion||'20260814-ux-hardening-v1');script.async=true;document.head.appendChild(script);
}

ready(function(){
  installRows();scheduleRailState();scheduleDescriptionMeasure();loadProductImageParallax();scheduleMobileHeaderRepair();
  window.addEventListener('scroll',scheduleRailState,{passive:true});document.addEventListener('scroll',scheduleRailState,true);window.addEventListener('resize',handleResize,{passive:true});
  each(document.querySelectorAll('.sc-catalog-categories, .topShopMenuMobileScroller'),function(scroller){scroller.addEventListener('scroll',scheduleRailState,{passive:true});});
  document.addEventListener('click',function(e){if(desktopQuery.matches)return;var link=e.target.closest&&e.target.closest('.topShopMenuMobile a.anchorLink[href^="#"]');if(!link)return;window.setTimeout(scheduleRailState,0);window.setTimeout(scheduleRailState,180);},true);
  setTimeout(handleResize,0);setTimeout(handleResize,180);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(handleResize).catch(function(){});
});
if(desktopQuery.addEventListener)desktopQuery.addEventListener('change',handleBreakpoint);else desktopQuery.addListener(handleBreakpoint);
})();
