(function(){
'use strict';
var SC=window.SCOverride,CFG=SC&&SC.config,C=SC&&SC.catalogTools;if(!SC||!CFG||SC.__catalogToolsViewBooted)return;SC.__catalogToolsViewBooted=true;
var MODES=['normal','compact','list'],LABELS={normal:'Vista normal. Cambiar vista',compact:'Vista compacta. Cambiar vista',list:'Vista lista. Cambiar vista'},STORE_KEY='scCatalogView:v3',doc=document.documentElement,phone=CFG.queries.phone,tablet=CFG.queries.compactWide,raf=0,mediaListenersInstalled=false;
function context(){return phone.matches?'phone':tablet.matches?'tablet':'desktop';}
function normalize(mode){return MODES.indexOf(mode)>=0?mode:'';}
function legacyMode(mode,ctx){if(mode==='list')return'list';if(ctx==='phone')return mode==='two'?'compact':mode==='one'?'normal':'';if(ctx==='tablet')return mode==='three'||mode==='four'?'compact':mode==='two'?'normal':'';return mode==='four'?'compact':mode==='three'?'normal':'';}
function load(){
  var mode=normalize(doc.getAttribute('data-sc-catalog-view')||''),ctx=context(),legacy='';
  if(mode)return mode;
  try{mode=normalize(localStorage.getItem(STORE_KEY)||'');if(!mode){legacy=localStorage.getItem('scCatalogView:v2:'+ctx)||localStorage.getItem(ctx==='desktop'?'scCatalogView:desktop':'scCatalogView:mobile')||'';mode=legacyMode(legacy,ctx);if(mode){try{localStorage.setItem(STORE_KEY,mode);}catch(_){}}}}catch(_){mode='';}
  return mode||'normal';
}
function save(mode){try{localStorage.setItem(STORE_KEY,mode);}catch(_){} }
function refreshLayout(){
  if(raf)cancelAnimationFrame(raf);
  raf=requestAnimationFrame(function(){raf=requestAnimationFrame(function(){raf=0;if(SC.productCardMotion&&SC.productCardMotion.reflow)SC.productCardMotion.reflow();else if(SC.motion&&SC.motion.refresh)SC.motion.refresh(0);});});
}
function apply(root,mode,persist){
  mode=normalize(mode)||'normal';doc.setAttribute('data-sc-catalog-view',mode);document.body.setAttribute('data-sc-catalog-view',mode);root.setAttribute('data-sc-view',mode);
  var button=root.querySelector('.sc-catalog-view-toggle'),label=LABELS[mode];if(button){button.setAttribute('aria-label',label);button.setAttribute('title',label);}
  Array.prototype.forEach.call(root.querySelectorAll('[data-sc-view-icon]'),function(icon){icon.hidden=icon.getAttribute('data-sc-view-icon')!==mode;});
  if(persist)save(mode);refreshLayout();
}
function install(root){
  var button=root&&root.querySelector('.sc-catalog-view-toggle');if(!button)return;apply(root,load(),false);
  button.addEventListener('click',function(){var current=normalize(doc.getAttribute('data-sc-catalog-view')||'')||'normal',index=MODES.indexOf(current);apply(root,MODES[(index+1)%MODES.length],true);});
  if(!mediaListenersInstalled){mediaListenersInstalled=true;var breakpoint=function(){refreshLayout();};if(phone.addEventListener)phone.addEventListener('change',breakpoint);else phone.addListener(breakpoint);if(tablet.addEventListener)tablet.addEventListener('change',breakpoint);else tablet.addListener(breakpoint);}
}
C.view={install:install,apply:apply,refreshLayout:refreshLayout};
})();
