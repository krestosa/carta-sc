(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.catalogTools,T=SC&&SC.transitionPatterns;
if(!SC||!C||SC.__catalogThemeControllerBooted)return;SC.__catalogThemeControllerBooted=true;

var MODES=['system','light','dark'],KEY='scTheme:v1',doc=document.documentElement,systemDark=matchMedia('(prefers-color-scheme:dark)'),deps=null,menuTimeline=null,partsCache=new WeakMap(),optionsCache=new WeakMap();
var SUN='M12 7.3A4.7 4.7 0 1 1 12 16.7A4.7 4.7 0 1 1 12 7.3Z';
var MOON_FULL='M12 3A9 9 0 1 1 12 21A9 9 0 1 1 12 3Z';
var AUTO='M12 3.6a8.4 8.4 0 0 1 0 16.8z';
var MOON_BITE={cx:18.3,cy:6.2,r:8.6};

function norm(m){return MODES.indexOf(m)>=0?m:'';}
function resolved(m){return m==='system'?(systemDark.matches?'dark':'light'):m;}
function selected(){return norm(doc.getAttribute('data-sc-theme')||'')||load();}
function gsap(){return deps&&deps.gsap;}
function memory(){var m=norm(window.__scInitialTheme||'');if(m)return m;try{m=norm(localStorage.getItem(KEY)||'');}catch(_){m='';}return m;}
function load(){return memory()||norm(doc.getAttribute('data-sc-theme')||'')||'system';}
function save(m){window.__scInitialTheme=m;try{localStorage.setItem(KEY,m);}catch(_){} }
function options(root){if(!root)return[];var cached=optionsCache.get(root);if(cached)return cached;cached=[].slice.call(root.querySelectorAll('[data-sc-theme-option]'));optionsCache.set(root,cached);return cached;}
function label(m){return m==='system'?'Tema automático. Elegir tema':m==='dark'?'Tema oscuro. Elegir tema':'Tema claro. Elegir tema';}
function emit(m,a){try{dispatchEvent(new CustomEvent('sc:themechange',{detail:{mode:m,resolved:a}}));}catch(_){} }
function meta(root,m){if(!root)return;var b=root.querySelector('.sc-theme-toggle'),a=resolved(m);root.setAttribute('data-sc-theme-mode',m);root.setAttribute('data-sc-theme-actual',a);if(b){b.setAttribute('aria-label',label(m));b.setAttribute('title',m==='system'?'Tema automático':'Tema '+(m==='dark'?'oscuro':'claro'));}options(root).forEach(function(o){var on=o.getAttribute('data-sc-theme-option')===m;o.setAttribute('aria-checked',on?'true':'false');o.classList.toggle('sc-theme-option-selected',on);});}

function parts(root){if(!root)return null;var cached=partsCache.get(root);if(cached)return cached;var b=root.querySelector('.sc-theme-toggle');if(!b)return null;var svg=b.querySelector('[data-sc-theme-icon]'),rotor=b.querySelector('[data-sc-theme-rotor]'),core=b.querySelector('[data-sc-theme-core]'),bite=b.querySelector('[data-sc-theme-bite]'),ring=b.querySelector('[data-sc-theme-auto-ring]'),rays=b.querySelector('[data-sc-theme-rays]'),lines=[].slice.call(b.querySelectorAll('[data-sc-theme-rays] line'));cached=svg&&rotor&&core&&bite&&ring&&rays&&lines.length===8?{svg:svg,rotor:rotor,core:core,bite:bite,ring:ring,rays:rays,lines:lines}:null;if(cached)partsCache.set(root,cached);return cached;}
function attrs(node,v){Object.keys(v).forEach(function(k){node.setAttribute(k,String(v[k]));});}
function applyStatic(root,mode){var p=parts(root),g=gsap();if(!p)return;mode=norm(mode)||'system';p.core.setAttribute('d',mode==='system'?AUTO:(mode==='dark'?MOON_FULL:SUN));attrs(p.bite,{cx:MOON_BITE.cx,cy:MOON_BITE.cy,r:mode==='dark'?MOON_BITE.r:0});attrs(p.ring,{r:8.4});p.ring.style.opacity=mode==='system'?'1':'0';p.lines.forEach(function(line){line.style.strokeDasharray='1';line.style.strokeDashoffset=mode==='light'?'0':'1';});p.rays.style.opacity=mode==='light'?'1':'0';if(g)g.set(p.rotor,{rotation:0,clearProps:'transform,willChange'});else p.rotor.style.removeProperty('transform');p.svg.setAttribute('data-sc-theme-glyph-state',mode);root.setAttribute('data-sc-theme-prepaint-ready','1');root.removeAttribute('data-sc-theme-animating');}
function seed(root){var mode=load();meta(root,mode);applyStatic(root,mode);return mode;}
function commit(root,mode,persist){mode=norm(mode)||'system';var prev=selected(),before=doc.getAttribute('data-sc-theme-resolved')||resolved(prev),after=resolved(mode);doc.setAttribute('data-sc-theme',mode);doc.setAttribute('data-sc-theme-resolved',after);window.__scInitialTheme=mode;meta(root,mode);applyStatic(root,mode);if(before!==after)emit(mode,after);if(persist&&prev!==mode)save(mode);}
/* No existe un contrato oficial de transición global de color scheme; el estado cambia directamente. */
function transition(root,mode,persist){commit(root,norm(mode)||'system',persist);}
function apply(root,mode,persist){commit(root,norm(mode)||load(),persist);}

function stopMenu(root){var menu=root&&root.querySelector('.sc-theme-menu'),g=gsap(),items=options(root);if(menuTimeline){menuTimeline.kill();menuTimeline=null;}if(menu&&g)g.set([menu].concat(items),{clearProps:'height,opacity,overflow,visibility,pointerEvents,transform,willChange'});}
function focusFirst(items){if(items&&items.length&&document.documentElement.contains(items[0]))items[0].focus();}
function setOpen(root,on,focus){
  var b=root&&root.querySelector('.sc-theme-toggle'),menu=root&&root.querySelector('.sc-theme-menu'),g=gsap();if(!b||!menu)return;on=!!on;b.setAttribute('aria-expanded',on?'true':'false');var items=options(root);
  if(!g){stopMenu(root);menu.classList.toggle('sc-theme-menu-open',on);menu.setAttribute('aria-hidden',on?'false':'true');if(on&&focus)focusFirst(items);return;}
  var count=Math.max(1,items.length),openEase=T&&T.easing?T.easing.webEmphasized:(SC.motion&&SC.motion.curve?SC.motion.curve('emphasized'):function(p){return p;}),closeEase=T&&T.easing?T.easing.accelerate:(SC.motion&&SC.motion.curve?SC.motion.curve('emphasizedAccelerate'):function(p){return p;});
  stopMenu(root);
  if(on){
    menu.classList.add('sc-theme-menu-open');menu.setAttribute('aria-hidden','false');
    var full=Math.max(1,menu.offsetHeight),duration=.50,itemDuration=.25,step=(duration-itemDuration)/count;
    g.set(menu,{height:0,opacity:0,overflow:'hidden',visibility:'visible',pointerEvents:'auto',willChange:'height,opacity'});g.set(items,{opacity:0,willChange:'opacity'});
    menuTimeline=g.timeline({onComplete:function(){menuTimeline=null;g.set(menu,{clearProps:'height,opacity,overflow,visibility,pointerEvents,willChange'});g.set(items,{clearProps:'opacity,willChange'});if(focus&&menu.classList.contains('sc-theme-menu-open'))focusFirst(items);}})
      .to(menu,{height:full,duration:duration,ease:openEase,overwrite:'auto'},0)
      .to(menu,{opacity:1,duration:.05,ease:'none',overwrite:'auto'},0);
    items.forEach(function(item,index){menuTimeline.to(item,{opacity:1,duration:itemDuration,ease:'none',overwrite:'auto'},index*step);});return;
  }
  if(!menu.classList.contains('sc-theme-menu-open')){menu.setAttribute('aria-hidden','true');return;}
  var current=Math.max(1,menu.offsetHeight),target=current*.35,closeDuration=.15,fadeDuration=.05,fadeStart=.10,itemDurationClose=.05,itemInitial=.05,itemStep=(closeDuration-itemInitial-itemDurationClose)/count,closingItems=items.slice().reverse();
  g.set(menu,{height:current,opacity:1,overflow:'hidden',visibility:'visible',pointerEvents:'none',willChange:'height,opacity'});g.set(items,{opacity:1,willChange:'opacity'});
  menuTimeline=g.timeline({onComplete:function(){menuTimeline=null;menu.classList.remove('sc-theme-menu-open');menu.setAttribute('aria-hidden','true');g.set(menu,{clearProps:'height,opacity,overflow,visibility,pointerEvents,willChange'});g.set(items,{clearProps:'opacity,willChange'});}})
    .to(menu,{height:target,duration:closeDuration,ease:closeEase,overwrite:'auto'},0)
    .to(menu,{opacity:0,duration:fadeDuration,ease:'none',overwrite:'auto'},fadeStart);
  closingItems.forEach(function(item,index){menuTimeline.to(item,{opacity:0,duration:itemDurationClose,ease:'none',overwrite:'auto'},itemInitial+index*itemStep);});
}
function install(root){var b=root&&root.querySelector('.sc-theme-toggle'),menu=root&&root.querySelector('.sc-theme-menu'),ctl=b&&b.closest('.sc-theme-control');if(!b||!menu||!ctl)return function(){};apply(root,load(),false);var items=options(root);function toggle(e){e.preventDefault();e.stopPropagation();setOpen(root,b.getAttribute('aria-expanded')!=='true',false);}function choose(e){var o=e.target&&e.target.closest?e.target.closest('[data-sc-theme-option]'):null;if(!o||!menu.contains(o))return;e.preventDefault();e.stopPropagation();transition(root,o.getAttribute('data-sc-theme-option'),true);setOpen(root,false,false);b.focus();}function outside(e){if(b.getAttribute('aria-expanded')==='true'&&!ctl.contains(e.target))setOpen(root,false,false);}function keys(e){var i=items.indexOf(e.target);if(e.target===b&&(e.key==='ArrowDown'||e.key==='ArrowUp')){e.preventDefault();setOpen(root,true,true);return;}if(b.getAttribute('aria-expanded')!=='true')return;if(e.key==='Escape'){e.preventDefault();setOpen(root,false,false);b.focus();return;}if(i<0)return;if(e.key==='ArrowDown'||e.key==='ArrowRight'){e.preventDefault();items[(i+1)%items.length].focus();}else if(e.key==='ArrowUp'||e.key==='ArrowLeft'){e.preventDefault();items[(i-1+items.length)%items.length].focus();}else if(e.key==='Home'){e.preventDefault();items[0].focus();}else if(e.key==='End'){e.preventDefault();items[items.length-1].focus();}}b.addEventListener('click',toggle);menu.addEventListener('click',choose);root.addEventListener('keydown',keys);document.addEventListener('pointerdown',outside,true);return function(){stopMenu(root);menu.classList.remove('sc-theme-menu-open');menu.setAttribute('aria-hidden','true');b.setAttribute('aria-expanded','false');b.removeEventListener('click',toggle);menu.removeEventListener('click',choose);root.removeEventListener('keydown',keys);document.removeEventListener('pointerdown',outside,true);};}
function systemChanged(){if(selected()!=='system')return;var root=document.querySelector('.sc-catalog-tools');if(!root)return;var before=doc.getAttribute('data-sc-theme-resolved')||resolved('system'),after=resolved('system');if(before===after)return;doc.setAttribute('data-sc-theme-resolved',after);root.setAttribute('data-sc-theme-actual',after);applyStatic(root,'system');emit('system',after);}
if(SC.motion&&SC.motion.whenLoaded)SC.motion.whenLoaded(function(x){deps=x;});else if(SC.motion&&SC.motion.whenReady)SC.motion.whenReady(function(x){deps=x;});
if(systemDark.addEventListener)systemDark.addEventListener('change',systemChanged);else systemDark.addListener(systemChanged);
var api={install:install,seed:seed,apply:apply,sync:function(){var r=document.querySelector('.sc-catalog-tools');if(r){meta(r,selected());applyStatic(r,selected());}},getMode:selected,getResolved:function(){return resolved(selected());}};C.theme=api;SC.theme=api;
})();