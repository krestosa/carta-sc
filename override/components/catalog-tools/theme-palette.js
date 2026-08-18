(function(){
'use strict';
var SC=window.SCOverride,CFG=SC&&SC.config,C=SC&&SC.catalogTools;if(!SC||!CFG||!C||SC.__catalogThemePaletteBooted)return;SC.__catalogThemePaletteBooted=true;
var doc=document.documentElement,V=['--sc-color-ink','--sc-color-heading','--sc-color-copy','--sc-color-muted','--sc-color-trait','--sc-color-surface','--sc-color-surface-raised','--sc-color-surface-transparent','--sc-color-border','--sc-color-border-strong'],deps=null,tween=null,token=0,suspended=[];
var visibilityObserver=null,visibilityCache=new WeakMap(),tracked=[],trackedSet=new WeakSet(),prepareScheduled=false;
function reduce(){return!!(CFG.queries&&CFG.queries.reducedMotion&&CFG.queries.reducedMotion.matches);}
function capture(){var s=getComputedStyle(doc),v={};V.forEach(function(n){v[n]=s.getPropertyValue(n).trim();});return v;}
function clear(){V.forEach(function(n){doc.style.removeProperty(n);});}
function apply(v){V.forEach(function(n){if(v[n])doc.style.setProperty(n,v[n]);});}
function canSuspend(){try{return!!(document.body&&window.CSS&&CSS.supports&&CSS.supports('content-visibility','auto'));}catch(_){return false;}}
function restoreRendering(){var list=suspended;suspended=[];list.forEach(function(item){var style=item.node&&item.node.style;if(!style)return;if(item.visibility.value)style.setProperty('content-visibility',item.visibility.value,item.visibility.priority);else style.removeProperty('content-visibility');if(item.intrinsic.value)style.setProperty('contain-intrinsic-size',item.intrinsic.value,item.intrinsic.priority);else style.removeProperty('contain-intrinsic-size');});}
function observeEntry(entry){var node=entry.target,rect=entry.boundingClientRect,state=visibilityCache.get(node)||{};state.outside=!entry.isIntersecting;state.width=Math.max(1,Math.ceil(rect.width||0));state.height=Math.max(1,Math.ceil(rect.height||0));visibilityCache.set(node,state);}
function flushVisibilityRecords(){if(!visibilityObserver||!visibilityObserver.takeRecords)return;visibilityObserver.takeRecords().forEach(observeEntry);}
function ensureVisibilityObserver(){
  if(visibilityObserver||!canSuspend()||!window.IntersectionObserver)return!!visibilityObserver;
  visibilityObserver=new IntersectionObserver(function(entries){entries.forEach(observeEntry);},{root:null,rootMargin:'96px 0px 96px 0px',threshold:0});return true;
}
function track(node){if(!node||trackedSet.has(node)||!ensureVisibilityObserver())return;trackedSet.add(node);tracked.push(node);visibilityCache.set(node,{outside:false,width:0,height:0});visibilityObserver.observe(node);}
function prepareVisibilityCache(){
  prepareScheduled=false;if(!ensureVisibilityObserver()||!document.body)return;
  Array.prototype.forEach.call(document.querySelectorAll('body.sushiShop .listadoShop:not(.sc-catalog-search-grid),body.sushiShop .listadoShop:not(.sc-catalog-search-grid) .productoShop:not([hidden])'),track);
  if(tracked.length>256)tracked=tracked.filter(function(node){if(document.documentElement.contains(node))return true;visibilityObserver.unobserve(node);return false;});
}
function scheduleVisibilityCache(){
  if(prepareScheduled)return;prepareScheduled=true;
  var run=prepareVisibilityCache;
  if(window.requestIdleCallback)window.requestIdleCallback(run,{timeout:250});else requestAnimationFrame(run);
}
function remember(node,state,reads){var style=node.style;reads.push({node:node,width:state.width,height:state.height,visibility:{value:style.getPropertyValue('content-visibility'),priority:style.getPropertyPriority('content-visibility')},intrinsic:{value:style.getPropertyValue('contain-intrinsic-size'),priority:style.getPropertyPriority('contain-intrinsic-size')}});}
function suspendOffscreen(){
  restoreRendering();if(!canSuspend()||!visibilityObserver)return;flushVisibilityRecords();var reads=[];
  tracked.forEach(function(node){var state=visibilityCache.get(node);if(!state||!state.outside||!state.width||!state.height||node.hidden||!document.documentElement.contains(node))return;remember(node,state,reads);});
  reads.forEach(function(item){item.node.style.setProperty('contain-intrinsic-size','auto '+item.width+'px auto '+item.height+'px');item.node.style.setProperty('content-visibility','auto');});suspended=reads;
}
function kill(){token++;if(tween){try{tween.kill();}catch(_){}tween=null;}restoreRendering();scheduleVisibilityCache();}
function animate(before,commit,prepared){
  var g=deps&&deps.gsap;
  if(!g){kill();clear();commit();return null;}
  var from=capture();kill();clear();commit();var to=capture(),id=token,duration=reduce()?.18:.56,
      vars={duration:duration,ease:reduce()?'power1.out':'sine.inOut',overwrite:'auto',onComplete:function(){if(id!==token)return;tween=null;clear();restoreRendering();scheduleVisibilityCache();}},
      context={from:from,to:to,duration:duration,token:id};
  apply(from);suspendOffscreen();
  if(typeof prepared==='function')prepared(context);
  V.forEach(function(n){vars[n]=to[n];});
  tween=g.to(doc,vars);
  return context;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scheduleVisibilityCache,{once:true});else scheduleVisibilityCache();
if(SC.motion&&SC.motion.whenLoaded)SC.motion.whenLoaded(function(d){deps=d;scheduleVisibilityCache();});else if(SC.motion&&SC.motion.whenReady)SC.motion.whenReady(function(d){deps=d;scheduleVisibilityCache();});
C.themePalette={animate:animate,kill:function(){kill();clear();}};
})();
