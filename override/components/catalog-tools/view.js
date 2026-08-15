(function(){
'use strict';
var SC=window.SCOverride;if(!SC||SC.__catalogToolsViewBooted)return;SC.__catalogToolsViewBooted=true;
var C=SC.catalogTools=SC.catalogTools||{},desktop=matchMedia('(min-width: 993px)'),phone=matchMedia('(max-width: 640px)');
function context(){return desktop.matches?'desktop':'mobile';}
function modes(){return desktop.matches?['three','two','list']:['one','two','list'];}
function defaultMode(){return desktop.matches?'three':phone.matches?'one':'two';}
function key(){return 'scCatalogView:'+context();}
function load(){var mode='';try{mode=localStorage.getItem(key())||'';}catch(_){}return modes().indexOf(mode)>=0?mode:defaultMode();}
function save(mode){try{localStorage.setItem(key(),mode);}catch(_){}}
function label(mode){if(mode==='one')return 'Vista: una columna. Cambiar vista';if(mode==='two')return 'Vista: dos columnas. Cambiar vista';if(mode==='three')return 'Vista: tres columnas. Cambiar vista';return 'Vista: lista. Cambiar vista';}
function apply(root,mode,persist){var allowed=modes();if(allowed.indexOf(mode)<0)mode=defaultMode();document.body.setAttribute('data-sc-catalog-view',mode);root.setAttribute('data-sc-view',mode);var button=root.querySelector('.sc-catalog-view-toggle');if(button){button.setAttribute('aria-label',label(mode));button.setAttribute('title',label(mode));}Array.prototype.forEach.call(root.querySelectorAll('[data-sc-view-icon]'),function(icon){icon.hidden=icon.getAttribute('data-sc-view-icon')!==mode;});if(persist)save(mode);if(SC.motion&&SC.motion.refresh)SC.motion.refresh(0);}
function install(root){var button=root&&root.querySelector('.sc-catalog-view-toggle');if(!button)return;var lastDesktop=desktop.matches,lastPhone=phone.matches;apply(root,load(),false);button.addEventListener('click',function(){var allowed=modes(),current=document.body.getAttribute('data-sc-catalog-view'),index=allowed.indexOf(current);apply(root,allowed[(index+1+allowed.length)%allowed.length],true);});function breakpoint(){if(desktop.matches===lastDesktop&&phone.matches===lastPhone)return;lastDesktop=desktop.matches;lastPhone=phone.matches;apply(root,load(),false);}if(desktop.addEventListener)desktop.addEventListener('change',breakpoint);else desktop.addListener(breakpoint);if(phone.addEventListener)phone.addEventListener('change',breakpoint);else phone.addListener(breakpoint);}
C.view={install:install,apply:apply};
})();
