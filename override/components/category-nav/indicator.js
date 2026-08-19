(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,N=SC&&SC.categoryNav,T=SC&&SC.templates;if(!SC||!U||!C||!N||!T||SC.__categoryNavIndicatorBooted)return;SC.__categoryNavIndicatorBooted=true;

/* Un indicador por riel; la geometría visible permite retargetear sin saltos entre selecciones. */
var CFG={duration:.25},entries=[],dirty=true,deps=null;
function reduced(){return SC.motion&&SC.motion.reduced?SC.motion.reduced():C.queries.reducedMotion.matches;}
function gsap(){return deps&&deps.gsap;}
function mount(root){return root.closest(N.selectors.mobileScroller)||root;}
function visual(link){var fallback=link.getBoundingClientRect();try{var range=document.createRange();range.selectNodeContents(link);var rect=range.getBoundingClientRect();if(rect&&rect.width>1&&rect.height>0)return rect;}catch(_){}return fallback;}
function sameTarget(link,target){var resolved=N.anchor(link.getAttribute('href'));if(resolved===target)return true;return!!(resolved&&target&&resolved.id&&target.id&&resolved.id===target.id);}
function rootsFor(target){var roots=[];N.links().forEach(function(link){if(!sameTarget(link,target)||!U.visible(link))return;var root=link.closest('.nav-tabsTopShop,.nav-tabs');if(root&&roots.indexOf(root)<0)roots.push(root);});return roots;}
function clearTransform(item){if(!item||!item.line)return;var g=gsap();if(g)g.set(item.line,{clearProps:'transform,transformOrigin'});else{item.line.style.removeProperty('transform');item.line.style.removeProperty('transform-origin');}}
function kill(item,clear){if(item.tween){item.tween.kill();item.tween=null;}if(item.line)item.line.style.removeProperty('will-change');if(clear)clearTransform(item);}
function destroy(item){kill(item,true);if(item.line&&item.line.parentNode)item.line.parentNode.removeChild(item.line);}
function entry(root){var host=mount(root),item=null;for(var i=entries.length-1;i>=0;i--){if(entries[i].root!==root)continue;if(entries[i].host===host){item=entries[i];break;}destroy(entries[i]);entries.splice(i,1);}if(item)return item;var line=T.clone('category-indicator');host.classList.add('sc-category-motion-root');host.appendChild(line);if(host.matches(N.selectors.mobileScroller))line.style.setProperty('bottom','0','important');item={root:root,host:host,line:line,x:0,width:1,init:false,tween:null};entries.push(item);return item;}
function rootScale(item){var rootRect=item.root.getBoundingClientRect(),scale=item.root.offsetWidth&&rootRect.width?rootRect.width/item.root.offsetWidth:1;return isFinite(scale)&&scale>0?scale:1;}
function geometry(item,link){var linkRect=visual(link),x,width;if(item.host.matches(N.selectors.mobileScroller)){var hostRect=item.host.getBoundingClientRect();x=item.host.scrollLeft+(linkRect.left-hostRect.left);width=linkRect.width;}else{var rootRect=item.root.getBoundingClientRect(),scale=rootScale(item);x=(linkRect.left-rootRect.left)/scale+(item.root.scrollLeft||0);width=linkRect.width/scale;}return{x:x,width:Math.max(0,width)};}
/* getBoundingClientRect incluye el transform activo, igual que el indicador previo de una tab. */
function renderedGeometry(item){
  if(!item||!item.init||!item.line)return{x:item.x,width:item.width};var lineRect=item.line.getBoundingClientRect(),x,width;
  if(!(lineRect&&isFinite(lineRect.left)&&isFinite(lineRect.width)&&lineRect.width>0))return{x:item.x,width:item.width};
  if(item.host.matches(N.selectors.mobileScroller)){var hostRect=item.host.getBoundingClientRect();x=item.host.scrollLeft+(lineRect.left-hostRect.left);width=lineRect.width;}
  else{var rootRect=item.root.getBoundingClientRect(),scale=rootScale(item);x=(lineRect.left-rootRect.left)/scale+(item.root.scrollLeft||0);width=lineRect.width/scale;}
  return isFinite(x)&&isFinite(width)&&width>0?{x:x,width:width}:{x:item.x,width:item.width};
}
function snap(item,next){kill(item,true);item.x=next.x;item.width=next.width;item.init=true;item.line.style.left=next.x+'px';item.line.style.width=next.width+'px';item.line.style.opacity='1';}
/* FLIP de 250 ms emphasized; reduced motion cambia desplazamiento por fade. */
function animate(item,next){
  var g=gsap();if(!g){snap(item,next);return;}var ease=SC.motion&&SC.motion.curve?SC.motion.curve('emphasized'):function(p){return p;};
  if(reduced()){
    kill(item,true);item.x=next.x;item.width=next.width;item.line.style.left=next.x+'px';item.line.style.width=next.width+'px';item.line.style.opacity='0';item.line.style.willChange='opacity';
    item.tween=g.to(item.line,{opacity:1,duration:CFG.duration,ease:ease,overwrite:'auto',onComplete:function(){item.tween=null;item.line.style.opacity='1';item.line.style.removeProperty('will-change');}});return;
  }
  var from=renderedGeometry(item);kill(item,false);var dx=from.x-next.x,scale=from.width/next.width;item.x=next.x;item.width=next.width;item.line.style.left=next.x+'px';item.line.style.width=next.width+'px';item.line.style.opacity='1';item.line.style.willChange='transform';
  g.set(item.line,{x:dx,scaleX:scale,transformOrigin:'0 50%'});
  item.tween=g.to(item.line,{x:0,scaleX:1,duration:CFG.duration,ease:ease,overwrite:'auto',onComplete:function(){item.tween=null;g.set(item.line,{clearProps:'transform,transformOrigin'});item.line.style.removeProperty('will-change');}});
}
function move(target,animateMotion){rootsFor(target).forEach(function(root){var link=N.links(root).find(function(node){return sameTarget(node,target)&&U.visible(node);});if(!link)return;var item=entry(root),next=geometry(item,link);if(!item.init||!animateMotion)snap(item,next);else animate(item,next);});dirty=false;}
function markDirty(){dirty=true;}function isDirty(){return dirty;}
function pause(){entries.forEach(function(item){kill(item,true);});}
function resume(){for(var i=entries.length-1;i>=0;i--){var item=entries[i];if(!document.documentElement.contains(item.root)||!document.documentElement.contains(item.host)){destroy(item);entries.splice(i,1);continue;}clearTransform(item);item.line.style.left=item.x+'px';item.line.style.width=item.width+'px';item.line.style.opacity='1';}}
if(SC.motion&&SC.motion.whenLoaded)SC.motion.whenLoaded(function(x){deps=x;});else if(SC.motion&&SC.motion.whenReady)SC.motion.whenReady(function(x){deps=x;});
N.categoryIndicator={move:move,markDirty:markDirty,isDirty:isDirty,pause:pause,resume:resume};N.moveIndicator=move;
})();