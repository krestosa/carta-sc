(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,N=SC&&SC.categoryNav,T=SC&&SC.templates;if(!SC||!U||!C||!N||!T||SC.__categoryNavIndicatorBooted)return;SC.__categoryNavIndicatorBooted=true;

/* Parámetros del spring y deformación por velocidad. */
interface IndicatorState{x:number;width:number;warp:number;}
interface IndicatorEntry{root:HTMLElement;host:HTMLElement;line:HTMLElement;state:IndicatorState;targetX:number;targetWidth:number;dir:number;init:boolean;visible:boolean;moveRaf:number;lastMoveT:number;vx:number;vw:number;scrollEl:HTMLElement|null;onScroll:(()=>void)|null;scrollX:number;scrollT:number;warpTo:GsapQuickTo|null;settleCall:GsapTween|null;}
var CFG={minWidth:6,maxWarp:11,minWarp:4.5,warpWidthRatio:.13,leadingShare:.92,trailingShare:.08,scrollSampleMin:.003,scrollSampleMax:.16,scrollVelocityScale:700,scrollWarpDuration:.14,scrollSettleDelay:.065,textInsetMax:1.25,textInsetRatio:.025,springResponse:.34,springDamping:1,springMaxDt:.032,springPositionEpsilon:.06,springVelocityEpsilon:.45,springWarpResponse:18},entries:IndicatorEntry[]=[],dirty=true,deps:MotionDeps|null=null;
function now():number{return window.performance&&performance.now?performance.now():Date.now();}
function clamp(v:number,min:number,max:number):number{return Math.max(min,Math.min(max,v));}
function physicalPixel():number{return 1/Math.max(1,window.devicePixelRatio||1);}
function floorPhysical(v:number):number{var dpr=Math.max(1,window.devicePixelRatio||1);return Math.floor(v*dpr+1e-6)/dpr;}
function reduced():boolean{return SC.motion&&SC.motion.reduced?SC.motion.reduced():C.queries.reducedMotion.matches;}
function gsap():GsapLike|null{return deps&&deps.gsap;}

/* Resuelve geometría visible del texto y su scroller. */
function mount(root:HTMLElement):HTMLElement{return root.closest<HTMLElement>(N.selectors.mobileScroller)||root;}
function visual(link:HTMLElement):DOMRect{var fallback=link.getBoundingClientRect();try{var range=document.createRange();range.selectNodeContents(link);var rect=range.getBoundingClientRect();if(rect&&rect.width>1&&rect.height>0)return rect;}catch(_){}return fallback;}
function scrollNode(root:HTMLElement,host:HTMLElement):HTMLElement|null{return root.closest<HTMLElement>(N.selectors.mobileScroller+','+N.selectors.scroller)||((host.scrollWidth||0)>(host.clientWidth||0)+1?host:null);}
function sameTarget(link:HTMLAnchorElement,target:Element|null):boolean{var resolved=N.anchor(link.getAttribute('href'));if(resolved===target)return true;return!!(resolved&&target&&resolved.id&&target.id&&resolved.id===target.id);}
function rootsFor(target:Element|null):HTMLElement[]{var roots:HTMLElement[]=[];(N.links() as HTMLAnchorElement[]).forEach(function(link:HTMLAnchorElement){if(!sameTarget(link,target)||!U.visible(link))return;var root=link.closest<HTMLElement>('.nav-tabsTopShop,.nav-tabs');if(root&&roots.indexOf(root)<0)roots.push(root);});return roots;}

/* Renderiza posición, ancho y estiramiento del indicador. */
function transform(x:number,width:number):string{return'translate3d('+x+'px,0,0) scaleX('+Math.max(1,width)+')';}
function render(item:IndicatorEntry):void{var s=item.state,stretch=Math.abs(s.warp),left=s.x,width=s.width+stretch;if(s.warp>=0)left-=stretch*CFG.trailingShare;else left-=stretch*CFG.leadingShare;if(!item.visible){item.line.style.opacity='1';item.visible=true;}item.line.style.transform=transform(left,width);}

/* Gestiona deformación temporal producida por scroll. */
function pauseSettle(item:IndicatorEntry):void{if(item.settleCall)item.settleCall.pause(0);}
function killSettle(item:IndicatorEntry):void{if(item.settleCall){item.settleCall.kill();item.settleCall=null;}}
function ensureSettle(item:IndicatorEntry):GsapTween|null{var g=gsap();if(!g)return null;if(!item.settleCall)item.settleCall=g.delayedCall(CFG.scrollSettleDelay,function(){if(item.warpTo)item.warpTo(0);}).pause();return item.settleCall;}
function stopWarp(item:IndicatorEntry):void{pauseSettle(item);if(item.warpTo&&item.warpTo.tween)item.warpTo.tween.kill();item.warpTo=null;}
function stopMove(item:IndicatorEntry):void{if(item.moveRaf){cancelAnimationFrame(item.moveRaf);item.moveRaf=0;}item.lastMoveT=0;}
function stopMotion(item:IndicatorEntry):void{stopMove(item);stopWarp(item);}
function unbind(item:IndicatorEntry):void{if(item.scrollEl&&item.onScroll)item.scrollEl.removeEventListener('scroll',item.onScroll);item.scrollEl=null;item.onScroll=null;pauseSettle(item);}
function destroy(item:IndicatorEntry):void{unbind(item);stopMotion(item);killSettle(item);if(item.line&&item.line.parentNode)item.line.parentNode.removeChild(item.line);}
function maxWarp(width:number):number{return Math.min(CFG.maxWarp,Math.max(CFG.minWarp,width*CFG.warpWidthRatio));}
function ensureWarpTo(item:IndicatorEntry):void{var g=gsap();if(!g||item.warpTo)return;item.warpTo=g.quickTo(item.state,'warp',{duration:CFG.scrollWarpDuration,ease:'power3.out',overwrite:'auto',onUpdate:function(){render(item);}});}
function pulseScroll(item:IndicatorEntry,velocity:number):void{var g=gsap();if(!g||reduced()||item.moveRaf)return;var amount=maxWarp(item.targetWidth||item.state.width)*clamp(Math.abs(velocity)/CFG.scrollVelocityScale,0,1);if(amount<.2)return;item.dir=velocity>0?1:-1;ensureWarpTo(item);if(!item.warpTo)return;item.warpTo(item.dir*amount);var settle=ensureSettle(item);if(settle)settle.restart(true);}
function bindScroll(item:IndicatorEntry):void{var el=scrollNode(item.root,item.host);if(el===item.scrollEl)return;unbind(item);item.scrollEl=el;if(!el)return;var scrollEl=el;item.scrollX=scrollEl.scrollLeft||0;item.scrollT=now();item.onScroll=function(){var t=now(),x=scrollEl.scrollLeft||0,dt=(t-item.scrollT)/1000;if(dt>CFG.scrollSampleMin&&dt<CFG.scrollSampleMax)pulseScroll(item,-(x-item.scrollX)/dt);item.scrollX=x;item.scrollT=t;};scrollEl.addEventListener('scroll',item.onScroll,{passive:true});}

/* Crea un indicador por riel visible y lo reutiliza. */
function entry(root:HTMLElement):IndicatorEntry{var host=mount(root),item:IndicatorEntry|null=null;for(var i=entries.length-1;i>=0;i--){var current=entries[i];if(!current||current.root!==root)continue;if(current.host===host){item=current;break;}destroy(current);entries.splice(i,1);}if(!item){var line=T.clone('category-indicator') as HTMLElement;host.classList.add('sc-category-motion-root');host.appendChild(line);if(host.matches(N.selectors.mobileScroller))line.style.setProperty('bottom','0','important');item={root:root,host:host,line:line,state:{x:0,width:1,warp:0},targetX:0,targetWidth:1,dir:1,init:false,visible:false,moveRaf:0,lastMoveT:0,vx:0,vw:0,scrollEl:null,onScroll:null,scrollX:0,scrollT:0,warpTo:null,settleCall:null};entries.push(item);}bindScroll(item);return item;}

/* Snap inmediato para primer estado o movimiento reducido. */
function snap(item:IndicatorEntry,x:number,width:number):void{stopMotion(item);item.targetX=x;item.targetWidth=width;item.state.x=x;item.state.width=width;item.state.warp=0;item.vx=0;item.vw=0;item.init=true;render(item);}
function springAxis(position:number,velocity:number,target:number,dt:number):[number,number]{var omega=(Math.PI*2)/CFG.springResponse,accel=-2*CFG.springDamping*omega*velocity-omega*omega*(position-target);velocity+=accel*dt;position+=velocity*dt;return[position,velocity];}
function settled(item:IndicatorEntry):boolean{return Math.abs(item.state.x-item.targetX)<CFG.springPositionEpsilon&&Math.abs(item.state.width-item.targetWidth)<CFG.springPositionEpsilon&&Math.abs(item.vx)<CFG.springVelocityEpsilon&&Math.abs(item.vw)<CFG.springVelocityEpsilon;}

/* Integra el spring y deriva el estiramiento de su velocidad. */
function step(item:IndicatorEntry,t:number):void{
  if(!item.moveRaf)return;var dt=item.lastMoveT?Math.min(CFG.springMaxDt,Math.max(.001,(t-item.lastMoveT)/1000)):1/60;item.lastMoveT=t;
  var x=springAxis(item.state.x,item.vx,item.targetX,dt),w=springAxis(item.state.width,item.vw,item.targetWidth,dt);item.state.x=x[0];item.vx=x[1];item.state.width=Math.max(1,w[0]);item.vw=w[1];
  var centerVelocity=item.vx+item.vw*.5,warpTarget=clamp(centerVelocity/900,-1,1)*maxWarp(item.state.width),blend=Math.min(1,dt*CFG.springWarpResponse);item.state.warp+=(warpTarget-item.state.warp)*blend;render(item);
  if(settled(item)){item.state.x=item.targetX;item.state.width=item.targetWidth;item.state.warp=0;item.vx=0;item.vw=0;item.moveRaf=0;item.lastMoveT=0;render(item);return;}
  item.moveRaf=requestAnimationFrame(function(next){step(item,next);});
}
function animate(item:IndicatorEntry,x:number,width:number):void{
  if(reduced()){snap(item,x,width);return;}stopWarp(item);var from=item.state.x+item.state.width*.5,to=x+width*.5;item.targetX=x;item.targetWidth=width;item.dir=to>=from?1:-1;item.init=true;
  if(!item.moveRaf){item.lastMoveT=0;item.moveRaf=requestAnimationFrame(function(t){step(item,t);});}
}

/* Mueve todos los indicadores que apuntan a la categoría activa. */
function move(target:Element|null,animateMotion:boolean):void{var roots=rootsFor(target);roots.forEach(function(root:HTMLElement){var link=(N.links(root) as HTMLAnchorElement[]).find(function(node:HTMLAnchorElement){return sameTarget(node,target)&&U.visible(node);});if(!link)return;var item=entry(root),linkRect=visual(link),x,width,scale=1,inset;if(item.host.matches(N.selectors.mobileScroller)){var hostRect=item.host.getBoundingClientRect();x=item.host.scrollLeft+(linkRect.left-hostRect.left);width=linkRect.width;}else{var rootRect=root.getBoundingClientRect();scale=root.offsetWidth&&rootRect.width?rootRect.width/root.offsetWidth:1;if(!isFinite(scale)||scale<=0)scale=1;x=(linkRect.left-rootRect.left)/scale+(root.scrollLeft||0);width=linkRect.width/scale;}inset=Math.min(CFG.textInsetMax,Math.max(0,width*CFG.textInsetRatio));x+=inset;width=Math.max(CFG.minWidth,width-inset*2);if(item.host.matches(N.selectors.mobileScroller)){var right=floorPhysical(x+width)-physicalPixel();width=Math.max(CFG.minWidth,right-x);}if(!item.init||!animateMotion||reduced())snap(item,x,width);else animate(item,x,width);});dirty=false;}
function markDirty():void{dirty=true;}function isDirty():boolean{return dirty;}
function pause():void{entries.forEach(function(item:IndicatorEntry){unbind(item);stopMotion(item);});}
function resume():void{for(var i=entries.length-1;i>=0;i--){var item=entries[i];if(!item)continue;if(!document.documentElement.contains(item.root)||!document.documentElement.contains(item.host)){destroy(item);entries.splice(i,1);continue;}bindScroll(item);render(item);}}

/* GSAP se usa solo para el settle de deformación por scroll. */
if(SC.motion&&SC.motion.whenLoaded)SC.motion.whenLoaded(function(x:MotionDeps){deps=x;});else if(SC.motion&&SC.motion.whenReady)SC.motion.whenReady(function(x:MotionDeps){deps=x;});
N.categoryIndicator={move:move,markDirty:markDirty,isDirty:isDirty,pause:pause,resume:resume};N.moveIndicator=move;
})();