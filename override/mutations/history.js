(function(){
'use strict';
/* Mantiene el historial del navegador bajo control del sitio y limpia hashes internos
   de categorías después de navegar, sin persistir estado adicional del catálogo. */
var SC=window.SCOverride;if(!SC||SC.__historyMutationBooted)return;SC.__historyMutationBooted=true;
SC.mutations=SC.mutations||{};

/* Restaura replaceState nativo si código heredado dejó una implementación propia. */
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

/* Elimina solo hashes técnicos de anchors y conserva pathname y query actuales. */
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