(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.catalogTools,P=C&&C.themePalette;if(!SC||!C||!P||SC.__catalogThemeControllerBooted)return;SC.__catalogThemeControllerBooted=true;

/* Modos, storage y estado de animación. */
var MODES=['system','light','dark'],KEY='scTheme:v1',doc=document.documentElement,systemDark=matchMedia('(prefers-color-scheme:dark)'),reduced=matchMedia('(prefers-reduced-motion:reduce)'),deps=null,mainTimeline=null,menuTimeline=null,contrastFlip=null,contrastRelease=null,contrastNode=null,partsCache=new WeakMap(),optionsCache=new WeakMap();
var SUN='M12 7.3A4.7 4.7 0 1 1 12 16.7A4.7 4.7 0 1 1 12 7.3Z';
var MOON_FULL='M12 3A9 9 0 1 1 12 21A9 9 0 1 1 12 3Z';
var AUTO='M12 3.6a8.4 8.4 0 0 1 0 16.8z';
var MOON_BITE={cx:18.3,cy:6.2,r:8.6};

function norm(m){return MODES.indexOf(m)>=0?m:'';}
function resolved(m){return m==='system'?(systemDark.matches?'dark':'light'):m;}
function selected(){return norm(doc.getAttribute('data-sc-theme')||'')||load();}
function gsap(){return deps&&deps.gsap;}function morph(){return deps&&deps.MorphSVGPlugin;}
function spec(kind,speed){return SC.motion&&SC.motion.springSpec?SC.motion.springSpec(kind,speed):{duration:.18,ease:'power2.out'};}
function memory(){var m=norm(window.__scInitialTheme||'');if(m)return m;try{m=norm(localStorage.getItem(KEY)||'');}catch(_){m='';}return m;}
function load(){return memory()||norm(doc.getAttribute('data-sc-theme')||'')||'system';}
function save(m){window.__scInitialTheme=m;try{localStorage.setItem(KEY,m);}catch(_){} }

function options(root){if(!root)return[];var cached=optionsCache.get(root);if(cached)return cached;cached=[].slice.call(root.querySelectorAll('[data-sc-theme-option]'));optionsCache.set(root,cached);return cached;}
function label(m){return m==='system'?'Tema automático. Elegir tema':m==='dark'?'Tema oscuro. Elegir tema':'Tema claro. Elegir tema';}
function emit(m,a){try{dispatchEvent(new CustomEvent('sc:themechange',{detail:{mode:m,resolved:a}}));}catch(_){} }
function meta(root,m){if(!root)return;var b=root.querySelector('.sc-theme-toggle'),a=resolved(m);root.setAttribute('data-sc-theme-mode',m);root.setAttribute('data-sc-theme-actual',a);if(b){b.setAttribute('aria-label',label(m));b.setAttribute('title',m==='system'?'Tema automático':'Tema '+(m==='dark'?'oscuro':'claro'));}options(root).forEach(function(o){var on=o.getAttribute('data-sc-theme-option')===m;o.setAttribute('aria-checked',on?'true':'false');o.classList.toggle('sc-theme-option-selected',on);});}

function parts(root){if(!root)return null;var cached=partsCache.get(root);if(cached)return cached;var b=root.querySelector('.sc-theme-toggle');if(!b)return null;var svg=b.querySelector('[data-sc-theme-icon]'),rotor=b.querySelector('[data-sc-theme-rotor]'),core=b.querySelector('[data-sc-theme-core]'),bite=b.querySelector('[data-sc-theme-bite]'),ring=b.querySelector('[data-sc-theme-auto-ring]'),rays=b.querySelector('[data-sc-theme-rays]'),lines=[].slice.call(b.querySelectorAll('[data-sc-theme-rays] line'));cached=svg&&rotor&&core&&bite&&ring&&rays&&lines.length===8?{button:b,svg:svg,rotor:rotor,core:core,bite:bite,ring:ring,rays:rays,lines:lines}:null;if(cached)partsCache.set(root,cached);return cached;}
function attrs(node,v){Object.keys(v).forEach(function(k){node.setAttribute(k,String(v[k]));});}

/* Cancela timelines antes de retargetear icono, menú o contraste. */
function stopMain(){if(mainTimeline){try{mainTimeline.kill();}catch(_){}mainTimeline=null;}}
function stopMenu(root){if(menuTimeline){try{menuTimeline.kill();}catch(_){}menuTimeline=null;}var menu=root&&root.querySelector('.sc-theme-menu');if(menu&&gsap())gsap().set([menu].concat(options(root)),{clearProps:'height,opacity,overflow,visibility,pointerEvents,willChange'});}
function stopContrast(){if(contrastFlip){try{contrastFlip.kill();}catch(_){}contrastFlip=null;}if(contrastRelease){try{contrastRelease.kill();}catch(_){}contrastRelease=null;}if(contrastNode){contrastNode.style.removeProperty('color');contrastNode=null;}}
function lockContrast(root,context){stopContrast();var p=parts(root),g=gsap(),from=context&&context.from&&context.from['--sc-color-ink'],to=context&&context.to&&context.to['--sc-color-ink'],duration=context&&context.duration;if(!p||!g||!from||!to||!duration||from===to)return;contrastNode=p.button;p.button.style.setProperty('color',from,'important');contrastFlip=g.delayedCall(duration*.5,function(){contrastFlip=null;if(contrastNode===p.button)p.button.style.setProperty('color',to,'important');});contrastRelease=g.delayedCall(duration,function(){contrastRelease=null;if(contrastNode===p.button){p.button.style.removeProperty('color');contrastNode=null;}});}

function prepLines(p,offset){var g=gsap();p.lines.forEach(function(line){if(line.getAttribute('pathLength')!=='1')line.setAttribute('pathLength','1');});if(g){g.set(p.lines,{strokeDasharray:1,strokeDashoffset:offset});return;}p.lines.forEach(function(line){line.style.strokeDasharray='1';line.style.strokeDashoffset=String(offset);});}
function applyStatic(root,mode){var p=parts(root),g=gsap();if(!p)return;mode=norm(mode)||'system';p.core.setAttribute('d',mode==='system'?AUTO:(mode==='dark'?MOON_FULL:SUN));attrs(p.bite,{cx:MOON_BITE.cx,cy:MOON_BITE.cy,r:mode==='dark'?MOON_BITE.r:0});attrs(p.ring,{r:8.4});p.ring.style.opacity=mode==='system'?'1':'0';prepLines(p,mode==='light'?0:1);p.rays.style.opacity=mode==='light'?'1':'0';if(g)g.set(p.rotor,{rotation:0,clearProps:'willChange'});else{p.rotor.style.transform='rotate(0deg)';p.rotor.style.removeProperty('will-change');}p.svg.setAttribute('data-sc-theme-glyph-state',mode);root.setAttribute('data-sc-theme-prepaint-ready','1');root.removeAttribute('data-sc-theme-animating');}
function seed(root){var mode=load();meta(root,mode);applyStatic(root,mode);return mode;}
function setStatic(root,mode){stopMain();stopContrast();applyStatic(root,mode);}

function commit(root,mode,persist,keepIcon){mode=norm(mode)||'system';var prev=selected(),before=doc.getAttribute('data-sc-theme-resolved')||resolved(prev),after=resolved(mode);doc.setAttribute('data-sc-theme',mode);doc.setAttribute('data-sc-theme-resolved',after);window.__scInitialTheme=mode;meta(root,mode);if(!keepIcon)setStatic(root,mode);if(before!==after)emit(mode,after);if(persist&&prev!==mode)save(mode);}
function morphCore(tl,core,shape,pos,spring){if(!morph()){tl.call(function(){core.setAttribute('d',shape);},null,pos+spring.duration);return;}tl.to(core,{duration:spring.duration,ease:spring.ease,morphSVG:{shape:shape,map:'size'},overwrite:'auto'},pos);}

/* Retargetea el icono con física espacial y efectos no oscilantes. */
function animateGeometry(root,from,to){
  var p=parts(root),g=gsap();from=norm(from)||'system';to=norm(to)||'system';if(!p||from===to)return;if(!g||reduced.matches){setStatic(root,to);return;}
  var continuing=root.hasAttribute('data-sc-theme-animating');stopMain();if(!continuing)applyStatic(root,from);
  var spatial=spec('spatial','fast'),effects=spec('effects','fast'),targetShape=to==='system'?AUTO:(to==='dark'?MOON_FULL:SUN),dir=to==='dark'?-1:1,state={timeline:null},rayStep=SC.motion.stagger('fast',p.lines.length);
  root.setAttribute('data-sc-theme-animating','true');p.svg.setAttribute('data-sc-theme-glyph-state',to);g.set(p.rotor,{willChange:'transform'});
  mainTimeline=g.timeline({defaults:{overwrite:'auto'},onComplete:function(){if(mainTimeline!==state.timeline)return;mainTimeline=null;applyStatic(root,to);}});state.timeline=mainTimeline;
  morphCore(mainTimeline,p.core,targetShape,0,spatial);
  mainTimeline.to(p.bite,{duration:spatial.duration,ease:spatial.ease,attr:{cx:MOON_BITE.cx,cy:MOON_BITE.cy,r:to==='dark'?MOON_BITE.r:0}},0)
    .to(p.ring,{duration:effects.duration,ease:effects.ease,opacity:to==='system'?1:0,attr:{r:8.4}},0)
    .to(p.rotor,{rotation:dir*5,duration:spatial.duration*.55,ease:spatial.ease,force3D:true},0)
    .to(p.rotor,{rotation:0,duration:spatial.duration*.7,ease:spatial.ease,force3D:true},spatial.duration*.18);
  p.lines.forEach(function(line){if(line.getAttribute('pathLength')!=='1')line.setAttribute('pathLength','1');});
  if(to==='light')mainTimeline.set(p.rays,{opacity:1},0).to(p.lines,{strokeDasharray:1,strokeDashoffset:0,duration:spatial.duration*.72,ease:spatial.ease,stagger:{each:rayStep,from:'start'}},0);
  else mainTimeline.to(p.lines,{strokeDasharray:1,strokeDashoffset:1,duration:spatial.duration*.58,ease:spatial.ease,stagger:{each:rayStep,from:'end'}},0).to(p.rays,{opacity:0,duration:effects.duration,ease:effects.ease},effects.duration*.2);
}

function transition(root,mode,persist){mode=norm(mode)||'system';var from=norm(root&&root.getAttribute('data-sc-theme-mode')||'')||selected(),before=doc.getAttribute('data-sc-theme-resolved')||resolved(selected()),after=resolved(mode);stopContrast();animateGeometry(root,from,mode);if(before===after)commit(root,mode,persist,true);else P.animate(before,function(){commit(root,mode,persist,true);},function(context){lockContrast(root,context);});}
function apply(root,mode,persist){stopContrast();P.kill();commit(root,norm(mode)||load(),persist,false);}

/* Abre el selector por altura y revela sus opciones en orden de lectura. */
function setOpen(root,on,focus){
  var b=root&&root.querySelector('.sc-theme-toggle'),menu=root&&root.querySelector('.sc-theme-menu'),g=gsap();if(!b||!menu)return;on=!!on;b.setAttribute('aria-expanded',on?'true':'false');
  if(!g||reduced.matches){stopMenu(root);menu.classList.toggle('sc-theme-menu-open',on);menu.setAttribute('aria-hidden',on?'false':'true');if(on&&focus){var fallback=menu.querySelector('[aria-checked="true"]')||menu.querySelector('.sc-theme-option');if(fallback)fallback.focus();}return;}
  stopMenu(root);var items=options(root),count=Math.max(1,items.length),openEase=SC.motion.curve('expand'),closeEase=SC.motion.curve('exit');
  if(on){
    menu.classList.add('sc-theme-menu-open');menu.setAttribute('aria-hidden','false');g.set(menu,{height:'auto',visibility:'visible',pointerEvents:'auto'});var height=menu.offsetHeight,step=(.5-.25)/count;g.set(menu,{height:0,opacity:0,overflow:'hidden',willChange:'height,opacity'});g.set(items,{opacity:0});
    menuTimeline=g.timeline({onComplete:function(){menuTimeline=null;g.set(menu,{clearProps:'height,opacity,overflow,visibility,pointerEvents,willChange'});g.set(items,{clearProps:'opacity'});}})
      .to(menu,{height:height,duration:.5,ease:openEase,overwrite:'auto'},0)
      .to(menu,{opacity:1,duration:.05,ease:'none',overwrite:'auto'},0);
    items.forEach(function(item,index){menuTimeline.to(item,{opacity:1,duration:.25,ease:'none',overwrite:'auto'},index*step);});
    if(focus){var option=menu.querySelector('[aria-checked="true"]')||menu.querySelector('.sc-theme-option');if(option)option.focus();}
    return;
  }
  if(!menu.classList.contains('sc-theme-menu-open')){menu.setAttribute('aria-hidden','true');return;}var current=Math.max(1,menu.getBoundingClientRect().height),closeStep=(.15-.05-.05)/count;g.set(menu,{height:current,overflow:'hidden',visibility:'visible',pointerEvents:'none',willChange:'height,opacity'});g.set(items,{opacity:1});
  menuTimeline=g.timeline({onComplete:function(){menuTimeline=null;menu.classList.remove('sc-theme-menu-open');menu.setAttribute('aria-hidden','true');g.set(menu,{clearProps:'height,opacity,overflow,visibility,pointerEvents,willChange'});g.set(items,{clearProps:'opacity'});}})
    .to(menu,{height:current*.35,duration:.15,ease:closeEase,overwrite:'auto'},0)
    .to(menu,{opacity:0,duration:.05,ease:'none',overwrite:'auto'},.1);
  items.slice().reverse().forEach(function(item,index){menuTimeline.to(item,{opacity:0,duration:.05,ease:'none',overwrite:'auto'},.05+index*closeStep);});
}
function install(root){var b=root&&root.querySelector('.sc-theme-toggle'),menu=root&&root.querySelector('.sc-theme-menu'),ctl=b&&b.closest('.sc-theme-control');if(!b||!menu||!ctl)return function(){};apply(root,load(),false);var items=options(root);
function toggle(e){e.preventDefault();e.stopPropagation();setOpen(root,b.getAttribute('aria-expanded')!=='true',false);}
function choose(e){var o=e.target&&e.target.closest?e.target.closest('[data-sc-theme-option]'):null;if(!o||!menu.contains(o))return;e.preventDefault();e.stopPropagation();transition(root,o.getAttribute('data-sc-theme-option'),true);setOpen(root,false,false);b.focus();}
function outside(e){if(b.getAttribute('aria-expanded')==='true'&&!ctl.contains(e.target))setOpen(root,false,false);}
function keys(e){var i=items.indexOf(e.target);if(e.target===b&&(e.key==='ArrowDown'||e.key==='ArrowUp')){e.preventDefault();setOpen(root,true,true);return;}if(b.getAttribute('aria-expanded')!=='true')return;if(e.key==='Escape'){e.preventDefault();setOpen(root,false,false);b.focus();return;}if(i<0)return;if(e.key==='ArrowDown'||e.key==='ArrowRight'){e.preventDefault();items[(i+1)%items.length].focus();}else if(e.key==='ArrowUp'||e.key==='ArrowLeft'){e.preventDefault();items[(i-1+items.length)%items.length].focus();}else if(e.key==='Home'){e.preventDefault();items[0].focus();}else if(e.key==='End'){e.preventDefault();items[items.length-1].focus();}}
b.addEventListener('click',toggle);menu.addEventListener('click',choose);root.addEventListener('keydown',keys);document.addEventListener('pointerdown',outside,true);return function(){stopMenu(root);stopMain();stopContrast();P.kill();b.removeEventListener('click',toggle);menu.removeEventListener('click',choose);root.removeEventListener('keydown',keys);document.removeEventListener('pointerdown',outside,true);};}

function systemChanged(){if(selected()!=='system')return;var before=doc.getAttribute('data-sc-theme-resolved')||resolved('system'),after=resolved('system'),root=document.querySelector('.sc-catalog-tools');if(before===after)return;stopContrast();P.animate(before,function(){doc.setAttribute('data-sc-theme-resolved',after);if(root)root.setAttribute('data-sc-theme-actual',after);emit('system',after);},function(context){lockContrast(root,context);});}
if(SC.motion&&SC.motion.whenLoaded)SC.motion.whenLoaded(function(x){deps=x;});else if(SC.motion&&SC.motion.whenReady)SC.motion.whenReady(function(x){deps=x;});if(systemDark.addEventListener)systemDark.addEventListener('change',systemChanged);else systemDark.addListener(systemChanged);var api={install:install,seed:seed,apply:apply,sync:function(){var r=document.querySelector('.sc-catalog-tools');if(r){meta(r,selected());setStatic(r,selected());}},getMode:selected,getResolved:function(){return resolved(selected());}};C.theme=api;SC.theme=api;
})();