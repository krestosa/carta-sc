(function(){
'use strict';
if(window.__scStoragePolicyBooted)return;window.__scStoragePolicyBooted=true;
var SEARCH_PREFIX='scCatalogSearch:v1:',VIEW_KEY='scCatalogView:v3',THEME_KEY='scTheme:v1',nativeSet=window.Storage&&Storage.prototype&&Storage.prototype.setItem;
function safeStore(name){try{return window[name];}catch(_){return null;}}
function removeMatching(store,test){if(!store)return;try{for(var i=store.length-1;i>=0;i--){var key=store.key(i);if(key&&test(key))store.removeItem(key);}}catch(_){} }
function isBlocked(key){key=String(key||'');return key.indexOf(SEARCH_PREFIX)===0;}
function installGuard(){var proto=window.Storage&&Storage.prototype;if(!proto||!nativeSet||proto.__scPersistenceGuard)return;var guarded=function(key,value){if(this===safeStore('sessionStorage')&&isBlocked(key))return;if(this===safeStore('localStorage')&&isBlocked(key))return;return nativeSet.call(this,key,value);};try{Object.defineProperty(proto,'setItem',{configurable:true,writable:true,value:guarded});Object.defineProperty(proto,'__scPersistenceGuard',{configurable:true,value:true});}catch(_){} }
function purgeSearch(){removeMatching(safeStore('sessionStorage'),function(key){return key.indexOf(SEARCH_PREFIX)===0;});removeMatching(safeStore('localStorage'),function(key){return key.indexOf(SEARCH_PREFIX)===0;});}
function purgeLegacyView(){var store=safeStore('localStorage');if(!store)return;try{if(!store.getItem(VIEW_KEY))return;}catch(_){return;}removeMatching(store,function(key){return key==='scCatalogView:desktop'||key==='scCatalogView:mobile'||key.indexOf('scCatalogView:v2:')===0;});}
function audit(){purgeSearch();purgeLegacyView();}
installGuard();purgeSearch();
if(document.readyState==='complete')setTimeout(audit,0);else window.addEventListener('load',audit,{once:true});
window.SCOverride=window.SCOverride||{};window.SCOverride.storagePolicy={allowedLocalStorage:[THEME_KEY,VIEW_KEY],audit:audit};
})();
