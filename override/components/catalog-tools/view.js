(function(){
'use strict';
var SC=window.SCOverride,CFG=SC&&SC.config,C=SC&&SC.catalogTools;if(!SC||!CFG||SC.__catalogToolsViewBooted)return;SC.__catalogToolsViewBooted=true;
var MODES=['compact','list'],STORE_KEY='scCatalogView:v3',doc=document.documentElement,phone=CFG.queries.phone,tablet=CFG.queries.compactWide,raf=0,settleTimer=0,cleanup=null;
var ICONS={
  grid:[[3,3,8,4],[13,3,8,4],[3,10,8,4],[13,10,8,4],[3,17,8,4],[13,17,8,4]],
  list:[[3,3.25,3.5,3.5],[8.5,3.25,12.5,3.5],[3,10.25,3.5,3.5],[8.5,10.25,12.5,3.5],[3,17.25,3.5,3.5],[8.5,17.25,12.5,3.5]]
};
function context(){return phone.matches?'phone':tablet.matches?'tablet':'desktop';}
function normalize(mode){if(mode==='normal')return'compact';return MODES.indexOf(mode)>=0?mode:'';}
function selectedMode(){return normalize(doc.getAttribute('data-sc-catalog-view')||'')||'compact';}
function legacyMode(mode,ctx){if(mode==='list')return'list';if(ctx==='phone')return mode==='two'||mode==='one'?'compact':'';if(ctx==='tablet')return mode==='three'||mode==='four'||mode==='two'?'compact':'';return mode==='four'||mode==='three'?'compact':'';}
function columns(mode){var ctx=context();if(mode==='compact')return ctx==='phone'?2:ctx==='tablet'?3:4;return ctx==='phone'?1:ctx==='tablet'?2:3;}
function effectiveMode(mode){var searching=document.body.classList.contains(CFG.classes.catalogSearching);return searching&&!CFG.queries.desktop.matches?'list':mode;}
function label(mode){var effective=effectiveMode(mode);if(effective==='list')return'Vista lista. Cambiar a vista grilla';var count=columns(effective);return'Vista grilla: '+count+' '+(count===1?'columna':'columnas')+'. Cambiar a vista lista';}
function iconKey(mode){return effectiveMode(mode)==='list'?'list':'grid';}
function oppositeKey(key){return key==='list'?'grid':'list';}
function load(){
  var mode=normalize(doc.getAttribute('data-sc-catalog-view')||''),ctx=context(),legacy='';if(mode)return mode;
  try{mode=normalize(localStorage.getItem(STORE_KEY)||'');if(!mode){legacy=localStorage.getItem('scCatalogView:v2:'+ctx)||localStorage.getItem(ctx==='desktop'?'scCatalogView:desktop':'scCatalogView:mobile')||'';mode=legacyMode(legacy,ctx);if(mode){try{localStorage.setItem(STORE_KEY,mode);}catch(_){}}}}catch(_){mode='';}return mode||'compact';
}
function save(mode){try{localStorage.setItem(STORE_KEY,mode);}catch(_){} }
function reducedMotion(){return!!(CFG.queries&&CFG.queries.reducedMotion&&CFG.queries.reducedMotion.matches);}
function cells(host){return host?Array.prototype.slice.call(host.querySelectorAll('[data-sc-view-cell]')):[];}
function number(value){var parsed=parseFloat(value);return Number.isFinite(parsed)?parsed:0;}
function geometryOf(cell){return[number(cell.getAttribute('x')),number(cell.getAttribute('y')),number(cell.getAttribute('width')),number(cell.getAttribute('height'))];}
function writeGeometry(cell,geometry){cell.setAttribute('x',Math.round(geometry[0]*1000)/1000);cell.setAttribute('y',Math.round(geometry[1]*1000)/1000);cell.setAttribute('width',Math.round(geometry[2]*1000)/1000);cell.setAttribute('height',Math.round(geometry[3]*1000)/1000);}
function setGeometry(host,target){var nodes=cells(host);if(!target||nodes.length!==target.length)return;nodes.forEach(function(cell,index){writeGeometry(cell,target[index]);});}
function setViewIcon(host,key){setGeometry(host,ICONS[key]);}
function clearViewIconMotion(host){var state=host&&host.__scViewIconMotion;if(!state)return;if(state.raf)cancelAnimationFrame(state.raf);host.__scViewIconMotion=null;}
function ease(t){return 1-Math.pow(1-t,3);}
function smooth(t){return t*t*(3-2*t);}
function mix(a,b,t){return a+(b-a)*t;}
function mixGeometry(from,to,amount){return from.map(function(cell,index){var target=to[index];return[cell[0]+(target[0]-cell[0])*amount,cell[1]+(target[1]-cell[1])*amount,cell[2]+(target[2]-cell[2])*amount,cell[3]+(target[3]-cell[3])*amount];});}
function animateGeometry(host,target,duration){
  var nodes=cells(host);if(!host||!target||nodes.length!==target.length)return;clearViewIconMotion(host);if(reducedMotion()){setGeometry(host,target);return;}
  var start=nodes.map(geometryOf),started=performance.now(),state={raf:0};host.__scViewIconMotion=state;
  function frame(now){
    if(host.__scViewIconMotion!==state)return;var progress=Math.min(1,(now-started)/duration),amount=ease(progress);
    nodes.forEach(function(cell,index){var from=start[index],to=target[index];writeGeometry(cell,[from[0]+(to[0]-from[0])*amount,from[1]+(to[1]-from[1])*amount,from[2]+(to[2]-from[2])*amount,from[3]+(to[3]-from[3])*amount]);});
    if(progress<1){state.raf=requestAnimationFrame(frame);return;}setGeometry(host,target);host.__scViewIconMotion=null;
  }
  state.raf=requestAnimationFrame(frame);
}
function animateViewIcon(host,key){animateGeometry(host,ICONS[key],400);}
function previewAmount(t){return t<=.48?mix(0,.24,smooth(t/.48)):mix(.24,0,smooth((t-.48)/.52));}
function hoverPreview(host){
  if(!host||reducedMotion())return;var nodes=cells(host);if(!nodes.length)return;clearViewIconMotion(host);
  var key=iconKey(selectedMode()),base=ICONS[key],target=ICONS[oppositeKey(key)],started=performance.now(),duration=430,state={raf:0};host.__scViewIconMotion=state;
  function frame(now){
    if(host.__scViewIconMotion!==state)return;var progress=Math.min(1,(now-started)/duration),geometry=mixGeometry(base,target,previewAmount(progress));nodes.forEach(function(cell,index){writeGeometry(cell,geometry[index]);});
    if(progress<1){state.raf=requestAnimationFrame(frame);return;}setGeometry(host,base);host.__scViewIconMotion=null;
  }
  state.raf=requestAnimationFrame(frame);
}
function hoverRestore(host){animateGeometry(host,ICONS[iconKey(selectedMode())],180);}
function sync(root,mode,animate){
  var button=root&&root.querySelector('.sc-catalog-view-toggle'),host=button&&button.querySelector('[data-sc-view-icon]'),key=iconKey(mode),text=label(mode),previous=host&&host.getAttribute('data-sc-icon-state');
  if(button){button.setAttribute('aria-label',text);button.setAttribute('title',text);}if(!host)return;
  if(previous===key){if(!host.__scViewIconMotion)setViewIcon(host,key);return;}if(animate!==false&&previous)animateViewIcon(host,key);else{clearViewIconMotion(host);setViewIcon(host,key);}host.setAttribute('data-sc-icon-state',key);
}
function viewportAnchor(){
  var nodes=document.querySelectorAll('.listadoShop .titleShopSeccion,.listadoShop .subTitleShopSeccion,.listadoShop .productoShop'),height=window.innerHeight||doc.clientHeight||0,probe=Math.min(Math.max(height*.28,110),240),best=null,bestDistance=Infinity;
  for(var i=0;i<nodes.length;i++){
    var node=nodes[i],rect=node.getBoundingClientRect();if(rect.bottom<=0||rect.top>=height)continue;
    var distance=rect.top<=probe&&rect.bottom>=probe?0:Math.abs(rect.top-probe);
    if(distance<bestDistance){best=node;bestDistance=distance;if(distance===0&&node.matches('.titleShopSeccion,.subTitleShopSeccion'))break;}
  }
  return best;
}
function captureViewport(){
  var x=window.scrollX||window.pageXOffset||0,y=window.scrollY||window.pageYOffset||0,height=window.innerHeight||doc.clientHeight||0,tools=document.querySelector('.sc-catalog-tools'),toolsRect=tools&&tools.getBoundingClientRect();
  if(y<=1||(toolsRect&&toolsRect.bottom>0&&toolsRect.top<height))return{x:x,y:y,anchor:null,anchorTop:null};
  var anchor=viewportAnchor(),rect=anchor&&anchor.getBoundingClientRect();return{x:x,y:y,anchor:anchor,anchorTop:rect?rect.top:null};
}
function restoreViewport(viewport){
  if(!viewport)return;var currentX=window.scrollX||window.pageXOffset||0,currentY=window.scrollY||window.pageYOffset||0,anchor=viewport.anchor;
  if(anchor&&doc.contains(anchor)&&viewport.anchorTop!==null){
    var delta=anchor.getBoundingClientRect().top-viewport.anchorTop;if(Math.abs(delta)>.5)window.scrollBy(0,delta);
    currentX=window.scrollX||window.pageXOffset||0;if(Math.abs(currentX-viewport.x)>.5)window.scrollTo(viewport.x,window.scrollY||window.pageYOffset||0);return;
  }
  if(Math.abs(currentX-viewport.x)>.5||Math.abs(currentY-viewport.y)>.5)window.scrollTo(viewport.x,viewport.y);
}
function refreshMotionNow(){if(SC.motion&&SC.motion.run)SC.motion.run(function(deps){if(deps&&deps.ScrollTrigger)deps.ScrollTrigger.refresh();});}
function syncMounted(){var root=document.querySelector('.sc-catalog-tools');if(root)sync(root,selectedMode(),false);}
function refreshLayout(viewport){
  syncMounted();if(raf)cancelAnimationFrame(raf);if(settleTimer){clearTimeout(settleTimer);settleTimer=0;}restoreViewport(viewport);
  raf=requestAnimationFrame(function(){restoreViewport(viewport);raf=requestAnimationFrame(function(){raf=0;if(SC.productCardContent&&SC.productCardContent.scheduleDescriptionMeasure)SC.productCardContent.scheduleDescriptionMeasure();refreshMotionNow();restoreViewport(viewport);if(viewport)settleTimer=window.setTimeout(function(){settleTimer=0;restoreViewport(viewport);doc.classList.remove('sc-catalog-view-switching');},80);});});
}
function apply(root,mode,persist){mode=normalize(mode)||'compact';var viewport=persist?captureViewport():null;if(viewport)doc.classList.add('sc-catalog-view-switching');doc.setAttribute('data-sc-catalog-view',mode);document.body.setAttribute('data-sc-catalog-view',mode);root.setAttribute('data-sc-view',mode);sync(root,mode,persist);if(persist)save(mode);refreshLayout(viewport);}
function destroy(){var host=document.querySelector('.sc-catalog-view-toggle [data-sc-view-icon]');if(host)clearViewIconMotion(host);if(raf){cancelAnimationFrame(raf);raf=0;}if(settleTimer){clearTimeout(settleTimer);settleTimer=0;}doc.classList.remove('sc-catalog-view-switching');if(cleanup){var fn=cleanup;cleanup=null;fn();}}
function install(root){
  destroy();var button=root&&root.querySelector('.sc-catalog-view-toggle'),host=button&&button.querySelector('[data-sc-view-icon]');if(!button||!host)return function(){};apply(root,load(),false);
  function click(){var current=selectedMode(),index=MODES.indexOf(current);apply(root,MODES[(index+1)%MODES.length],true);}
  function enter(event){if(event.pointerType==='touch')return;hoverPreview(host);}function leave(event){if(event.pointerType==='touch')return;hoverRestore(host);}function breakpoint(){refreshLayout(null);}
  button.addEventListener('click',click);button.addEventListener('pointerenter',enter);button.addEventListener('pointerleave',leave);
  if(phone.addEventListener)phone.addEventListener('change',breakpoint);else phone.addListener(breakpoint);if(tablet.addEventListener)tablet.addEventListener('change',breakpoint);else tablet.addListener(breakpoint);
  cleanup=function(){button.removeEventListener('click',click);button.removeEventListener('pointerenter',enter);button.removeEventListener('pointerleave',leave);if(phone.removeEventListener)phone.removeEventListener('change',breakpoint);else phone.removeListener(breakpoint);if(tablet.removeEventListener)tablet.removeEventListener('change',breakpoint);else tablet.removeListener(breakpoint);};
  var ownCleanup=cleanup;return function(){if(cleanup===ownCleanup)destroy();};
}
C.view={install:install,apply:apply,refreshLayout:refreshLayout,sync:syncMounted,destroy:destroy};
})();
