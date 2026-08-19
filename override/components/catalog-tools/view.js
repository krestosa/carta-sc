(function(){
'use strict';
var SC=window.SCOverride,CFG=SC&&SC.config,C=SC&&SC.catalogTools;
if(!SC||!CFG||!C||SC.__catalogToolsViewBooted)return;SC.__catalogToolsViewBooted=true;

var MODES=['compact','list'],STORE_KEY='scCatalogView:v3',doc=document.documentElement,phone=CFG.queries.phone,tablet=CFG.queries.compactWide,raf=0,cleanup=null;
var SHAPE_ATTRS=['x','y','width','height','rx','ry'];

function context(){return phone.matches?'phone':tablet.matches?'tablet':'desktop';}
function normalize(mode){if(mode==='normal')return'compact';return MODES.indexOf(mode)>=0?mode:'';}
function selectedMode(){return normalize(doc.getAttribute('data-sc-catalog-view')||'')||'compact';}
function legacyMode(mode){return mode==='list'?'list':mode?'compact':'';}
function columns(){var ctx=context();return ctx==='phone'?2:ctx==='tablet'?3:4;}
function effectiveMode(mode){return normalize(mode)||'compact';}
function label(mode){var effective=effectiveMode(mode),count;if(effective==='list')return'Vista lista. Cambiar a grilla de alta densidad';count=columns();return'Vista grilla de alta densidad: '+count+' '+(count===1?'columna':'columnas')+'. Cambiar a vista lista';}
function iconKey(mode){return effectiveMode(mode)==='list'?'list':'grid';}
function load(){var mode=normalize(doc.getAttribute('data-sc-catalog-view')||''),ctx=context(),legacy='';if(mode)return mode;try{mode=normalize(localStorage.getItem(STORE_KEY)||'');if(!mode){legacy=localStorage.getItem('scCatalogView:v2:'+ctx)||localStorage.getItem(ctx==='desktop'?'scCatalogView:desktop':'scCatalogView:mobile')||'';mode=legacyMode(legacy);if(mode)try{localStorage.setItem(STORE_KEY,mode);}catch(_){}}}catch(_){mode='';}return mode||'compact';}
function save(mode){try{localStorage.setItem(STORE_KEY,mode);}catch(_){} }

function liveShapes(host){return host?Array.prototype.slice.call(host.querySelectorAll('[data-sc-view-shape]')):[];}
function setIcon(host,key){if(!host)return;liveShapes(host).forEach(function(shape,index){var target=host.querySelector('[data-sc-view-target="'+key+'-'+index+'"]');if(!target)return;SHAPE_ATTRS.forEach(function(attr){var value=target.getAttribute(attr);if(value===null)shape.removeAttribute(attr);else shape.setAttribute(attr,value);});});host.setAttribute('data-sc-icon-state',key);host.style.setProperty('display','block','important');host.style.setProperty('visibility','visible','important');host.style.setProperty('color','var(--sc-color-ink,#0a0a0a)','important');host.style.setProperty('fill','var(--sc-color-ink,#0a0a0a)','important');}
function syncMeta(root,mode){var button=root&&root.querySelector('.sc-catalog-view-toggle'),text=label(mode);if(button){button.setAttribute('aria-label',text);button.setAttribute('title',text);button.style.setProperty('visibility','visible','important');button.style.setProperty('color','var(--sc-color-ink,#0a0a0a)','important');}}
function sync(root,mode){var button=root&&root.querySelector('.sc-catalog-view-toggle'),host=button&&button.querySelector('[data-sc-view-icon]');syncMeta(root,mode);setIcon(host,iconKey(mode));}

function syncMounted(){var root=document.querySelector('.sc-catalog-tools');if(root)sync(root,selectedMode());}
function refreshLayout(){syncMounted();if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(function(){raf=requestAnimationFrame(function(){raf=0;if(SC.productCardContent&&SC.productCardContent.scheduleDescriptionMeasure)SC.productCardContent.scheduleDescriptionMeasure();});});}
function writeMode(root,mode,persist){doc.setAttribute('data-sc-catalog-view',mode);document.body.setAttribute('data-sc-catalog-view',mode);root.setAttribute('data-sc-view',mode);if(persist)save(mode);}

function apply(root,mode,persist){mode=normalize(mode)||'compact';writeMode(root,mode,persist);sync(root,mode);refreshLayout();}
function destroy(){if(raf){cancelAnimationFrame(raf);raf=0;}doc.classList.remove('sc-catalog-view-switching');if(cleanup){var fn=cleanup;cleanup=null;fn();}}
function install(root){
  destroy();var button=root&&root.querySelector('.sc-catalog-view-toggle'),host=button&&button.querySelector('[data-sc-view-icon]');if(!button||!host)return function(){};
  apply(root,load(),false);
  function click(){apply(root,selectedMode()==='compact'?'list':'compact',true);}
  function breakpoint(){refreshLayout();}
  button.addEventListener('click',click);
  if(phone.addEventListener)phone.addEventListener('change',breakpoint);else phone.addListener(breakpoint);
  if(tablet.addEventListener)tablet.addEventListener('change',breakpoint);else tablet.addListener(breakpoint);
  cleanup=function(){button.removeEventListener('click',click);if(phone.removeEventListener)phone.removeEventListener('change',breakpoint);else phone.removeListener(breakpoint);if(tablet.removeEventListener)tablet.removeEventListener('change',breakpoint);else tablet.removeListener(breakpoint);};
  var ownCleanup=cleanup;return function(){if(cleanup===ownCleanup)destroy();};
}
C.view={install:install,apply:apply,refreshLayout:refreshLayout,sync:syncMounted,destroy:destroy};
})();