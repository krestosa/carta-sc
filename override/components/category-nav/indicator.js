(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,N=SC&&SC.categoryNav,T=SC&&SC.templates;
if(!SC||!U||!N||!T||SC.__categoryNavIndicatorBooted)return;SC.__categoryNavIndicatorBooted=true;
var entries=[],dirty=true,raf=0,lastFrame=0;
var EDGE_K=220,EDGE_D=22,WARP_K=320,WARP_D=34,WARP_GAIN=.0095,SCROLL_DECAY=13,EPS_POS=.08,EPS_VEL=2.2;
function now(){return window.performance&&performance.now?performance.now():Date.now();}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function mount(root){return root.closest('.topShopMenuMobileScroller')||root;}
function visual(link){var fallback=link.getBoundingClientRect();try{var range=document.createRange();range.selectNodeContents(link);var rect=range.getBoundingClientRect();if(rect&&rect.width>1&&rect.height>0)return rect;}catch(_){}return fallback;}
function reduced(){return SC.motion&&SC.motion.reduced?SC.motion.reduced():matchMedia('(prefers-reduced-motion: reduce)').matches;}
function transform(x,width){return 'translate3d('+x+'px,0,0) scaleX('+Math.max(1,width)+')';}
function scrollNode(root,host){return root.closest('.topShopMenuMobileScroller,.sc-catalog-categories')||((host.scrollWidth||0)>(host.clientWidth||0)+1?host:null);}
function sameTarget(link,target){var resolved=N.anchor(link.getAttribute('href'));if(resolved===target)return true;return !!(resolved&&target&&resolved.id&&target.id&&resolved.id===target.id);}
function rootsFor(target){var roots=[];N.links().forEach(function(link){if(!sameTarget(link,target)||!U.visible(link))return;var root=link.closest('.nav-tabsTopShop,.nav-tabs');if(root&&roots.indexOf(root)<0)roots.push(root);});return roots;}
function wake(){if(!raf){lastFrame=now();raf=requestAnimationFrame(frame);}}
function unbind(item){if(item.scrollEl&&item.onScroll)item.scrollEl.removeEventListener('scroll',item.onScroll);item.scrollEl=null;item.onScroll=null;}
function destroy(item){unbind(item);if(item.line&&item.line.parentNode)item.line.parentNode.removeChild(item.line);}
function bindScroll(item){
  var el=scrollNode(item.root,item.host);if(el===item.scrollEl)return;unbind(item);item.scrollEl=el;if(!el)return;
  item.scrollX=el.scrollLeft||0;item.scrollT=now();item.scrollV=0;
  item.onScroll=function(){var t=now(),x=el.scrollLeft||0,dt=(t-item.scrollT)/1000;if(dt>.003&&dt<.16){var v=-(x-item.scrollX)/dt;item.scrollV=item.scrollV*.32+v*.68;}item.scrollX=x;item.scrollT=t;item.scrollUntil=t+90;wake();};
  el.addEventListener('scroll',item.onScroll,{passive:true});
}
function entry(root){
  var host=mount(root),item=null;
  for(var i=entries.length-1;i>=0;i--){if(entries[i].root!==root)continue;if(entries[i].host===host){item=entries[i];break;}destroy(entries[i]);entries.splice(i,1);}
  if(!item){var line=T.clone('category-indicator');host.classList.add('sc-category-motion-root');host.appendChild(line);if(host.classList.contains('topShopMenuMobileScroller'))line.style.setProperty('bottom','0','important');item={root:root,host:host,line:line,init:false,left:0,right:1,targetLeft:0,targetRight:1,vl:0,vr:0,warp:0,vw:0,scrollEl:null,onScroll:null,scrollX:0,scrollT:0,scrollV:0,scrollUntil:0};entries.push(item);}
  bindScroll(item);return item;
}
function snap(item,left,right){item.left=item.targetLeft=left;item.right=item.targetRight=right;item.vl=item.vr=item.warp=item.vw=item.scrollV=0;item.line.style.opacity='1';item.line.style.transformOrigin='0 50%';item.line.style.transform=transform(left,right-left);item.init=true;}
function spring(pos,vel,target,k,d,dt){var a=(target-pos)*k-vel*d;vel+=a*dt;pos+=vel*dt;return[pos,vel];}
function render(item,dt,t){
  if(!item.init)return false;if(reduced()){snap(item,item.targetLeft,item.targetRight);return false;}
  var s=spring(item.left,item.vl,item.targetLeft,EDGE_K,EDGE_D,dt);item.left=s[0];item.vl=s[1];s=spring(item.right,item.vr,item.targetRight,EDGE_K,EDGE_D,dt);item.right=s[0];item.vr=s[1];
  if(t>item.scrollUntil)item.scrollV*=Math.exp(-SCROLL_DECAY*dt);
  var width=Math.max(6,item.targetRight-item.targetLeft),visualVelocity=(item.vl+item.vr)*.5+item.scrollV,maxWarp=Math.min(12,Math.max(5,width*.14)),warpTarget=Math.abs(visualVelocity)<32?0:clamp(visualVelocity*WARP_GAIN,-maxWarp,maxWarp);
  s=spring(item.warp,item.vw,warpTarget,WARP_K,WARP_D,dt);item.warp=s[0];item.vw=s[1];
  var m=Math.abs(item.warp),shift=item.warp*.22,left=item.left-m*.5+shift,right=item.right+m*.5+shift;item.line.style.opacity='1';item.line.style.transformOrigin='0 50%';item.line.style.transform=transform(left,right-left);
  var settled=Math.abs(item.left-item.targetLeft)<EPS_POS&&Math.abs(item.right-item.targetRight)<EPS_POS&&Math.abs(item.vl)<EPS_VEL&&Math.abs(item.vr)<EPS_VEL&&Math.abs(item.warp)<.04&&Math.abs(item.vw)<1&&Math.abs(item.scrollV)<2&&t>item.scrollUntil;
  if(settled){snap(item,item.targetLeft,item.targetRight);return false;}return true;
}
function frame(t){raf=0;var dt=clamp((t-lastFrame)/1000,.001,.032);lastFrame=t;var active=false;for(var i=entries.length-1;i>=0;i--){var item=entries[i];if(!document.documentElement.contains(item.root)||!document.documentElement.contains(item.host)){destroy(item);entries.splice(i,1);continue;}bindScroll(item);if(render(item,dt,t))active=true;}if(active)wake();}
function move(target,animate){
  var roots=rootsFor(target);
  roots.forEach(function(root){
    var link=N.links(root).find(function(node){return sameTarget(node,target)&&U.visible(node);});if(!link)return;
    var item=entry(root),linkRect=visual(link),x,width,scale=1,inset;
    if(item.host.classList.contains('topShopMenuMobileScroller')){var hostRect=item.host.getBoundingClientRect();x=item.host.scrollLeft+(linkRect.left-hostRect.left);width=linkRect.width;}
    else{var rootRect=root.getBoundingClientRect();scale=root.offsetWidth&&rootRect.width?rootRect.width/root.offsetWidth:1;if(!isFinite(scale)||scale<=0)scale=1;x=(linkRect.left-rootRect.left)/scale+(root.scrollLeft||0);width=linkRect.width/scale;}
    inset=Math.min(1.25,Math.max(0,width*.025));x+=inset;width=Math.max(6,width-inset*2);item.targetLeft=x;item.targetRight=x+width;item.line.style.opacity='1';item.line.style.transformOrigin='0 50%';if(!item.init||!animate||reduced())snap(item,x,x+width);else wake();
  });
  dirty=false;
}
function markDirty(){dirty=true;}function isDirty(){return dirty;}
N.categoryIndicator={move:move,markDirty:markDirty,isDirty:isDirty};N.moveIndicator=move;
})();
