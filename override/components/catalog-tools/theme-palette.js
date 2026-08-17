(function(){
'use strict';
var SC=window.SCOverride,CFG=SC&&SC.config,C=SC&&SC.catalogTools;if(!SC||!CFG||!C||SC.__catalogThemePaletteBooted)return;SC.__catalogThemePaletteBooted=true;
var doc=document.documentElement,V=['--sc-color-ink','--sc-color-heading','--sc-color-copy','--sc-color-muted','--sc-color-trait','--sc-color-surface','--sc-color-surface-raised','--sc-color-surface-transparent','--sc-color-border','--sc-color-border-strong'],deps=null,tween=null,token=0;
function reduce(){return!!(CFG.queries&&CFG.queries.reducedMotion&&CFG.queries.reducedMotion.matches);}
function capture(){var s=getComputedStyle(doc),v={};V.forEach(function(n){v[n]=s.getPropertyValue(n).trim();});return v;}
function clear(){V.forEach(function(n){doc.style.removeProperty(n);});}
function apply(v){V.forEach(function(n){if(v[n])doc.style.setProperty(n,v[n]);});}
function kill(){token++;if(tween){try{tween.kill();}catch(_){}tween=null;}}
function animate(before,commit,prepared){
  var g=deps&&deps.gsap;
  if(!g){kill();clear();commit();return null;}
  var from=capture();kill();clear();commit();var to=capture(),id=token,duration=reduce()?.18:.56,
      vars={duration:duration,ease:reduce()?'power1.out':'sine.inOut',overwrite:'auto',onComplete:function(){if(id!==token)return;tween=null;clear();}},
      context={from:from,to:to,duration:duration,token:id};
  apply(from);
  if(typeof prepared==='function')prepared(context);
  V.forEach(function(n){vars[n]=to[n];});
  tween=g.to(doc,vars);
  return context;
}
if(SC.motion&&SC.motion.whenLoaded)SC.motion.whenLoaded(function(d){deps=d;});else if(SC.motion&&SC.motion.whenReady)SC.motion.whenReady(function(d){deps=d;});
C.themePalette={animate:animate,kill:function(){kill();clear();}};
})();