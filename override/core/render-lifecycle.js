(function(){
'use strict';
var SC=window.SCOverride=window.SCOverride||{},C=SC.config,S=C&&C.selectors,K=C&&C.classes;
if(SC.__renderLifecycleBooted)return;SC.__renderLifecycleBooted=true;
var STABLE_LAYOUT_TIMEOUT=750,FONT_TIMEOUT=900,desktopQuery=C.queries.desktop,root=document.documentElement;
function markInitialViewport(){
  var vh=window.innerHeight||document.documentElement.clientHeight;
  document.querySelectorAll(S.productCards).forEach(function(card){
    var rect=card.getBoundingClientRect();
    if(rect.top<vh&&rect.bottom>0)card.classList.add(K.staticInitialCard);
  });
  document.querySelectorAll(S.productList+' '+S.sectionTitle+', '+S.productList+' '+S.sectionSubtitle).forEach(function(section){
    var rect=section.getBoundingClientRect();
    if(rect.top>=vh||rect.bottom<=0)return;
    section.classList.add(K.staticInitialSection);
    var host=section.matches(S.sectionTitle)?section.querySelector(":scope > div"):section;
    if(host)host.classList.add(K.staticInitialSection);
  });
}

function afterLayoutFrame(resolve){requestAnimationFrame(function(){requestAnimationFrame(resolve);});}
function waitForCatalogLayout(){
  return new Promise(function(resolve){
    function start(){
      if(!document.body||!desktopQuery.matches||document.body.classList.contains(K.catalogLayoutReady)){resolve();return;}
      var settled=false,observer=null,timer=0;
      function finish(){if(settled)return;settled=true;if(observer)observer.disconnect();if(timer)clearTimeout(timer);resolve();}
      observer=new MutationObserver(function(){if(document.body.classList.contains(K.catalogLayoutReady))finish();});
      observer.observe(document.body,{attributes:true,attributeFilter:['class']});
      timer=window.setTimeout(finish,STABLE_LAYOUT_TIMEOUT);
    }
    if(document.body)start();else document.addEventListener('DOMContentLoaded',start,{once:true});
  });
}
function waitForFonts(){
  if(!document.fonts||!document.fonts.ready)return Promise.resolve();
  return Promise.race([
    Promise.resolve(document.fonts.ready).catch(function(){}),
    new Promise(function(resolve){window.setTimeout(resolve,FONT_TIMEOUT);})
  ]);
}
function waitForStableLayout(){
  return waitForCatalogLayout().then(waitForFonts).then(function(){
    return new Promise(afterLayoutFrame);
  }).then(function(){
    if(root)root.classList.remove('sc-catalog-prepaint');
  });
}
SC.renderLifecycle={markInitialViewport:markInitialViewport,waitForStableLayout:waitForStableLayout};
})();
