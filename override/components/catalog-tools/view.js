(function(){
'use strict';
var SC=window.SCOverride,CFG=SC&&SC.config,C=SC&&SC.catalogTools;if(!SC||!CFG||SC.__catalogToolsViewBooted)return;SC.__catalogToolsViewBooted=true;
var MODES=['compact','normal','list'],STORE_KEY='scCatalogView:v3',doc=document.documentElement,phone=CFG.queries.phone,tablet=CFG.queries.compactWide,raf=0,settleTimer=0,cleanup=null;
var ICONS={
  'columns-1':'M120-120v-80h720v80H120Zm0-640v-80h720v80H120Z',
  'columns-2':'M120-120v-720h80v720H120ZM760-120v-720h80v720H760Z',
  'columns-3':'M120-120v-720h80v720H120ZM440-120v-720h80v720H440ZM760-120v-720h80v720H760Z',
  'columns-4':'M80-120v-720h80v720H80ZM320-120v-720h80v720H320ZM560-120v-720h80v720H560ZM800-120v-720h80v720H800Z',
  list:'M120-200v-83.08h83.08V-200H120Zm193.85 0v-83.08H840V-200H313.85ZM120-438.46v-83.08h83.08v83.08H120Zm193.85 0v-83.08H840v83.08H313.85ZM120-676.92V-760h83.08v83.08H120Zm193.85 0v-83.08H840v83.08H313.85Z'
};
function context(){return phone.matches?'phone':tablet.matches?'tablet':'desktop';}
function normalize(mode){return MODES.indexOf(mode)>=0?mode:'';}
function selectedMode(){return normalize(doc.getAttribute('data-sc-catalog-view')||'')||'compact';}
function legacyMode(mode,ctx){if(mode==='list')return'list';if(ctx==='phone')return mode==='two'?'compact':mode==='one'?'normal':'';if(ctx==='tablet')return mode==='three'||mode==='four'?'compact':mode==='two'?'normal':'';return mode==='four'?'compact':mode==='three'?'normal':'';}
function columns(mode){var ctx=context();if(mode==='compact')return ctx==='phone'?2:ctx==='tablet'?3:4;return ctx==='phone'?1:ctx==='tablet'?2:3;}
function effectiveMode(mode){var searching=document.body.classList.contains(CFG.classes.catalogSearching);return searching&&!CFG.queries.desktop.matches?'list':mode;}
function label(mode){var effective=effectiveMode(mode);if(effective==='list')return'Vista lista. Cambiar vista';var count=columns(effective);return'Vista '+(effective==='compact'?'alta densidad':'baja densidad')+': '+count+' '+(count===1?'columna':'columnas')+'. Cambiar vista';}
function iconKey(mode){var effective=effectiveMode(mode);return effective==='list'?'list':'columns-'+columns(effective);}
function load(){
  var mode=normalize(doc.getAttribute('data-sc-catalog-view')||''),ctx=context(),legacy='';
  if(mode)return mode;
  try{mode=normalize(localStorage.getItem(STORE_KEY)||'');if(!mode){legacy=localStorage.getItem('scCatalogView:v2:'+ctx)||localStorage.getItem(ctx==='desktop'?'scCatalogView:desktop':'scCatalogView:mobile')||'';mode=legacyMode(legacy,ctx);if(mode){try{localStorage.setItem(STORE_KEY,mode);}catch(_){}}}}catch(_){mode='';}
  return mode||'compact';
}
function save(mode){try{localStorage.setItem(STORE_KEY,mode);}catch(_){} }
function sync(root,mode){
  var button=root&&root.querySelector('.sc-catalog-view-toggle'),path=button&&button.querySelector('[data-sc-view-icon-path]'),key=iconKey(mode),text=label(mode),previous=path&&path.getAttribute('data-sc-icon-state');
  if(button){button.setAttribute('aria-label',text);button.setAttribute('title',text);}
  if(!path)return;
  if(previous&&previous!==key&&SC.motion&&SC.motion.morphIcon)SC.motion.morphIcon(path,ICONS[key],{duration:.2});else path.setAttribute('d',ICONS[key]);
  path.setAttribute('data-sc-icon-state',key);
}
function captureViewport(){return{x:window.scrollX||window.pageXOffset||0,y:window.scrollY||window.pageYOffset||0};}
function restoreViewport(viewport){
  if(!viewport)return;var x=window.scrollX||window.pageXOffset||0,y=window.scrollY||window.pageYOffset||0;
  if(Math.abs(x-viewport.x)>.5||Math.abs(y-viewport.y)>.5)window.scrollTo(viewport.x,viewport.y);
}
function refreshMotionNow(){
  if(SC.motion&&SC.motion.run)SC.motion.run(function(deps){if(deps&&deps.ScrollTrigger)deps.ScrollTrigger.refresh();});
}
function syncMounted(){var root=document.querySelector('.sc-catalog-tools');if(root)sync(root,selectedMode());}
function refreshLayout(viewport){
  syncMounted();if(raf)cancelAnimationFrame(raf);if(settleTimer){clearTimeout(settleTimer);settleTimer=0;}
  restoreViewport(viewport);
  raf=requestAnimationFrame(function(){
    restoreViewport(viewport);
    raf=requestAnimationFrame(function(){
      raf=0;
      if(SC.productCardContent&&SC.productCardContent.scheduleDescriptionMeasure)SC.productCardContent.scheduleDescriptionMeasure();
      refreshMotionNow();
      restoreViewport(viewport);
      if(viewport)settleTimer=window.setTimeout(function(){settleTimer=0;restoreViewport(viewport);doc.classList.remove('sc-catalog-view-switching');},80);
    });
  });
}
function apply(root,mode,persist){
  mode=normalize(mode)||'compact';var viewport=persist?captureViewport():null;
  if(viewport)doc.classList.add('sc-catalog-view-switching');
  doc.setAttribute('data-sc-catalog-view',mode);document.body.setAttribute('data-sc-catalog-view',mode);root.setAttribute('data-sc-view',mode);sync(root,mode);
  if(persist)save(mode);refreshLayout(viewport);
}
function destroy(){if(raf){cancelAnimationFrame(raf);raf=0;}if(settleTimer){clearTimeout(settleTimer);settleTimer=0;}doc.classList.remove('sc-catalog-view-switching');if(cleanup){var fn=cleanup;cleanup=null;fn();}}
function install(root){
  destroy();var button=root&&root.querySelector('.sc-catalog-view-toggle');if(!button)return function(){};apply(root,load(),false);
  function click(){var current=selectedMode(),index=MODES.indexOf(current);apply(root,MODES[(index+1)%MODES.length],true);}
  function breakpoint(){refreshLayout(null);}
  button.addEventListener('click',click);
  if(phone.addEventListener)phone.addEventListener('change',breakpoint);else phone.addListener(breakpoint);
  if(tablet.addEventListener)tablet.addEventListener('change',breakpoint);else tablet.addListener(breakpoint);
  cleanup=function(){button.removeEventListener('click',click);if(phone.removeEventListener)phone.removeEventListener('change',breakpoint);else phone.removeListener(breakpoint);if(tablet.removeEventListener)tablet.removeEventListener('change',breakpoint);else tablet.removeListener(breakpoint);};
  var ownCleanup=cleanup;return function(){if(cleanup===ownCleanup)destroy();};
}
C.view={install:install,apply:apply,refreshLayout:refreshLayout,sync:syncMounted,destroy:destroy};
})();
