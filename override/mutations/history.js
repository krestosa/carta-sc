(function(){
'use strict';
var SC=window.SCOverride;if(!SC||SC.__historyMutationBooted)return;SC.__historyMutationBooted=true;
SC.mutations=SC.mutations||{};

function restoreNativeHistory(){
  try{
    var proto=window.History&&window.History.prototype;
    if(!proto||typeof proto.replaceState!=='function')return;
    if(Object.prototype.hasOwnProperty.call(window.history,'replaceState')){
      try{delete window.history.replaceState;}catch(_){}
    }
    if(window.history.replaceState!==proto.replaceState){
      try{Object.defineProperty(window.history,'replaceState',{configurable:true,writable:true,value:proto.replaceState.bind(window.history)});}catch(_){}
    }
  }catch(_){}
}
function cleanCategoryHash(){
  if(!/^#anchor/i.test(location.hash||''))return;
  try{history.replaceState(history.state,document.title,location.pathname+location.search);}catch(_){}
}
SC.mutations.restoreNativeHistory=restoreNativeHistory;
SC.mutations.cleanCategoryHash=cleanCategoryHash;
restoreNativeHistory();
var finish=function(){restoreNativeHistory();cleanCategoryHash();};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',finish,{once:true});else finish();
})();