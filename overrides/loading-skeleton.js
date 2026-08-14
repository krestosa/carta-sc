(function(){
'use strict';
if(window.__scCatalogSkeletonDisabled)return;
window.__scCatalogSkeletonDisabled=true;

var currentScript=document.currentScript;
if(currentScript)currentScript.dataset.loaded='true';
var root=document.documentElement;
var skeletonClasses=['sc-catalog-skeleton','sc-catalog-content-loading','sc-catalog-skeleton-leaving','sc-skeleton-ready'];

function stripSkeletonState(){
  skeletonClasses.forEach(function(name){root.classList.remove(name);});
}

/* catalog.js still contains its historical skeleton bootstrap. Keep an empty
   guard with the same id so it cannot inject the old visibility-hiding style. */
if(!document.getElementById('sc-skeleton-guard')){
  var guard=document.createElement('style');
  guard.id='sc-skeleton-guard';
  guard.textContent='';
  document.head.appendChild(guard);
}

stripSkeletonState();

/* If legacy code tries to re-add skeleton classes, remove them in the same
   microtask. This has no visual state of its own. */
var classObserver=new MutationObserver(stripSkeletonState);
classObserver.observe(root,{attributes:true,attributeFilter:['class']});

function markInitialCards(){
  var vh=window.innerHeight||document.documentElement.clientHeight;
  var cards=[];
  document.querySelectorAll('.listadoShop .productoShop').forEach(function(card){
    var r=card.getBoundingClientRect();
    if(r.top<vh&&r.bottom>0){
      card.classList.add('sc-static-initial-card');
      card.style.removeProperty('opacity');
      card.style.removeProperty('visibility');
      card.style.removeProperty('transform');
      cards.push(card);
    }
  });
  if(window.gsap&&cards.length){
    window.gsap.killTweensOf(cards);
    window.gsap.set(cards,{autoAlpha:1,clearProps:'opacity,visibility,transform'});
  }
  window.__scStaticInitialCards=cards;
}

function settleInitialViewport(){
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      markInitialCards();
      if(document.fonts&&document.fonts.ready){
        document.fonts.ready.then(function(){
          requestAnimationFrame(function(){requestAnimationFrame(markInitialCards);});
        }).catch(function(){});
      }
    });
  });
}

function ready(fn){
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
}

ready(function(){
  settleInitialViewport();
  if(document.body){
    var bodyObserver=new MutationObserver(function(){
      if(document.body.classList.contains('sc-catalog-layout-ready')){
        settleInitialViewport();
        bodyObserver.disconnect();
      }
    });
    bodyObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
    setTimeout(function(){bodyObserver.disconnect();settleInitialViewport();},1200);
  }
});
})();
