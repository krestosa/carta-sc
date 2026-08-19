(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,N=SC&&SC.categoryNav,T=SC&&SC.templates;if(!SC||!U||!C||!N||!T||SC.__categoryNavIndicatorBooted)return;SC.__categoryNavIndicatorBooted=true;

/* Un indicador por riel; el estado conserva la geometría final entre cambios. */
var CFG={minWidth:6,textInsetMax:1.25,textInsetRatio:.025,duration:.25},entries=[],dirty=true,deps=null;
function reduced(){return SC.motion&&SC.motion.reduced?SC.motion.reduced():C.queries.reducedMotion.matches;}
function gsap(){return deps&&deps.gsap;}
function physicalPixel(){return 1/Math.max(1,window.devicePixelRatio||1);}
function floorPhysical(v){var dpr=Math.max(1,window.devicePixelRatio||1);return Math.floor(v*dpr+1e-6)/dpr;}
function mount(root){return root.closest(N.selectors.mobileScroller)||root;}
function visual(link){var fallback=link.getBoundingClientRect();try{var range=document.createRange();range.selectNodeContents(link);var rect=range.getBoundingClientRect();if(rect&&rect.width>1&&rect.height>0)return rect;}catch(_){}return fallback;}
function sameTarget(link,target){var resolved=N.anchor(link.getAttribute('href'));if(resolved===target)return true;return!!(resolved&&target&&resolved.id&&target.id&&resolved.id===target.id);}
function rootsFor(target){var roots=[];N.links().forEach(function(link){if(!sameTarget(link,target)||!U.visible(link))return;var root=link.closest('.nav-tabsTopShop,.nav-tabs');if(root&&roots.indexOf(root)<0)roots.push(root);});return roots;}
function kill(item){if(item.tween){item.tween.kill();item.tween=null;}if(item.line)item.line.style.removeProperty('will-change');}
function destroy(item){kill(item);if(item.line&&item.line.parentNode)item.line.parentNode.removeChild(item.line);}
function entry(root){var host=mount(root),item=null;for(var i=entries.length-1;i>=0;i--){if(entries[i].root!==root)continue;if(entries[i].host===host){item=entries[i];break;}destroy(entries[i]);entries.splice(i,1);}if(item)return item;var line=T.clone('category-indicator');host.classList.add('sc-category-motion-root');host.appendChild(line);if(host.matches(N.selectors.mobileScroller))line.style.setProperty('bottom','0','important');item={root:root,host:host,line:line,x:0,width:1,init:false,tween:null};entries.push(item);return item;}
function geometry(item,link){var linkRect=visual(link),x,width,scale=1;if(item.host.matches(N.selectors.mobileScroller)){var hostRect=item.host.getBoundingClientRect();x=item.host.scrollLeft+(linkRect.left-hostRect.left);width=linkRect.width;}else{var rootRect=item.root.getBoundingClientRect();scale=item.root.offsetWidth&&rootRect.width?rootRect.width/item.root.offsetWidth:1;if(!isFinite(scale)||scale<=0)scale=1;x=(linkRect.left-rootRect.left)/scale+(item.root.scrollLeft||0);width=linkRect.width/scale;}var inset=Math.min(CFG.textInsetMax,Math.max(0,width*CFG.textInsetRatio));x+=inset;width=Math.max(CFG.minWidth,width-inset*2);if(item.host.matches(N.selectors.mobileScroller)){var right=floorPhysical(x+width)-physicalPixel();width=Math.max(CFG.minWidth,right-x);}return{x:x,width:width};}
function snap(item,next){kill(item);item.x=next.x;item.width=next.width;item.init=true;item.line.style.left=next.x+'px';item.line.style.width=next.width+'px';item.line.style.opacity='1';item.line.style.transform='none';}
/* Cambia primero a la geometría final y reproduce desde la geometría anterior. */
function animate(item,next){var g=gsap();if(!g||reduced()){snap(item,next);return;}kill(item);var dx=item.x-next.x,scale=item.width/next.width;item.x=next.x;item.width=next.width;item.line.style.left=next.x+'px';item.line.style.width=next.width+'px';item.line.style.opacity='1';item.line.style.willChange='transform';g.set(item.line,{x:dx,scaleX:scale,transformOrigin:'0 50%'});item.tween=g.to(item.line,{x:0,scaleX:1,duration:CFG.duration,ease:SC.motion.curve('expand'),overwrite:'auto',force3D:true,onComplete:function(){item.tween=null;g.set(item.line,{clearProps:'transform'});item.line.style.removeProperty('will-change');}});}
function move(target,animateMotion){rootsFor(target).forEach(function(root){var link=N.links(root).find(function(node){return sameTarget(node,target)&&U.visible(node);});if(!link)return;var item=entry(root),next=geometry(item,link);if(!item.init||!animateMotion||reduced())snap(item,next);else animate(item,next);});dirty=false;}
function markDirty(){dirty=true;}function isDirty(){return dirty;}
function pause(){entries.forEach(kill);}
function resume(){for(var i=entries.length-1;i>=0;i--){var item=entries[i];if(!document.documentElement.contains(item.root)||!document.documentElement.contains(item.host)){destroy(item);entries.splice(i,1);continue;}item.line.style.left=item.x+'px';item.line.style.width=item.width+'px';item.line.style.opacity='1';}}
if(SC.motion&&SC.motion.whenLoaded)SC.motion.whenLoaded(function(x){deps=x;});else if(SC.motion&&SC.motion.whenReady)SC.motion.whenReady(function(x){deps=x;});
N.categoryIndicator={move:move,markDirty:markDirty,isDirty:isDirty,pause:pause,resume:resume};N.moveIndicator=move;
})();