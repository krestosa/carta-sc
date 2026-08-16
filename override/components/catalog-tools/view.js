(function(){
'use strict';
var SC=window.SCOverride,CFG=SC&&SC.config,C=SC&&SC.catalogTools;if(!SC||!CFG||SC.__catalogToolsViewBooted)return;SC.__catalogToolsViewBooted=true;
var MODES=['normal','compact','list'],STORE_KEY='scCatalogView:v3',doc=document.documentElement,phone=CFG.queries.phone,tablet=CFG.queries.compactWide,raf=0,cleanup=null;
function context(){return phone.matches?'phone':tablet.matches?'tablet':'desktop';}
function normalize(mode){return MODES.indexOf(mode)>=0?mode:'';}
function selectedMode(){return normalize(doc.getAttribute('data-sc-catalog-view')||'')||'normal';}
function legacyMode(mode,ctx){if(mode==='list')return'list';if(ctx==='phone')return mode==='two'?'compact':mode==='one'?'normal':'';if(ctx==='tablet')return mode==='three'||mode==='four'?'compact':mode==='two'?'normal':'';return mode==='four'?'compact':mode==='three'?'normal':'';}
function columns(mode){var ctx=context();if(mode==='compact')return ctx==='phone'?2:ctx==='tablet'?3:4;return ctx==='phone'?1:ctx==='tablet'?2:3;}
function effectiveMode(mode){var searching=document.body.classList.contains(CFG.classes.catalogSearching);return searching&&!CFG.queries.desktop.matches?'list':mode;}
function label(mode){var effective=effectiveMode(mode);if(effective==='list')return'Vista lista. Cambiar vista';var count=columns(effective);return'Vista '+(effective==='compact'?'compacta':'normal')+': '+count+' '+(count===1?'columna':'columnas')+'. Cambiar vista';}
function iconKey(mode){var effective=effectiveMode(mode);return effective==='list'?'list':'columns-'+columns(effective);}
function load(){
  var mode=normalize(doc.getAttribute('data-sc-catalog-view')||''),ctx=context(),legacy='';
  if(mode)return mode;
  try{mode=normalize(localStorage.getItem(STORE_KEY)||'');if(!mode){legacy=localStorage.getItem('scCatalogView:v2:'+ctx)||localStorage.getItem(ctx==='desktop'?'scCatalogView:desktop':'scCatalogView:mobile')||'';mode=legacyMode(legacy,ctx);if(mode){try{localStorage.setItem(STORE_KEY,mode);}catch(_){}}}}catch(_){mode='';}
  return mode||'normal';
}
function save(mode){try{localStorage.setItem(STORE_KEY,mode);}catch(_){} }
function sync(root,mode){
  var button=root&&root.querySelector('.sc-catalog-view-toggle'),key=iconKey(mode),text=label(mode);if(button){button.setAttribute('aria-label',text);button.setAttribute('title',text);}
  if(root)Array.prototype.forEach.call(root.querySelectorAll('[data-sc-view-icon]'),function(icon){icon.hidden=icon.getAttribute('data-sc-view-icon')!==key;});
}
function syncMounted(){var root=document.querySelector('.sc-catalog-tools');if(root)sync(root,selectedMode());}
function refreshLayout(){
  syncMounted();if(raf)cancelAnimationFrame(raf);
  raf=requestAnimationFrame(function(){raf=requestAnimationFrame(function(){raf=0;if(SC.productCardMotion&&SC.productCardMotion.reflow)SC.productCardMotion.reflow();else if(SC.motion&&SC.motion.refresh)SC.motion.refresh(0);});});
}
function apply(root,mode,persist){
  mode=normalize(mode)||'normal';doc.setAttribute('data-sc-catalog-view',mode);document.body.setAttribute('data-sc-catalog-view',mode);root.setAttribute('data-sc-view',mode);sync(root,mode);
  if(persist)save(mode);refreshLayout();
}
function destroy(){if(raf){cancelAnimationFrame(raf);raf=0;}if(cleanup){var fn=cleanup;cleanup=null;fn();}}
function install(root){
  destroy();var button=root&&root.querySelector('.sc-catalog-view-toggle');if(!button)return function(){};apply(root,load(),false);
  function click(){var current=selectedMode(),index=MODES.indexOf(current);apply(root,MODES[(index+1)%MODES.length],true);}
  function breakpoint(){refreshLayout();}
  button.addEventListener('click',click);
  if(phone.addEventListener)phone.addEventListener('change',breakpoint);else phone.addListener(breakpoint);
  if(tablet.addEventListener)tablet.addEventListener('change',breakpoint);else tablet.addListener(breakpoint);
  cleanup=function(){button.removeEventListener('click',click);if(phone.removeEventListener)phone.removeEventListener('change',breakpoint);else phone.removeListener(breakpoint);if(tablet.removeEventListener)tablet.removeEventListener('change',breakpoint);else tablet.removeListener(breakpoint);};
  var ownCleanup=cleanup;return function(){if(cleanup===ownCleanup)destroy();};
}
C.view={install:install,apply:apply,refreshLayout:refreshLayout,sync:syncMounted,destroy:destroy};
})();
