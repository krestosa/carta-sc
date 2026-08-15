(function(){
'use strict';
var SC=window.SCOverride,CFG=SC&&SC.config,S=CFG&&CFG.selectors,C=SC&&SC.catalogTools;if(!SC||!CFG||SC.__catalogToolsViewBooted)return;SC.__catalogToolsViewBooted=true;
var VIEW_LABELS={one:'Vista: una columna. Cambiar vista',two:'Vista: dos columnas. Cambiar vista',three:'Vista: tres columnas. Cambiar vista',four:'Vista: cuatro columnas. Cambiar vista',list:'Vista: lista. Cambiar vista'};
var doc=document.documentElement,phone=CFG.queries.phone,tablet=CFG.queries.compactWide,STORE_PREFIX='scCatalogView',LEGACY_DESKTOP='scCatalogView:desktop',LEGACY_MOBILE='scCatalogView:mobile',VIEW_VERSION='v2',VIEW_MODES={phone:['one','two','list'],tablet:['two','three','four','list'],desktop:['three','four','list']},DEFAULT_VIEWS={phone:'one',tablet:'two',desktop:'three'};
function context(){return phone.matches?'phone':tablet.matches?'tablet':'desktop';}
function modes(){return VIEW_MODES[context()];}
function defaultMode(){return DEFAULT_VIEWS[context()];}
function key(){return STORE_PREFIX+':'+VIEW_VERSION+':'+context();}
function legacyKey(){return context()==='desktop'?LEGACY_DESKTOP:LEGACY_MOBILE;}
function load(){var mode=doc.getAttribute('data-sc-catalog-view')||'',prepaintContext=doc.getAttribute("data-sc-catalog-view-context")||'';if(prepaintContext!==context()||modes().indexOf(mode)<0){try{mode=localStorage.getItem(key())||localStorage.getItem(legacyKey())||'';}catch(_){mode='';}}return modes().indexOf(mode)>=0?mode:defaultMode();}
function save(mode){try{localStorage.setItem(key(),mode);}catch(_){} }
function label(mode){return VIEW_LABELS[mode]||VIEW_LABELS.list;}
function apply(root,mode,persist){var allowed=modes(),ctx=context();if(allowed.indexOf(mode)<0)mode=defaultMode();doc.setAttribute('data-sc-catalog-view',mode);doc.setAttribute("data-sc-catalog-view-context",ctx);document.body.setAttribute('data-sc-catalog-view',mode);root.setAttribute('data-sc-view',mode);root.setAttribute("data-sc-view-context",ctx);var button=root.querySelector(".sc-catalog-view-toggle");if(button){button.setAttribute('aria-label',label(mode));button.setAttribute('title',label(mode));}Array.prototype.forEach.call(root.querySelectorAll("[data-sc-view-icon]"),function(icon){icon.hidden=icon.getAttribute('data-sc-view-icon')!==mode;});if(persist)save(mode);if(SC.motion&&SC.motion.refresh)SC.motion.refresh(0);}
function install(root){var button=root&&root.querySelector(".sc-catalog-view-toggle");if(!button)return;var last=context();apply(root,load(),false);button.addEventListener('click',function(){var allowed=modes(),current=doc.getAttribute('data-sc-catalog-view'),index=allowed.indexOf(current);apply(root,allowed[(index+1+allowed.length)%allowed.length],true);});function breakpoint(){var now=context();if(now===last)return;last=now;apply(root,load(),false);}if(phone.addEventListener)phone.addEventListener('change',breakpoint);else phone.addListener(breakpoint);if(tablet.addEventListener)tablet.addEventListener('change',breakpoint);else tablet.addListener(breakpoint);}
C.view={install:install,apply:apply};
})();
