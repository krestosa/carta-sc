(function(){
'use strict';
var SC=window.SCOverride,CFG=SC&&SC.config,S=CFG&&CFG.selectors,A=CFG&&CFG.attributes,STORE=CFG&&CFG.storage,L=CFG&&CFG.labels,C=SC&&SC.catalogTools;if(!SC||!CFG||SC.__catalogToolsViewBooted)return;SC.__catalogToolsViewBooted=true;
var doc=document.documentElement,phone=CFG.queries.phone,tablet=CFG.queries.compactWide,V=CFG.catalog;
function context(){return phone.matches?'phone':tablet.matches?'tablet':'desktop';}
function modes(){return V.viewModes[context()];}
function defaultMode(){return V.defaultViews[context()];}
function key(){return STORE.catalogViewPrefix+':'+V.viewStorageVersion+':'+context();}
function legacyKey(){return context()==='desktop'?STORE.legacyCatalogDesktop:STORE.legacyCatalogMobile;}
function load(){var mode=doc.getAttribute(A.catalogView)||'',prepaintContext=doc.getAttribute(A.catalogViewContext)||'';if(prepaintContext!==context()||modes().indexOf(mode)<0){try{mode=localStorage.getItem(key())||localStorage.getItem(legacyKey())||'';}catch(_){mode='';}}return modes().indexOf(mode)>=0?mode:defaultMode();}
function save(mode){try{localStorage.setItem(key(),mode);}catch(_){} }
function label(mode){return L.catalogViews[mode]||L.catalogViews.list;}
function apply(root,mode,persist){var allowed=modes(),ctx=context();if(allowed.indexOf(mode)<0)mode=defaultMode();doc.setAttribute(A.catalogView,mode);doc.setAttribute(A.catalogViewContext,ctx);document.body.setAttribute(A.catalogView,mode);root.setAttribute(A.view,mode);root.setAttribute(A.viewContext,ctx);var button=root.querySelector(S.catalogViewToggle);if(button){button.setAttribute('aria-label',label(mode));button.setAttribute('title',label(mode));}Array.prototype.forEach.call(root.querySelectorAll(S.catalogViewIcons),function(icon){icon.hidden=icon.getAttribute(A.viewIcon)!==mode;});if(persist)save(mode);if(SC.motion&&SC.motion.refresh)SC.motion.refresh(0);}
function install(root){var button=root&&root.querySelector(S.catalogViewToggle);if(!button)return;var last=context();apply(root,load(),false);button.addEventListener('click',function(){var allowed=modes(),current=doc.getAttribute(A.catalogView),index=allowed.indexOf(current);apply(root,allowed[(index+1+allowed.length)%allowed.length],true);});function breakpoint(){var now=context();if(now===last)return;last=now;apply(root,load(),false);}if(phone.addEventListener)phone.addEventListener('change',breakpoint);else phone.addListener(breakpoint);if(tablet.addEventListener)tablet.addEventListener('change',breakpoint);else tablet.addListener(breakpoint);}
C.view={install:install,apply:apply};
})();
