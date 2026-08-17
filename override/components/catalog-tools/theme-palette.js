(function(){
'use strict';
var SC=window.SCOverride,CFG=SC&&SC.config,C=SC&&SC.catalogTools;if(!SC||!CFG||!C||SC.__catalogThemePaletteBooted)return;SC.__catalogThemePaletteBooted=true;
var doc=document.documentElement,V=['--sc-color-ink','--sc-color-heading','--sc-color-copy','--sc-color-muted','--sc-color-trait','--sc-color-surface','--sc-color-surface-transparent','--sc-color-border','--sc-color-border-strong'],deps=null,tween=null,viewTransition=null,token=0;
function reduce(){return!!(CFG.queries&&CFG.queries.reducedMotion&&CFG.queries.reducedMotion.matches);}function capture(){var s=getComputedStyle(doc),v={};V.forEach(function(n){v[n]=s.getPropertyValue(n).trim();});return v;}function clear(){V.forEach(function(n){doc.style.removeProperty(n);});}function apply(v){V.forEach(function(n){if(v[n])doc.style.setProperty(n,v[n]);});}
function kill(){token++;if(tween){try{tween.kill();}catch(_){}tween=null;}if(viewTransition&&viewTransition.skipTransition){try{viewTransition.skipTransition();}catch(_){}}viewTransition=null;}
function animate(before,commit){
  var g=deps&&deps.gsap;
  if(!reduce()&&typeof document.startViewTransition==='function'){
    kill();clear();var id=token;
    try{
      viewTransition=document.startViewTransition(function(){commit();});
      if(viewTransition&&viewTransition.finished)viewTransition.finished.then(function(){if(id===token)viewTransition=null;},function(){if(id===token)viewTransition=null;});
      return;
    }catch(_){viewTransition=null;}
  }
  if(!g){kill();clear();commit();return;}
  var from=capture();kill();clear();commit();var to=capture(),id=token,vars={duration:reduce()?.18:.56,ease:reduce()?'power1.out':'sine.inOut',overwrite:'auto',onComplete:function(){if(id!==token)return;tween=null;clear();}};apply(from);V.forEach(function(n){vars[n]=to[n];});tween=g.to(doc,vars);
}
if(SC.motion&&SC.motion.whenLoaded)SC.motion.whenLoaded(function(d){deps=d;});else if(SC.motion&&SC.motion.whenReady)SC.motion.whenReady(function(d){deps=d;});
C.themePalette={animate:animate,kill:function(){kill();clear();}};
})();