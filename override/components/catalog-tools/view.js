(function(){
'use strict';
var SC=window.SCOverride,CFG=SC&&SC.config,C=SC&&SC.catalogTools;if(!SC||!CFG||SC.__catalogToolsViewBooted)return;SC.__catalogToolsViewBooted=true;
var MODES=['normal','compact','list'],STORE_KEY='scCatalogView:v3',doc=document.documentElement,phone=CFG.queries.phone,tablet=CFG.queries.compactWide,raf=0,cleanup=null;
var ICONS={
  'columns-1':'M19,13H5c-1.1,0-2,0.9-2,2v4c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2v-4C21,13.9,20.1,13,19,13z M19,3H5C3.9,3,3,3.9,3,5v4c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3z',
  'columns-2':'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  'columns-3':'M14.67,5v6.5H9.33V5H14.67z M15.67,11.5H21V5h-5.33V11.5z M14.67,19v-6.5H9.33V19H14.67z M15.67,12.5V19H21v-6.5H15.67z M8.33,12.5H3V19h5.33V12.5z M8.33,11.5V5H3v6.5H8.33z',
  'columns-4':'M4,18h2.5v-2.5H4V18z M4,13.25h2.5v-2.5H4V13.25z M4,8.5h2.5V6H4V8.5z M17.5,6v2.5H20V6H17.5z M13,8.5h2.5V6H13V8.5z M17.5,18H20v-2.5h-2.5V18z M17.5,13.25H20v-2.5h-2.5V13.25z M8.5,18H11v-2.5H8.5V18z M13,18h2.5v-2.5H13V18z M8.5,8.5H11V6H8.5V8.5z M13,13.25h2.5v-2.5H13V13.25z M8.5,13.25H11v-2.5H8.5V13.25z',
  list:'M3,14h4v-4H3V14z M3,19h4v-4H3V19z M3,9h4V5H3V9z M8,14h13v-4H8V14z M8,19h13v-4H8V19z M8,5v4h13V5H8z'
};
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
  var button=root&&root.querySelector('.sc-catalog-view-toggle'),path=button&&button.querySelector('[data-sc-view-icon-path]'),key=iconKey(mode),text=label(mode),previous=path&&path.getAttribute('data-sc-icon-state');
  if(button){button.setAttribute('aria-label',text);button.setAttribute('title',text);}
  if(!path)return;
  if(previous&&previous!==key&&SC.motion&&SC.motion.morphIcon)SC.motion.morphIcon(path,ICONS[key],{duration:.3});else path.setAttribute('d',ICONS[key]);
  path.setAttribute('data-sc-icon-state',key);
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
