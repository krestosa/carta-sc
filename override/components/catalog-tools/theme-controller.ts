(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.catalogTools,P=C&&C.themePalette;if(!SC||!C||!P||SC.__catalogThemeControllerBooted)return;SC.__catalogThemeControllerBooted=true;
var palette=P;

type ThemeMode='system'|'light'|'dark';
type ThemeResolved='light'|'dark';
interface ThemePaletteSnapshot{[key:string]:string;}
interface ThemePaletteContext{from:ThemePaletteSnapshot;to:ThemePaletteSnapshot;duration:number;token:number;fade:boolean;}
interface ThemeParts{button:HTMLButtonElement;svg:SVGElement;rotor:SVGGraphicsElement;core:SVGPathElement;bite:SVGElement;ring:SVGElement;rays:SVGElement;lines:SVGLineElement[];}

var MODES:readonly ThemeMode[]=['system','light','dark'];
var KEY='scTheme:v1',doc=document.documentElement,systemDark=matchMedia('(prefers-color-scheme:dark)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
var deps:MotionDeps|null=null,mainTimeline:GsapTimeline|null=null,contrastFlip:GsapTween|null=null,contrastRelease:GsapTween|null=null,contrastNode:HTMLButtonElement|null=null;
var partsCache=new WeakMap<HTMLElement,ThemeParts>(),optionsCache=new WeakMap<HTMLElement,HTMLElement[]>();
var NEUTRAL='M12 3.6A8.4 8.4 0 1 1 12 20.4A8.4 8.4 0 1 1 12 3.6Z';
var SUN='M12 7.3A4.7 4.7 0 1 1 12 16.7A4.7 4.7 0 1 1 12 7.3Z';
var MOON_FULL='M12 3A9 9 0 1 1 12 21A9 9 0 1 1 12 3Z';
var AUTO='M12 3.6a8.4 8.4 0 0 1 0 16.8z';
var MOON_BITE={cx:18.3,cy:6.2,r:8.6};
void NEUTRAL;

function norm(mode:string):ThemeMode|''{return mode==='system'||mode==='light'||mode==='dark'?mode:'';}
function resolved(mode:ThemeMode):ThemeResolved{return mode==='system'?(systemDark.matches?'dark':'light'):mode;}
function selected():ThemeMode{return norm(doc.getAttribute('data-sc-theme')||'')||load();}
function motionGsap():GsapLike|null{return deps?deps.gsap:null;}
function morph():MorphSVGPluginLike|null{return deps&&deps.MorphSVGPlugin?deps.MorphSVGPlugin:null;}
function memory():ThemeMode|''{var mode=norm(window.__scInitialTheme||'');if(mode)return mode;try{mode=norm(localStorage.getItem(KEY)||'');}catch(_){mode='';}return mode;}
function load():ThemeMode{return memory()||norm(doc.getAttribute('data-sc-theme')||'')||'system';}
function save(mode:ThemeMode):void{window.__scInitialTheme=mode;try{localStorage.setItem(KEY,mode);}catch(_){} }

function options(root:HTMLElement|null):HTMLElement[]{if(!root)return[];var cached=optionsCache.get(root);if(cached)return cached;cached=Array.from(root.querySelectorAll<HTMLElement>('[data-sc-theme-option]'));optionsCache.set(root,cached);return cached;}
function label(mode:ThemeMode):string{return mode==='system'?'Tema automático. Elegir tema':mode==='dark'?'Tema oscuro. Elegir tema':'Tema claro. Elegir tema';}
function emit(mode:ThemeMode,actual:ThemeResolved):void{try{dispatchEvent(new CustomEvent('sc:themechange',{detail:{mode:mode,resolved:actual}}));}catch(_){} }
function meta(root:HTMLElement|null,mode:ThemeMode):void{if(!root)return;var button=root.querySelector<HTMLButtonElement>('.sc-theme-toggle'),actual=resolved(mode);root.setAttribute('data-sc-theme-mode',mode);root.setAttribute('data-sc-theme-actual',actual);if(button){button.setAttribute('aria-label',label(mode));button.setAttribute('title',mode==='system'?'Tema automático':'Tema '+(mode==='dark'?'oscuro':'claro'));}options(root).forEach(function(option){var on=option.getAttribute('data-sc-theme-option')===mode;option.setAttribute('aria-checked',on?'true':'false');option.classList.toggle('sc-theme-option-selected',on);});}

function parts(root:HTMLElement|null):ThemeParts|null{
  if(!root)return null;var cached=partsCache.get(root);if(cached)return cached;
  var button=root.querySelector<HTMLButtonElement>('.sc-theme-toggle');if(!button)return null;
  var svg=button.querySelector<SVGElement>('[data-sc-theme-icon]'),rotor=button.querySelector<SVGGraphicsElement>('[data-sc-theme-rotor]'),core=button.querySelector<SVGPathElement>('[data-sc-theme-core]'),bite=button.querySelector<SVGElement>('[data-sc-theme-bite]'),ring=button.querySelector<SVGElement>('[data-sc-theme-auto-ring]'),rays=button.querySelector<SVGElement>('[data-sc-theme-rays]'),lines=Array.from(button.querySelectorAll<SVGLineElement>('[data-sc-theme-rays] line'));
  if(!svg||!rotor||!core||!bite||!ring||!rays||lines.length!==8)return null;
  cached={button:button,svg:svg,rotor:rotor,core:core,bite:bite,ring:ring,rays:rays,lines:lines};partsCache.set(root,cached);return cached;
}
function attrs(node:Element,values:Record<string,string|number>):void{Object.keys(values).forEach(function(key){node.setAttribute(key,String(values[key]));});}

function stopMain():void{if(mainTimeline){try{mainTimeline.kill();}catch(_){}mainTimeline=null;}}
function stopContrast():void{if(contrastFlip){try{contrastFlip.kill();}catch(_){}contrastFlip=null;}if(contrastRelease){try{contrastRelease.kill();}catch(_){}contrastRelease=null;}if(contrastNode){contrastNode.style.removeProperty('color');contrastNode=null;}}
function lockContrast(root:HTMLElement|null,context:ThemePaletteContext):void{
  stopContrast();var p=parts(root),g=motionGsap(),from=context.from['--sc-color-ink'],to=context.to['--sc-color-ink'],duration=context.duration;if(!p||!g||!from||!to||!duration||from===to)return;
  contrastNode=p.button;var button=p.button,toColor=to;button.style.setProperty('color',from,'important');
  contrastFlip=g.delayedCall(duration*.5,function(){contrastFlip=null;if(contrastNode===button)button.style.setProperty('color',toColor,'important');});
  contrastRelease=g.delayedCall(duration,function(){contrastRelease=null;if(contrastNode===button){button.style.removeProperty('color');contrastNode=null;}});
}

function prepLines(p:ThemeParts,offset:number):void{var g=motionGsap();p.lines.forEach(function(line){if(line.getAttribute('pathLength')!=='1')line.setAttribute('pathLength','1');});if(g){g.set(p.lines,{strokeDasharray:1,strokeDashoffset:offset});return;}p.lines.forEach(function(line){line.style.strokeDasharray='1';line.style.strokeDashoffset=String(offset);});}
function applyStatic(root:HTMLElement,mode:string):void{var p=parts(root),g=motionGsap();if(!p)return;var normalized=norm(mode)||'system';p.core.setAttribute('d',normalized==='system'?AUTO:(normalized==='dark'?MOON_FULL:SUN));attrs(p.bite,{cx:MOON_BITE.cx,cy:MOON_BITE.cy,r:normalized==='dark'?MOON_BITE.r:0});attrs(p.ring,{r:8.4});p.ring.style.opacity=normalized==='system'?'1':'0';prepLines(p,normalized==='light'?0:1);p.rays.style.opacity=normalized==='light'?'1':'0';if(g)g.set(p.rotor,{rotation:0,clearProps:'willChange'});else{p.rotor.style.transform='rotate(0deg)';p.rotor.style.removeProperty('will-change');}p.svg.setAttribute('data-sc-theme-glyph-state',normalized);root.setAttribute('data-sc-theme-prepaint-ready','1');root.removeAttribute('data-sc-theme-animating');}
function seed(root:HTMLElement):ThemeMode{var mode=load();meta(root,mode);applyStatic(root,mode);return mode;}
function setStatic(root:HTMLElement,mode:ThemeMode):void{stopMain();stopContrast();applyStatic(root,mode);}

function commit(root:HTMLElement|null,mode:string,persist:boolean,keepIcon:boolean):void{var normalized=norm(mode)||'system',prev=selected(),before=doc.getAttribute('data-sc-theme-resolved')||resolved(prev),after=resolved(normalized);doc.setAttribute('data-sc-theme',normalized);doc.setAttribute('data-sc-theme-resolved',after);window.__scInitialTheme=normalized;meta(root,normalized);if(root&&!keepIcon)setStatic(root,normalized);if(before!==after)emit(normalized,after);if(persist&&prev!==normalized)save(normalized);}
function morphCore(timeline:GsapTimeline,core:SVGPathElement,shape:string,pos:number,duration:number,ease:string):void{if(!morph()){timeline.call(function(){core.setAttribute('d',shape);},null,pos+duration);return;}timeline.to(core,{duration:duration,ease:ease,morphSVG:{shape:shape,map:'size'},overwrite:'auto'},pos);}

function animateGeometry(root:HTMLElement,from:string,to:string):void{
  var p=parts(root),g=motionGsap(),fromMode=norm(from)||'system',toMode=norm(to)||'system';if(!p||fromMode===toMode)return;if(!g||reduced.matches){setStatic(root,toMode);return;}
  var continuing=root.hasAttribute('data-sc-theme-animating');stopMain();if(!continuing)applyStatic(root,fromMode);
  root.setAttribute('data-sc-theme-animating','true');p.svg.setAttribute('data-sc-theme-glyph-state',toMode);g.set(p.rotor,{willChange:'transform'});
  var targetShape=toMode==='system'?AUTO:(toMode==='dark'?MOON_FULL:SUN),dir=toMode==='dark'?-1:1,state:{timeline:GsapTimeline|null}={timeline:null};
  var timeline=g.timeline({defaults:{overwrite:'auto'},onComplete:function(){if(mainTimeline!==state.timeline)return;mainTimeline=null;applyStatic(root,toMode);}});mainTimeline=timeline;state.timeline=timeline;
  morphCore(timeline,p.core,targetShape,0,.18,'power2.inOut');
  timeline.to(p.bite,{duration:.16,ease:'power2.inOut',attr:{cx:MOON_BITE.cx,cy:MOON_BITE.cy,r:toMode==='dark'?MOON_BITE.r:0}},0).to(p.ring,{duration:.14,ease:'power2.out',opacity:toMode==='system'?1:0,attr:{r:8.4}},0).to(p.rotor,{rotation:dir*5.5,duration:.075,ease:'power2.out'},0).to(p.rotor,{rotation:0,duration:.12,ease:'power3.out'},.06);
  p.lines.forEach(function(line){if(line.getAttribute('pathLength')!=='1')line.setAttribute('pathLength','1');});
  if(toMode==='light')timeline.set(p.rays,{opacity:1},0).to(p.lines,{strokeDasharray:1,strokeDashoffset:0,duration:.14,ease:'power3.out',stagger:{each:.006,from:'start'}},.015);
  else timeline.to(p.lines,{strokeDasharray:1,strokeDashoffset:1,duration:.09,ease:'power2.in',stagger:{each:.004,from:'end'}},0).to(p.rays,{opacity:0,duration:.08,ease:'power2.out'},.055);
}

function transition(root:HTMLElement,mode:string,persist:boolean):void{var normalized=norm(mode)||'system',from=norm(root.getAttribute('data-sc-theme-mode')||'')||selected(),before=doc.getAttribute('data-sc-theme-resolved')||resolved(selected()),after=resolved(normalized);stopContrast();animateGeometry(root,from,normalized);if(before===after)commit(root,normalized,persist,true);else palette.animate(before,function(){commit(root,normalized,persist,true);},function(context:ThemePaletteContext){lockContrast(root,context);});}
function apply(root:HTMLElement,mode:string,persist:boolean):void{stopContrast();palette.kill();commit(root,norm(mode)||load(),persist,false);}

function setOpen(root:HTMLElement,on:boolean,focus:boolean):void{var button=root.querySelector<HTMLButtonElement>('.sc-theme-toggle'),menu=root.querySelector<HTMLElement>('.sc-theme-menu');if(!button||!menu)return;button.setAttribute('aria-expanded',on?'true':'false');menu.setAttribute('aria-hidden',on?'false':'true');menu.classList.toggle('sc-theme-menu-open',on);if(on&&focus){var option=menu.querySelector<HTMLElement>('[aria-checked="true"]')||menu.querySelector<HTMLElement>('.sc-theme-option');if(option)option.focus();}}
function install(root:HTMLElement):()=>void{
  var button=root.querySelector<HTMLButtonElement>('.sc-theme-toggle'),menu=root.querySelector<HTMLElement>('.sc-theme-menu');if(!button||!menu)return function(){};var control=button.closest<HTMLElement>('.sc-theme-control');if(!control)return function(){};
  var mountedButton=button,mountedMenu=menu,mountedControl=control;
  apply(root,load(),false);var items=options(root),p=parts(root),microCleanup:()=>void=SC.motion&&SC.motion.bindMicroInteraction&&p?SC.motion.bindMicroInteraction(mountedButton,p.svg,{active:{rotation:12},press:{rotation:-6},enterDuration:.1,exitDuration:.15}):function(){};
  function toggle(e:MouseEvent):void{e.preventDefault();e.stopPropagation();setOpen(root,mountedButton.getAttribute('aria-expanded')!=='true',false);}
  function choose(e:MouseEvent):void{var target=e.target instanceof Element?e.target.closest<HTMLElement>('[data-sc-theme-option]'):null;if(!target||!mountedMenu.contains(target))return;e.preventDefault();e.stopPropagation();transition(root,target.getAttribute('data-sc-theme-option')||'',true);setOpen(root,false,false);mountedButton.focus();}
  function outside(e:PointerEvent):void{var target=e.target instanceof Node?e.target:null;if(mountedButton.getAttribute('aria-expanded')==='true'&&target&&!mountedControl.contains(target))setOpen(root,false,false);}
  function keys(e:KeyboardEvent):void{var target=e.target instanceof HTMLElement?e.target:null,i=target?items.indexOf(target):-1;if(target===button&&(e.key==='ArrowDown'||e.key==='ArrowUp')){e.preventDefault();setOpen(root,true,true);return;}if(mountedButton.getAttribute('aria-expanded')!=='true')return;if(e.key==='Escape'){e.preventDefault();setOpen(root,false,false);mountedButton.focus();return;}if(i<0)return;if(e.key==='ArrowDown'||e.key==='ArrowRight'){e.preventDefault();items[(i+1)%items.length]?.focus();}else if(e.key==='ArrowUp'||e.key==='ArrowLeft'){e.preventDefault();items[(i-1+items.length)%items.length]?.focus();}else if(e.key==='Home'){e.preventDefault();items[0]?.focus();}else if(e.key==='End'){e.preventDefault();items[items.length-1]?.focus();}}
  mountedButton.addEventListener('click',toggle);mountedMenu.addEventListener('click',choose);root.addEventListener('keydown',keys);document.addEventListener('pointerdown',outside,true);
  return function(){microCleanup();stopMain();stopContrast();palette.kill();mountedButton.removeEventListener('click',toggle);mountedMenu.removeEventListener('click',choose);root.removeEventListener('keydown',keys);document.removeEventListener('pointerdown',outside,true);};
}

function systemChanged():void{if(selected()!=='system')return;var before=doc.getAttribute('data-sc-theme-resolved')||resolved('system'),after=resolved('system'),root=document.querySelector<HTMLElement>('.sc-catalog-tools');if(before===after)return;stopContrast();palette.animate(before,function(){doc.setAttribute('data-sc-theme-resolved',after);if(root)root.setAttribute('data-sc-theme-actual',after);emit('system',after);},function(context:ThemePaletteContext){lockContrast(root,context);});}
if(SC.motion&&SC.motion.whenLoaded)SC.motion.whenLoaded(function(value:MotionDeps){deps=value;});else if(SC.motion&&SC.motion.whenReady)SC.motion.whenReady(function(value:MotionDeps){deps=value;});
if(systemDark.addEventListener)systemDark.addEventListener('change',systemChanged);else systemDark.addListener(systemChanged);
var api={install:install,seed:seed,apply:apply,sync:function():void{var root=document.querySelector<HTMLElement>('.sc-catalog-tools');if(root){meta(root,selected());setStatic(root,selected());}},getMode:selected,getResolved:function():ThemeResolved{return resolved(selected());}};C.theme=api;SC.theme=api;
})();