(function(){
'use strict';
var SC=window.SCOverride=window.SCOverride||{};
if(SC.__renderLifecycleBooted)return;SC.__renderLifecycleBooted=true;
var desktopQuery=window.matchMedia('(min-width: 993px)');

function markInitialViewport(){
  var vh=window.innerHeight||document.documentElement.clientHeight;
  document.querySelectorAll('.listadoShop .productoShop').forEach(function(card){
    var rect=card.getBoundingClientRect();
    if(rect.top<vh&&rect.bottom>0)card.classList.add('sc-static-initial-card');
  });
  document.querySelectorAll('.listadoShop .titleShopSeccion, .listadoShop .subTitleShopSeccion').forEach(function(section){
    var rect=section.getBoundingClientRect();
    if(rect.top>=vh||rect.bottom<=0)return;
    section.classList.add('sc-static-initial-section');
    var host=section.matches('.titleShopSeccion')?section.querySelector(':scope > div'):section;
    if(host)host.classList.add('sc-static-initial-section');
  });
}

function afterLayoutFrame(resolve){
  requestAnimationFrame(function(){requestAnimationFrame(resolve);});
}
function waitForStableLayout(){
  return new Promise(function(resolve){
    function start(){
      if(!document.body||!desktopQuery.matches||document.body.classList.contains('sc-catalog-layout-ready')){
        afterLayoutFrame(resolve);
        return;
      }
      var settled=false,observer=null,timer=0;
      function finish(){
        if(settled)return;settled=true;
        if(observer)observer.disconnect();
        if(timer)clearTimeout(timer);
        afterLayoutFrame(resolve);
      }
      observer=new MutationObserver(function(){
        if(document.body.classList.contains('sc-catalog-layout-ready'))finish();
      });
      observer.observe(document.body,{attributes:true,attributeFilter:['class']});
      timer=window.setTimeout(finish,750);
    }
    if(document.body)start();
    else document.addEventListener('DOMContentLoaded',start,{once:true});
  });
}

SC.renderLifecycle={
  markInitialViewport:markInitialViewport,
  waitForStableLayout:waitForStableLayout
};
})();