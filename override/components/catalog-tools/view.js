(function(){
'use strict';
var SC=window.SCOverride;if(!SC||SC.__catalogToolsViewBooted)return;SC.__catalogToolsViewBooted=true;
var C=SC.catalogTools=SC.catalogTools||{},doc=document.documentElement,phone=matchMedia('(max-width: 640px)'),tablet=matchMedia('(min-width: 641px) and (max-width: 992px)');
function context(){return phone.matches?'phone':tablet.matches?'tablet':'desktop';}
function modes(){var mode=context();return mode==='phone'?['one','two','list']:mode==='tablet'?['two','three','four','list']:['three','four','list'];}
function defaultMode(){var mode=context();return mode==='phone'?'one':mode==='tablet'?'two':'three';}
function key(){return 'scCatalogView:v2:'+context();}
function legacyKey(){return context()==='desktop'?'scCatalogView:desktop':'scCatalogView:mobile';}
function load(){var mode=doc.getAttribute('data-sc-catalog-view')||'',prepaintContext=doc.getAttribute('data-sc-catalog-view-context')||'';if(prepaintContext!==context()||modes().indexOf(mode)<0){try{mode=localStorage.getItem(key())||localStorage.getItem(legacyKey())||'';}catch(_){mode='';}}return modes().indexOf(mode)>=0?mode:defaultMode();}
function save(mode){try{localStorage.setItem(key(),mode);}catch(_){}}
function label(mode){if(mode==='one')return 'Vista: una columna. Cambiar vista';if(mode==='two')return 'Vista: dos columnas. Cambiar vista';if(mode==='three')return 'Vista: tres columnas. Cambiar vista';if(mode==='four')return 'Vista: cuatro columnas. Cambiar vista';return 'Vista: lista. Cambiar vista';}
function apply(root,mode,persist){var allowed=modes(),ctx=context();if(allowed.indexOf(mode)<0)mode=defaultMode();doc.setAttribute('data-sc-catalog-view',mode);doc.setAttribute('data-sc-catalog-view-context',ctx);document.body.setAttribute('data-sc-catalog-view',mode);root.setAttribute('data-sc-view',mode);root.setAttribute('data-sc-view-context',ctx);var button=root.querySelector('.sc-catalog-view-toggle');if(button){button.setAttribute('aria-label',label(mode));button.setAttribute('title',label(mode));}Array.prototype.forEach.call(root.querySelectorAll('[data-sc-view-icon]'),function(icon){icon.hidden=icon.getAttribute('data-sc-view-icon')!==mode;});if(persist)save(mode);if(SC.motion&&SC.motion.refresh)SC.motion.refresh(0);}
function install(root){var button=root&&root.querySelector('.sc-catalog-view-toggle');if(!button)return;var last=context();apply(root,load(),false);button.addEventListener('click',function(){var allowed=modes(),current=doc.getAttribute('data-sc-catalog-view'),index=allowed.indexOf(current);apply(root,allowed[(index+1+allowed.length)%allowed.length],true);});function breakpoint(){var now=context();if(now===last)return;last=now;apply(root,load(),false);}if(phone.addEventListener)phone.addEventListener('change',breakpoint);else phone.addListener(breakpoint);if(tablet.addEventListener)tablet.addEventListener('change',breakpoint);else tablet.addListener(breakpoint);}
C.view={install:install,apply:apply};
})();
