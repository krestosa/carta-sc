(function(){
'use strict';
if(window.__scStoragePolicyBooted)return;window.__scStoragePolicyBooted=true;
var VIEW_KEY='scCatalogView:v3',THEME_KEY='scTheme:v1',nativeSet=window.Storage&&Storage.prototype&&Storage.prototype.setItem,purgeTimer=0;
function safeStore(name){try{return window[name];}catch(_){return null;}}
function owned(key){key=String(key||'');return key.indexOf('scTheme:')===0||key.indexOf('scCatalogView:')===0||key.indexOf('scCatalogSearch:')===0;}
function allowedLocal(key){return key===THEME_KEY||key===VIEW_KEY;}
function removeMatching(store,test){if(!store)return;try{for(var i=store.length-1;i>=0;i--){var key=store.key(i);if(key&&test(key))store.removeItem(key);}}catch(_){} }
function installGuard(){
  var proto=window.Storage&&Storage.prototype;if(!proto||!nativeSet||proto.__scPersistenceGuard)return;
  var guarded=function(key,value){var k=String(key||'');if(owned(k)){if(this===safeStore('localStorage')&&allowedLocal(k))return nativeSet.call(this,k,value);return;}return nativeSet.call(this,key,value);};
  try{Object.defineProperty(proto,'setItem',{configurable:true,writable:true,value:guarded});Object.defineProperty(proto,'__scPersistenceGuard',{configurable:true,value:true});}catch(_){}
}
function purgeSession(){removeMatching(safeStore('sessionStorage'),owned);}
function purgeLocal(){
  var store=safeStore('localStorage');if(!store)return;
  removeMatching(store,function(key){if(key.indexOf('scCatalogSearch:')===0)return true;if(key.indexOf('scTheme:')===0)return key!==THEME_KEY;return false;});
  var hasCurrentView=false;try{hasCurrentView=!!store.getItem(VIEW_KEY);}catch(_){}
  if(hasCurrentView)removeMatching(store,function(key){return key.indexOf('scCatalogView:')===0&&key!==VIEW_KEY;});
}
function audit(){purgeSession();purgeLocal();}
function scheduleAudit(){if(purgeTimer)clearTimeout(purgeTimer);purgeTimer=setTimeout(function(){purgeTimer=0;audit();},220);}
function onInput(event){var node=event.target;if(node&&node.matches&&node.matches('.sc-catalog-search-input'))scheduleAudit();}
installGuard();audit();document.addEventListener('input',onInput,true);window.addEventListener('pagehide',audit);if(document.readyState==='complete')setTimeout(audit,0);else window.addEventListener('load',audit,{once:true});
window.SCOverride=window.SCOverride||{};window.SCOverride.storagePolicy={allowedLocalStorage:[THEME_KEY,VIEW_KEY],audit:audit};
})();
