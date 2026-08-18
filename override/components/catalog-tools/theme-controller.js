(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.catalogTools,P=C&&C.themePalette;if(!SC||!C||!P||SC.__catalogThemeControllerBooted)return;SC.__catalogThemeControllerBooted=true;
var MODES=['system','light','dark'],KEY='scTheme:v1',doc=document.documentElement,systemDark=matchMedia('(prefers-color-scheme:dark)'),fine=matchMedia('(hover:hover) and (pointer:fine)'),reduced=matchMedia('(prefers-reduced-motion:reduce)'),deps=null,mainTimeline=null,contrastFlip=null,contrastRelease=null,contrastNode=null;
var NEUTRAL='M12 3.6A8.4 8.4 0 1 1 12 20.4A8.4 8.4 0 1 1 12 3.6Z';
var SUN='M12 7.3A4.7 4.7 0 1 1 12 16.7A4.7 4.7 0 1 1 12 7.3Z';
var MOON_FULL='M12 3A9 9 0 1 1 12 21A9 9 0 1 1 12 3Z';
var AUTO='M12 3.6a8.4 8.4 0 0 1 0 16.8z';
var MOON_BITE={cx:18.3,cy:6.2,r:8.6};
function norm(m){return MODES.indexOf(m)>=0?m:'';}
function resolved(m){return m==='system'?(systemDark.matches?'dark':'light'):m;}
function selected(){return norm(doc.getAttribute('data-sc-theme')||'')||load();}
function gsap(){return deps&&deps.gsap;}function morph(){return deps&&deps.MorphSVGPlugin;}
function memory(){var m=norm(window.__scInitialTheme||'');if(m)return m;try{m=norm(localStorage.getItem(KEY)||'');}catch(_){m='';}return m;}
function load(){return memory()||norm(doc.getAttribute('data-sc-theme')||'')||'system';}
function save(m){window.__scInitialTheme=m;try{localStorage.setItem(KEY,m);}catch(_){}}
function options(root){return root?[].slice.call(root.querySelectorAll('[data-sc-theme-option]')):[];}
function label(m){return m==='system'?'Tema automático. Elegir tema':m==='dark'?'Tema oscuro. Elegir tema':'Tema claro. Elegir tema';}
function emit(m,a){try{dispatchEvent(new CustomEvent('sc:themechange',{detail:{mode:m,resolved:a}}));}catch(_){}}
function meta(root,m){if(!root)return;var b=root.querySelector('.sc-theme-toggle'),a=resolved(m);root.setAttribute('data-sc-theme-mode',m);root.setAttribute('data-sc-theme-actual',a);if(b){b.setAttribute('aria-label',label(m));b.setAttribute('title',m==='system'?'Tema automático':'Tema '+(m==='dark'?'oscuro':'claro'));}options(root).forEach(function(o){var on=o.getAttribute('data-sc-theme-option')===m;o.setAttribute('aria-checked',on?'true':'false');o.classList.toggle('sc-theme-option-selected',on);});}
function parts(root){var b=root&&root.querySelector('.sc-theme-toggle');if(!b)return null;var svg=b.querySelector('[data-sc-theme-icon]'),rotor=b.querySelector('[data-sc-theme-rotor]'),core=b.querySelector('[data-sc-theme-core]'),bite=b.querySelector('[data-sc-theme-bite]'),ring=b.querySelector('[data-sc-theme-auto-ring]'),rays=b.querySelector('[data-sc-theme-rays]'),lines=[].slice.call(b.querySelectorAll('[data-sc-theme-rays] line'));return svg&&rotor&&core&&bite&&ring&&rays&&lines.length===8?{button:b,svg:svg,rotor:rotor,core:core,bite:bite,ring:ring,rays:rays,lines:lines}:null;}
function attrs(node,v){Object.keys(v).forEach(function(k){node.setAttribute(k,String(v[k]));});}
function stopMain(){if(mainTimeline){try{mainTimeline.kill();}catch(_){}mainTimeline=null;}}
function stopContrast(){if(contrastFlip){try{contrastFlip.kill();}catch(_){}contrastFlip=null;}if(contrastRelease){try{contrastRelease.kill();}catch(_){}contrastRelease=null;}if(contrastNode){contrastNode.style.removeProperty('color');contrastNode=null;}}
function lockContrast(root,context){stopContrast();var p=parts(root),g=gsap(),from=context&&context.from&&context.from['--sc-color-ink'],to=context&&context.to&&context.to['--sc-color-ink'],duration=context&&context.duration;if(!p||!g||!from||!to||!duration||from===to)return;contrastNode=p.button;p.button.style.setProperty('color',from,'important');contrastFlip=g.delayedCall(duration*.5,function(){contrastFlip=null;if(contrastNode===p.button)p.button.style.setProperty('color',to,'important');});contrastRelease=g.delayedCall(duration,function(){contrastRelease=null;if(contrastNode===p.button){p.button.style.removeProperty('color');contrastNode=null;}});}
function prepLines(p,offset){p.lines.forEach(function(line){line.setAttribute('pathLength','1');line.style.strokeDasharray='1';line.style.strokeDashoffset=String(offset);});var g=gsap();if(g)g.set(p.lines,{strokeDasharray:1,strokeDashoffset:offset});}
function applyStatic(root,mode){var p=parts(root),g=gsap();if(!p)return;mode=norm(mode)||'system';p.core.setAttribute('d',mode==='system'?AUTO:(mode==='dark'?MOON_FULL:SUN));attrs(p.bite,{cx:MOON_BITE.cx,cy:MOON_BITE.cy,r:mode==='dark'?MOON_BITE.r:0});attrs(p.ring,{r:8.4});p.ring.style.opacity=mode==='system'?'1':'0';prepLines(p,mode==='light'?0:1);p.rays.style.opacity=mode==='light'?'1':'0';if(g)g.set(p.rotor,{rotation:0});else p.rotor.style.transform='rotate(0deg)';p.svg.setAttribute('data-sc-theme-glyph-state',mode);root.setAttribute('data-sc-theme-prepaint-ready','1');}
function seed(root){var mode=load();meta(root,mode);applyStatic(root,mode);return mode;}
function setStatic(root,mode){stopMain();stopContrast();applyStatic(root,mode);}
function commit(root,mode,persist,keepIcon){mode=norm(mode)||'system';var prev=selected(),before=doc.getAttribute('data-sc-theme-resolved')||resolved(prev),after=resolved(mode);doc.setAttribute('data-sc-theme',mode);doc.setAttribute('data-sc-theme-resolved',after);window.__scInitialTheme=mode;meta(root,mode);if(!keepIcon)setStatic(root,mode);if(before!==after)emit(mode,after);if(persist&&prev!==mode)save(mode);}
function morphCore(tl,core,shape,pos,duration,ease){if(!morph()){tl.call(function(){core.setAttribute('d',shape);},null,pos+duration);return;}tl.to(core,{duration:duration,ease:ease,morphSVG:{shape:shape,map:'size'},overwrite:'auto'},pos);}
function animateGeometry(root,from,to){
  var p=parts(root),g=gsap();from=norm(from)||'system';to=norm(to)||'system';if(!p||!g||from===to||reduced.matches){setStatic(root,to);return;}
  stopMain();applyStatic(root,from);root.setAttribute('data-sc-theme-animating','true');p.svg.setAttribute('data-sc-theme-glyph-state',to);g.set(p.rotor,{willChange:'transform'});
  var neutralEnd=0,shapeEase='power2.inOut',biteEase='power2.inOut';
  mainTimeline=g.timeline({defaults:{overwrite:'auto'},onComplete:function(){mainTimeline=null;root.removeAttribute('data-sc-theme-animating');p.rotor.style.removeProperty('will-change');applyStatic(root,to);}});
  var dir=to==='dark'?-1:1;mainTimeline.to(p.rotor,{rotation:dir*7.5,duration:.09,ease:'power2.out'},0).to(p.rotor,{rotation:0,duration:.13,ease:'power3.out'},.07);

  if(from==='light'){
    p.rays.style.opacity='1';prepLines(p,0);
    mainTimeline.to(p.lines,{strokeDashoffset:1,duration:.06,ease:'power2.in',stagger:{each:.009,from:'end'}},0);
    morphCore(mainTimeline,p.core,NEUTRAL,0,.135,shapeEase);
    neutralEnd=.14;mainTimeline.set(p.rays,{opacity:0},neutralEnd);
  }else if(from==='dark'){
    mainTimeline.to(p.bite,{duration:.11,ease:biteEase,attr:{r:0}},0);
    morphCore(mainTimeline,p.core,NEUTRAL,0,.12,shapeEase);neutralEnd=.12;
  }else{
    morphCore(mainTimeline,p.core,NEUTRAL,0,.12,shapeEase);
    mainTimeline.to(p.ring,{duration:.085,ease:'power2.in',opacity:0},0);neutralEnd=.12;
  }

  if(to==='light'){
    morphCore(mainTimeline,p.core,SUN,neutralEnd,.11,shapeEase);
    mainTimeline.set(p.rays,{opacity:1},neutralEnd+.02).set(p.lines,{strokeDasharray:1,strokeDashoffset:1},neutralEnd+.02);
    mainTimeline.to(p.lines,{strokeDashoffset:0,duration:.055,ease:'power3.out',stagger:{each:.01,from:'start'}},neutralEnd+.035);
  }else if(to==='dark'){
    morphCore(mainTimeline,p.core,MOON_FULL,neutralEnd,.12,shapeEase);
    mainTimeline.to(p.bite,{duration:.13,ease:biteEase,attr:{cx:MOON_BITE.cx,cy:MOON_BITE.cy,r:MOON_BITE.r}},neutralEnd);
  }else{
    mainTimeline.set(p.ring,{opacity:0,attr:{r:8.4}},neutralEnd);
    morphCore(mainTimeline,p.core,AUTO,neutralEnd,.12,shapeEase);
    mainTimeline.to(p.ring,{duration:.1,ease:'power2.out',opacity:1},neutralEnd+.015);
  }
}
function transition(root,mode,persist){mode=norm(mode)||'system';var from=norm(root&&root.getAttribute('data-sc-theme-mode')||'')||selected(),before=doc.getAttribute('data-sc-theme-resolved')||resolved(selected()),after=resolved(mode);stopContrast();animateGeometry(root,from,mode);if(before===after)commit(root,mode,persist,true);else P.animate(before,function(){commit(root,mode,persist,true);},function(context){lockContrast(root,context);});}
function apply(root,mode,persist){stopContrast();P.kill();commit(root,norm(mode)||load(),persist,false);}
function setOpen(root,on,focus){var b=root&&root.querySelector('.sc-theme-toggle'),menu=root&&root.querySelector('.sc-theme-menu');if(!b||!menu)return;on=!!on;b.setAttribute('aria-expanded',on?'true':'false');menu.setAttribute('aria-hidden',on?'false':'true');menu.classList.toggle('sc-theme-menu-open',on);if(on&&focus){var o=menu.querySelector('[aria-checked="true"]')||menu.querySelector('.sc-theme-option');if(o)o.focus();}}
function install(root){var b=root&&root.querySelector('.sc-theme-toggle'),menu=root&&root.querySelector('.sc-theme-menu'),ctl=b&&b.closest('.sc-theme-control');if(!b||!menu||!ctl)return function(){};apply(root,load(),false);var timer=0,inside=false,items=options(root),p=parts(root),microCleanup=SC.motion&&SC.motion.bindMicroInteraction&&p?SC.motion.bindMicroInteraction(b,p.svg,{active:{rotation:12},press:{rotation:-6},enterDuration:.1,exitDuration:.15}):function(){};
function enter(e){if(e.pointerType==='touch')return;inside=true;if(timer){clearTimeout(timer);timer=0;}if(fine.matches)setOpen(root,true,false);}
function leave(e){if(e.pointerType==='touch')return;inside=false;if(timer)clearTimeout(timer);if(fine.matches)timer=setTimeout(function(){timer=0;if(!inside&&!ctl.contains(document.activeElement))setOpen(root,false,false);},100);}
function toggle(e){e.preventDefault();e.stopPropagation();setOpen(root,fine.matches&&inside?true:b.getAttribute('aria-expanded')!=='true',false);}
function choose(e){var o=e.target&&e.target.closest?e.target.closest('[data-sc-theme-option]'):null;if(!o||!menu.contains(o))return;e.preventDefault();e.stopPropagation();transition(root,o.getAttribute('data-sc-theme-option'),true);setOpen(root,false,false);b.focus();}
function outside(e){if(b.getAttribute('aria-expanded')==='true'&&!ctl.contains(e.target))setOpen(root,false,false);}
function keys(e){var i=items.indexOf(e.target);if(e.target===b&&(e.key==='ArrowDown'||e.key==='ArrowUp')){e.preventDefault();setOpen(root,true,true);return;}if(b.getAttribute('aria-expanded')!=='true')return;if(e.key==='Escape'){e.preventDefault();setOpen(root,false,false);b.focus();return;}if(i<0)return;if(e.key==='ArrowDown'||e.key==='ArrowRight'){e.preventDefault();items[(i+1)%items.length].focus();}else if(e.key==='ArrowUp'||e.key==='ArrowLeft'){e.preventDefault();items[(i-1+items.length)%items.length].focus();}else if(e.key==='Home'){e.preventDefault();items[0].focus();}else if(e.key==='End'){e.preventDefault();items[items.length-1].focus();}}
ctl.addEventListener('pointerenter',enter);ctl.addEventListener('pointerleave',leave);b.addEventListener('click',toggle);menu.addEventListener('click',choose);root.addEventListener('keydown',keys);document.addEventListener('pointerdown',outside,true);return function(){if(timer)clearTimeout(timer);microCleanup();stopMain();stopContrast();P.kill();ctl.removeEventListener('pointerenter',enter);ctl.removeEventListener('pointerleave',leave);b.removeEventListener('click',toggle);menu.removeEventListener('click',choose);root.removeEventListener('keydown',keys);document.removeEventListener('pointerdown',outside,true);};}
function systemChanged(){if(selected()!=='system')return;var before=doc.getAttribute('data-sc-theme-resolved')||resolved('system'),after=resolved('system'),root=document.querySelector('.sc-catalog-tools');if(before===after)return;stopContrast();P.animate(before,function(){doc.setAttribute('data-sc-theme-resolved',after);if(root)root.setAttribute('data-sc-theme-actual',after);emit('system',after);},function(context){lockContrast(root,context);});}
if(SC.motion&&SC.motion.whenLoaded)SC.motion.whenLoaded(function(x){deps=x;});else if(SC.motion&&SC.motion.whenReady)SC.motion.whenReady(function(x){deps=x;});if(systemDark.addEventListener)systemDark.addEventListener('change',systemChanged);else systemDark.addListener(systemChanged);var api={install:install,seed:seed,apply:apply,sync:function(){var r=document.querySelector('.sc-catalog-tools');if(r){meta(r,selected());setStatic(r,selected());}},getMode:selected,getResolved:function(){return resolved(selected());}};C.theme=api;SC.theme=api;
})();
