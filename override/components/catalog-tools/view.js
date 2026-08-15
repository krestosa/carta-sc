(function(){
'use strict';
var SC=window.SCOverride,CFG=SC&&SC.config,S=CFG&&CFG.selectors,C=SC&&SC.catalogTools;if(!SC||!CFG||SC.__catalogToolsViewBooted)return;SC.__catalogToolsViewBooted=true;
var doc=document.documentElement,phone=CFG.queries.phone,tablet=CFG.queries.compactWide,V=CFG.catalog;
function context(){return phone.matches?'phone':tablet.matches?'tablet':'desktop';}
function modes(){return V.viewModes[context()];}
function defaultMode(){return V.defaultViews[context()];}
function key(){return 'scCatalogView:'+V.viewStorageVersion+':'+context();}
function legacyKey(){return context()==='desktop'?'scCatalogView:desktop':'scCatalogView:mobile';}
function load(){var mode=doc.getAttribute('data-sc-catalog-view')||'',prepaintContext=doc.getAttribute('data-sc-catalog-view-context')||'';if(prepaintContext!==context()||modes().indexOf(mode)<0){try{mode=localStorage.getItem(key())||localStorage.getItem(legacyKey())||'';}catch(_){mode='';}}return modes().indexOf(mode)>=0?mode:defaultMode();}
function save(mode){try{localStorage.setItem(key(),mode);}catch(_){} }
function label(mode){if(mode==='one')return 'Vista: una columna. Cambiar vista';if(mode==='two')return 'Vista: dos columnas. Cambiar vista';if(mode==='three')return 'Vista: tres columnas. Cambiar vista';if(mode==='four')return 'Vista: cuatro columnas. Cambiar vista';return 'Vista: lista. Cambiar vista';}
function apply(root,mode,persist){var allowed=modes(),ctx=context();if(allowed.indexOf(mode)<0)mode=defaultMode();doc.setAttribute('data-sc-catalog-view',mode);doc.setAttribute('data-sc-catalog-view-context',ctx);document.body.setAttribute('data-sc-catalog-view',mode);root.setAttribute('data-sc-view',mode);root.setAttribute('data-sc-view-context',ctx);var button=root.querySelector(S.catalogViewToggle);if(button){button.setAttribute('aria-label',label(mode));button.setAttribute('title',label(mode));}Array.prototype.forEach.call(root.querySelectorAll('[data-sc-view-icon]'),function(icon){icon.hidden=icon.getAttribute('data-sc-view-icon')!==mode;});if(persist)save(mode);if(SC.motion&&SC.motion.refresh)SC.motion.refresh(0);}
function install(root){var button=root&&root.querySelector(S.catalogViewToggle);if(!button)return;var last=context();apply(root,load(),false);button.addEventListener('click',function(){var allowed=modes(),current=doc.getAttribute('data-sc-catalog-view'),index=allowed.indexOf(current);apply(root,allowed[(index+1+allowed.length)%allowed.length],true);});function breakpoint(){var now=context();if(now===last)return;last=now;apply(root,load(),false);}if(phone.addEventListener)phone.addEventListener('change',breakpoint);else phone.addListener(breakpoint);if(tablet.addEventListener)tablet.addEventListener('change',breakpoint);else tablet.addListener(breakpoint);}
C.view={install:install,apply:apply};
})();
