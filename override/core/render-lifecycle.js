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

function waitForStableLayout(){
  return new Promise(function(resolve){
    var attempts=0;
    function check(){
      if(!document.body)return requestAnimationFrame(check);
      if(desktopQuery.matches&&!document.body.classList.contains('sc-catalog-layout-ready')&&attempts++<45){
        return requestAnimationFrame(check);
      }
      requestAnimationFrame(function(){requestAnimationFrame(resolve);});
    }
    check();
  });
}

SC.renderLifecycle={
  markInitialViewport:markInitialViewport,
  waitForStableLayout:waitForStableLayout
};
})();