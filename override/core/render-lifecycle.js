(function(){
'use strict';
var SC=window.SCOverride=window.SCOverride||{},C=SC.config,S=C&&C.selectors,K=C&&C.classes,M=C&&C.motion;
if(SC.__renderLifecycleBooted)return;SC.__renderLifecycleBooted=true;
var desktopQuery=C.queries.desktop;

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
    var host=section.matches(S.sectionTitle)?section.querySelector(S.sectionTitleInner):section;
    if(host)host.classList.add(K.staticInitialSection);
  });
}

function afterLayoutFrame(resolve){requestAnimationFrame(function(){requestAnimationFrame(resolve);});}
function waitForStableLayout(){
  return new Promise(function(resolve){
    function start(){
      if(!document.body||!desktopQuery.matches||document.body.classList.contains(K.catalogLayoutReady)){afterLayoutFrame(resolve);return;}
      var settled=false,observer=null,timer=0;
      function finish(){if(settled)return;settled=true;if(observer)observer.disconnect();if(timer)clearTimeout(timer);afterLayoutFrame(resolve);}
      observer=new MutationObserver(function(){if(document.body.classList.contains(K.catalogLayoutReady))finish();});
      observer.observe(document.body,{attributes:true,attributeFilter:['class']});
      timer=window.setTimeout(finish,M.stableLayoutTimeout);
    }
    if(document.body)start();else document.addEventListener('DOMContentLoaded',start,{once:true});
  });
}
SC.renderLifecycle={markInitialViewport:markInitialViewport,waitForStableLayout:waitForStableLayout};
})();
