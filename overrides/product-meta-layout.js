(function(){
'use strict';
/* Deploy marker: inline-subcategory-nav-v1. */
if(window.__scProductMetaLayoutBooted)return;
window.__scProductMetaLayoutBooted=true;

var desktopQuery=window.matchMedia('(min-width: 993px)');
var railStateRaf=0;
var descriptionRaf=0;
var subcategoryRaf=0;
var railObserver=null;

function loadSubcategoryStyles(){
  if(document.getElementById('sc-subcategory-nav-css'))return;
  var link=document.createElement('link');
  link.id='sc-subcategory-nav-css';
  link.rel='stylesheet';
  link.href='overrides/subcategory-nav.css?v='+(window.__scCatalogAssetVersion||'20260814-1503-subcategory');
  document.head.appendChild(link);
}

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

function cleanText(node){
  return ((node&&node.textContent)||'').replace(/\s+/g,' ').trim();
}

function slugify(value){
  var text=(value||'').toLowerCase();
  if(text.normalize)text=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  return text.replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,48)||'item';
}

function ensureSubcategoryId(node,sectionIndex,subIndex,text){
  if(node.id)return node.id;
  var base='sc-subcategory-'+(sectionIndex+1)+'-'+(subIndex+1)+'-'+slugify(text);
  var id=base;
  var suffix=2;
  while(document.getElementById(id)&&document.getElementById(id)!==node){
    id=base+'-'+suffix++;
  }
  node.id=id;
  return id;
}

function installSubcategoryNav(){
  subcategoryRaf=0;

  document.querySelectorAll('.listadoShop').forEach(function(section,sectionIndex){
    var header=section.querySelector('.titleShopSeccion');
    if(!header)return;

    var host=header.firstElementChild||header;
    var subs=Array.prototype.filter.call(section.querySelectorAll('.subTitleShopSeccion'),function(sub){
      return sub.closest('.listadoShop')===section&&cleanText(sub);
    });
    var existing=host.querySelector('.sc-subcategory-nav');

    if(!subs.length){
      if(existing&&existing.parentNode)existing.parentNode.removeChild(existing);
      return;
    }

    var signature=subs.map(cleanText).join('|');
    if(existing&&existing.getAttribute('data-sc-signature')===signature)return;
    if(existing&&existing.parentNode)existing.parentNode.removeChild(existing);

    var label=host.querySelector('.sc-category-title-label');
    if(!label){
      label=document.createElement('span');
      label.className='sc-category-title-label';
      Array.prototype.slice.call(host.childNodes).forEach(function(node){
        if(node.nodeType===1&&node.classList&&node.classList.contains('sc-subcategory-nav'))return;
        label.appendChild(node);
      });
      host.appendChild(label);
    }

    var nav=document.createElement('nav');
    nav.className='sc-subcategory-nav';
    nav.setAttribute('data-sc-signature',signature);
    nav.setAttribute('aria-label','Subcategorías de '+cleanText(label));

    subs.forEach(function(sub,subIndex){
      var text=cleanText(sub);
      var id=ensureSubcategoryId(sub,sectionIndex,subIndex,text);
      sub.classList.add('sc-subcategory-target');

      var link=document.createElement('a');
      link.className='sc-subcategory-link';
      link.href='#'+id;
      link.textContent=text;
      nav.appendChild(link);
    });

    host.appendChild(nav);
  });
}

function scheduleSubcategoryNav(){
  if(subcategoryRaf)return;
  subcategoryRaf=requestAnimationFrame(installSubcategoryNav);
}

function measureDescriptions(){
  descriptionRaf=0;
  document.querySelectorAll('.listadoShop .productoShop .descrip').forEach(function(desc){
    desc.classList.remove('sc-description-truncated');
    var truncated=desc.scrollHeight>desc.clientHeight+1||desc.scrollWidth>desc.clientWidth+1;
    desc.classList.toggle('sc-description-truncated',truncated);
  });
}

function scheduleDescriptionMeasure(){
  if(descriptionRaf)return;
  descriptionRaf=requestAnimationFrame(function(){requestAnimationFrame(measureDescriptions);});
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
  document.addEventListener('scroll',scheduleRailState,true);

  if(document.body&&window.MutationObserver){
    railObserver=new MutationObserver(function(){
      scheduleRailState();
      scheduleDescriptionMeasure();
      scheduleSubcategoryNav();
    });
    railObserver.observe(document.body,{childList:true,subtree:true,characterData:true});
  }
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
  loadSubcategoryStyles();
  installRows();
  scheduleSubcategoryNav();
  installRailState();
  scheduleDescriptionMeasure();
  window.addEventListener('resize',handleResize,{passive:true});

  if(document.fonts&&document.fonts.ready){
    document.fonts.ready.then(handleResize).catch(function(){});
  }
});

if(desktopQuery.addEventListener)desktopQuery.addEventListener('change',handleBreakpoint);
else desktopQuery.addListener(handleBreakpoint);
})();
