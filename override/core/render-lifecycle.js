(function(){
'use strict';
var SC=window.SCOverride=window.SCOverride||{},C=SC.config,S=C&&C.selectors,K=C&&C.classes;
if(SC.__renderLifecycleBooted)return;SC.__renderLifecycleBooted=true;
var STABLE_LAYOUT_TIMEOUT=900,FONT_TIMEOUT=1100,MEDIA_TIMEOUT=1200,MOBILE_HEADER_TIMEOUT=500,desktopQuery=C.queries.desktop,root=document.documentElement;
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
function withTimeout(promise,ms){
  return Promise.race([Promise.resolve(promise).catch(function(){}),new Promise(function(resolve){window.setTimeout(resolve,ms);})]);
}
function waitFor(predicate,timeout){
  return new Promise(function(resolve){
    function start(){
      if(predicate()){resolve();return;}
      var settled=false,observer=null,timer=0;
      function finish(){if(settled)return;settled=true;if(observer)observer.disconnect();if(timer)clearTimeout(timer);resolve();}
      observer=new MutationObserver(function(){if(predicate())finish();});
      observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','src','srcset']});
      timer=window.setTimeout(finish,timeout);
    }
    if(document.documentElement)start();else document.addEventListener('DOMContentLoaded',start,{once:true});
  });
}
function waitForCatalogLayout(){
  if(!desktopQuery.matches)return Promise.resolve();
  return waitFor(function(){return!!(document.body&&document.body.classList.contains(K.catalogLayoutReady));},STABLE_LAYOUT_TIMEOUT);
}
function waitForCatalogTools(){
  return waitFor(function(){return!!(document.body&&document.body.classList.contains('sc-catalog-tools-ready'));},STABLE_LAYOUT_TIMEOUT);
}
function waitForMobileHeader(){
  if(desktopQuery.matches)return Promise.resolve();
  return waitFor(function(){return!!document.querySelector('body > .slicknav_menu.sc-mobile-main-menu');},MOBILE_HEADER_TIMEOUT);
}
function waitForFonts(){
  if(!document.fonts||!document.fonts.ready)return Promise.resolve();
  return withTimeout(document.fonts.ready,FONT_TIMEOUT);
}
function waitForImage(img){
  if(!img)return Promise.resolve();
  if(img.complete){
    if(img.naturalWidth&&typeof img.decode==='function')return withTimeout(img.decode(),MEDIA_TIMEOUT);
    return Promise.resolve();
  }
  return withTimeout(new Promise(function(resolve){
    function done(){img.removeEventListener('load',done);img.removeEventListener('error',done);resolve();}
    img.addEventListener('load',done,{once:true});img.addEventListener('error',done,{once:true});
  }),MEDIA_TIMEOUT);
}
function waitForCriticalMedia(){
  return waitFor(function(){return!!document.querySelector('.bannerShop .imgBannerShop');},STABLE_LAYOUT_TIMEOUT).then(function(){
    var images=[document.querySelector('.bannerShop .imgBannerShop')];
    if(!desktopQuery.matches)images.push(document.querySelector('.brandOnlyMobile img'));
    return withTimeout(Promise.all(images.map(waitForImage)),MEDIA_TIMEOUT);
  });
}
function waitForStableLayout(){
  return Promise.all([
    waitForCatalogLayout(),
    waitForCatalogTools(),
    waitForMobileHeader(),
    waitForFonts(),
    waitForCriticalMedia()
  ]).then(function(){return new Promise(afterLayoutFrame);}).then(function(){
    if(root)root.classList.remove('sc-catalog-prepaint');
  });
}
SC.renderLifecycle={markInitialViewport:markInitialViewport,waitForStableLayout:waitForStableLayout};
})();
