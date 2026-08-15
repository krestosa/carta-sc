(function(){
'use strict';
var SC=window.SCOverride;if(!SC||SC.__scrollRestorationBooted)return;SC.__scrollRestorationBooted=true;

function scrollStorageKey(){return 'sc:scroll:'+location.pathname+location.search;}
function navigationType(){
  try{
    var entries=performance&&performance.getEntriesByType?performance.getEntriesByType('navigation'):[];
    if(entries&&entries[0]&&entries[0].type)return entries[0].type;
    if(performance&&performance.navigation){
      if(performance.navigation.type===1)return 'reload';
      if(performance.navigation.type===2)return 'back_forward';
    }
  }catch(_){}
  return 'navigate';
}
function saveScrollPosition(){
  try{
    var y=window.pageYOffset||document.documentElement.scrollTop||0;
    sessionStorage.setItem(scrollStorageKey(),String(Math.max(0,Math.round(y))));
  }catch(_){}
}
function restoreSavedScrollPosition(){
  var type=navigationType();
  if(type!=='reload'&&type!=='back_forward')return;
  if(location.hash&&!/^#anchor/i.test(location.hash))return;
  var raw=null;
  try{raw=sessionStorage.getItem(scrollStorageKey());}catch(_){}
  if(raw===null)return;
  var y=Number(raw);if(!isFinite(y)||y<0)return;
  var apply=function(){
    var max=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
    var top=Math.max(0,Math.min(max,y));
    try{window.scrollTo({top:top,left:0,behavior:'auto'});}catch(_){window.scrollTo(0,top);}
  };
  var afterLayout=function(){requestAnimationFrame(function(){requestAnimationFrame(apply);});};
  if(document.readyState==='complete')afterLayout();else window.addEventListener('load',afterLayout,{once:true});
}
window.addEventListener('pagehide',saveScrollPosition,{capture:true});
window.addEventListener('pageshow',function(event){if(!event.persisted)restoreSavedScrollPosition();},{once:true});
})();