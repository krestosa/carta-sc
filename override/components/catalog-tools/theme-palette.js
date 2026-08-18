(function(){
'use strict';
var SC=window.SCOverride,CFG=SC&&SC.config,C=SC&&SC.catalogTools;if(!SC||!CFG||!C||SC.__catalogThemePaletteBooted)return;SC.__catalogThemePaletteBooted=true;
var doc=document.documentElement,V=['--sc-color-ink','--sc-color-heading','--sc-color-copy','--sc-color-muted','--sc-color-trait','--sc-color-surface','--sc-color-surface-raised','--sc-color-surface-transparent','--sc-color-border','--sc-color-border-strong'],deps=null,tween=null,token=0,suspended=[];
function reduce(){return!!(CFG.queries&&CFG.queries.reducedMotion&&CFG.queries.reducedMotion.matches);}
function capture(){var s=getComputedStyle(doc),v={};V.forEach(function(n){v[n]=s.getPropertyValue(n).trim();});return v;}
function clear(){V.forEach(function(n){doc.style.removeProperty(n);});}
function apply(v){V.forEach(function(n){if(v[n])doc.style.setProperty(n,v[n]);});}
function canSuspend(){try{return!!(document.body&&window.CSS&&CSS.supports&&CSS.supports('content-visibility','auto'));}catch(_){return false;}}
function restoreRendering(){var list=suspended;suspended=[];list.forEach(function(item){var style=item.node&&item.node.style;if(!style)return;if(item.visibility.value)style.setProperty('content-visibility',item.visibility.value,item.visibility.priority);else style.removeProperty('content-visibility');if(item.intrinsic.value)style.setProperty('contain-intrinsic-size',item.intrinsic.value,item.intrinsic.priority);else style.removeProperty('contain-intrinsic-size');});}
function suspendOffscreen(){
  restoreRendering();if(!canSuspend())return;
  var h=window.innerHeight||doc.clientHeight||0,pad=96,reads=[];
  Array.prototype.forEach.call(document.querySelectorAll('body.sushiShop .listadoShop:not(.sc-catalog-search-grid)'),function(node){
    if(node.hidden||!node.getClientRects().length)return;var rect=node.getBoundingClientRect();if(rect.width<=0||rect.height<=0||(rect.bottom>=-pad&&rect.top<=h+pad))return;var style=node.style;
    reads.push({node:node,width:Math.max(1,Math.ceil(rect.width)),height:Math.max(1,Math.ceil(rect.height)),visibility:{value:style.getPropertyValue('content-visibility'),priority:style.getPropertyPriority('content-visibility')},intrinsic:{value:style.getPropertyValue('contain-intrinsic-size'),priority:style.getPropertyPriority('contain-intrinsic-size')}});
  });
  reads.forEach(function(item){item.node.style.setProperty('contain-intrinsic-size','auto '+item.width+'px auto '+item.height+'px');item.node.style.setProperty('content-visibility','auto');});suspended=reads;
}
function kill(){token++;if(tween){try{tween.kill();}catch(_){}tween=null;}restoreRendering();}
function animate(before,commit,prepared){
  var g=deps&&deps.gsap;
  if(!g){kill();clear();commit();return null;}
  var from=capture();kill();clear();commit();var to=capture(),id=token,duration=reduce()?.18:.56,
      vars={duration:duration,ease:reduce()?'power1.out':'sine.inOut',overwrite:'auto',onComplete:function(){if(id!==token)return;tween=null;clear();restoreRendering();}},
      context={from:from,to:to,duration:duration,token:id};
  apply(from);suspendOffscreen();
  if(typeof prepared==='function')prepared(context);
  V.forEach(function(n){vars[n]=to[n];});
  tween=g.to(doc,vars);
  return context;
}
if(SC.motion&&SC.motion.whenLoaded)SC.motion.whenLoaded(function(d){deps=d;});else if(SC.motion&&SC.motion.whenReady)SC.motion.whenReady(function(d){deps=d;});
C.themePalette={animate:animate,kill:function(){kill();clear();}};
})();