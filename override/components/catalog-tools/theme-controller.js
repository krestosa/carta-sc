(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.catalogTools,P=C&&C.themePalette;if(!SC||!C||!P||SC.__catalogThemeControllerBooted)return;SC.__catalogThemeControllerBooted=true;
var MODES=['system','light','dark'],KEY='scTheme:v1',doc=document.documentElement,systemDark=matchMedia('(prefers-color-scheme:dark)'),fine=matchMedia('(hover:hover) and (pointer:fine)'),compact=matchMedia('(max-width:992px)'),deps=null,mainTimeline=null,hoverTween=null,saveHandle=0,pending='';
var FULL='M12 6.45A5.55 5.55 0 1 1 12 17.55A5.55 5.55 0 1 1 12 6.45Z';
var MOON_FULL='M12 4.4A7.6 7.6 0 1 1 12 19.6A7.6 7.6 0 1 1 12 4.4Z';
var AUTO='M12 3.6a8.4 8.4 0 0 1 0 16.8z';
var MOON_BITE={cx:17.35,cy:7.1,r:7.25};
function norm(m){return MODES.indexOf(m)>=0?m:'';}function selected(){return norm(doc.getAttribute('data-sc-theme')||'')||'system';}function resolved(m){return m==='system'?(systemDark.matches?'dark':'light'):m;}function gsap(){return deps&&deps.gsap;}function morph(){return deps&&deps.MorphSVGPlugin;}
function load(){var m=norm(doc.getAttribute('data-sc-theme')||'');if(m)return m;try{m=norm(localStorage.getItem(KEY)||'');}catch(_){m='';}return m||'system';}
function save(m){pending=m;if(saveHandle)return;var done=function(){saveHandle=0;try{localStorage.setItem(KEY,pending);}catch(_){}};saveHandle=window.requestIdleCallback?requestIdleCallback(done,{timeout:250}):setTimeout(done,0);}
function options(root){return root?[].slice.call(root.querySelectorAll('[data-sc-theme-option]')):[];}function label(m){return m==='system'?'Tema automático. Elegir tema':m==='dark'?'Tema oscuro. Elegir tema':'Tema claro. Elegir tema';}
function emit(m,a){try{dispatchEvent(new CustomEvent('sc:themechange',{detail:{mode:m,resolved:a}}));}catch(_){}}
function meta(root,m){if(!root)return;var b=root.querySelector('.sc-theme-toggle'),a=resolved(m);root.setAttribute('data-sc-theme-mode',m);root.setAttribute('data-sc-theme-actual',a);if(b){b.setAttribute('aria-label',label(m));b.setAttribute('title',m==='system'?'Tema automático':'Tema '+(m==='dark'?'oscuro':'claro'));}options(root).forEach(function(o){var on=o.getAttribute('data-sc-theme-option')===m;o.setAttribute('aria-checked',on?'true':'false');o.classList.toggle('sc-theme-option-selected',on);});}
function parts(root){var b=root&&root.querySelector('.sc-theme-toggle');if(!b)return null;var svg=b.querySelector('[data-sc-theme-icon]'),core=b.querySelector('[data-sc-theme-core]'),bite=b.querySelector('[data-sc-theme-bite]'),ring=b.querySelector('[data-sc-theme-auto-ring]'),rays=b.querySelector('[data-sc-theme-rays]'),lines=[].slice.call(b.querySelectorAll('[data-sc-theme-rays] line'));return svg&&core&&bite&&ring&&rays&&lines.length===8?{button:b,svg:svg,core:core,bite:bite,ring:ring,rays:rays,lines:lines}:null;}
function attrs(node,v){Object.keys(v).forEach(function(k){node.setAttribute(k,String(v[k]));});}
function stopMain(){if(mainTimeline){try{mainTimeline.kill();}catch(_){}mainTimeline=null;}}
function stopHover(){if(hoverTween){try{hoverTween.kill();}catch(_){}hoverTween=null;}}
function setButtonRotation(p,deg,animate){var g=gsap();if(!p)return;stopHover();if(g&&animate)hoverTween=g.to(p.button,{rotation:deg,duration:compact.matches?.22:.32,ease:'power3.out',overwrite:'auto',onComplete:function(){hoverTween=null;}});else if(g)g.set(p.button,{rotation:deg});else p.button.style.transform='rotate('+deg+'deg)';}
function prepareRays(p,on){var g=gsap(),offset=on?0:1;p.lines.forEach(function(line){line.setAttribute('pathLength','1');line.style.strokeDasharray='1';line.style.strokeDashoffset=String(offset);});if(g)g.set(p.lines,{strokeDasharray:1,strokeDashoffset:offset});p.rays.style.opacity=on?'1':'0';}
function applyStatic(root,mode){var p=parts(root),g=gsap();if(!p)return;mode=norm(mode)||'system';p.core.setAttribute('d',mode==='system'?AUTO:(mode==='dark'?MOON_FULL:FULL));attrs(p.bite,{cx:MOON_BITE.cx,cy:MOON_BITE.cy,r:mode==='dark'?MOON_BITE.r:0});attrs(p.ring,{r:8.4});p.ring.style.opacity=mode==='system'?'1':'0';prepareRays(p,mode==='light');if(g)g.set(p.button,{rotation:0});else p.button.style.transform='rotate(0deg)';p.svg.setAttribute('data-sc-theme-glyph-state',mode);}
function setStatic(root,mode){stopMain();stopHover();applyStatic(root,mode);}
function commit(root,mode,persist,keepIcon){mode=norm(mode)||'system';var prev=selected(),before=doc.getAttribute('data-sc-theme-resolved')||resolved(prev),after=resolved(mode);doc.setAttribute('data-sc-theme',mode);doc.setAttribute('data-sc-theme-resolved',after);meta(root,mode);if(!keepIcon)setStatic(root,mode);if(before!==after)emit(mode,after);if(persist&&prev!==mode)save(mode);}
function morphCore(tl,core,shape,pos,duration,ease){if(!morph()){tl.call(function(){core.setAttribute('d',shape);},null,pos+duration);return;}tl.to(core,{duration:duration,ease:ease,morphSVG:{shape:shape,map:'size'},overwrite:'auto'},pos);}
function animateGeometry(root,from,to){
  var p=parts(root),g=gsap();from=norm(from)||'system';to=norm(to)||'system';if(!p||!g||from===to){setStatic(root,to);return;}
  stopMain();stopHover();applyStatic(root,from);
  var mobile=compact.matches||!fine.matches,neutral=mobile?.19:.25,build=mobile?.23:.29,overlap=mobile?.055:.075,pre=neutral-overlap,
      coreNeedsNeutral=from!=='light',coreNeedsBuild=to!=='light',coreStart=(coreNeedsNeutral&&coreNeedsBuild)?neutral:pre,
      biteEase='sine.inOut',shapeEase='power2.inOut',buildEase='power3.out',kick=(to==='dark'?-1:1)*(mobile?5.5:8.5),settleStart=mobile?.13:.17;
  root.setAttribute('data-sc-theme-animating','true');p.svg.setAttribute('data-sc-theme-glyph-state',to);
  mainTimeline=g.timeline({defaults:{overwrite:'auto'},onComplete:function(){mainTimeline=null;root.removeAttribute('data-sc-theme-animating');applyStatic(root,to);}});

  /* Momentum reference: one finite rotation on the HTML button, never on SVG geometry. */
  mainTimeline.to(p.button,{rotation:kick,duration:mobile?.15:.2,ease:'power2.out'},0)
    .to(p.button,{rotation:0,duration:mobile?.24:.3,ease:'power3.out'},settleStart);

  /* Source collapses toward the shared full-circle state. */
  if(from==='light'){
    mainTimeline.to(p.lines,{strokeDashoffset:1,duration:neutral,ease:'power2.inOut'},0)
      .to(p.rays,{opacity:0,duration:neutral*.66,ease:'sine.inOut'},neutral*.24);
  }else if(from==='dark'){
    mainTimeline.to(p.bite,{duration:neutral,ease:biteEase,attr:{r:0}},0);
    morphCore(mainTimeline,p.core,FULL,0,neutral,shapeEase);
  }else{
    morphCore(mainTimeline,p.core,FULL,0,neutral,shapeEase);
    mainTimeline.to(p.ring,{duration:neutral,ease:shapeEase,attr:{r:5.55},opacity:0},0);
  }

  /* Destination starts before the source fully settles whenever it touches independent geometry. */
  if(to==='light'){
    p.rays.style.opacity='1';g.set(p.lines,{strokeDasharray:1,strokeDashoffset:1});
    mainTimeline.to(p.lines,{strokeDashoffset:0,duration:build,ease:buildEase},pre)
      .fromTo(p.rays,{opacity:0},{opacity:1,duration:build*.68,ease:'sine.out'},pre);
  }else if(to==='dark'){
    mainTimeline.to(p.bite,{duration:build,ease:biteEase,attr:{cx:MOON_BITE.cx,cy:MOON_BITE.cy,r:MOON_BITE.r}},pre);
    morphCore(mainTimeline,p.core,MOON_FULL,coreStart,build,shapeEase);
  }else{
    mainTimeline.fromTo(p.ring,{attr:{r:5.55},opacity:0},{duration:build,ease:shapeEase,attr:{r:8.4},opacity:1},pre);
    morphCore(mainTimeline,p.core,AUTO,coreStart,build,shapeEase);
  }
}
function transition(root,mode,persist){mode=norm(mode)||'system';var from=norm(root&&root.getAttribute('data-sc-theme-mode')||'')||selected(),before=doc.getAttribute('data-sc-theme-resolved')||resolved(selected()),after=resolved(mode);animateGeometry(root,from,mode);if(before===after)commit(root,mode,persist,true);else P.animate(before,function(){commit(root,mode,persist,true);});}
function apply(root,mode,persist){P.kill();commit(root,norm(mode)||'system',persist,false);}
function isCompact(){return compact.matches||!fine.matches;}
function syncOpenRotation(root,on){var p=parts(root);if(!p)return;var mode=norm(root.getAttribute('data-sc-theme-mode')||'')||selected();if(isCompact()&&on&&mode==='light')setButtonRotation(p,18,true);else if(isCompact())setButtonRotation(p,0,true);}
function setOpen(root,on,focus){var b=root&&root.querySelector('.sc-theme-toggle'),menu=root&&root.querySelector('.sc-theme-menu');if(!b||!menu)return;on=!!on;b.setAttribute('aria-expanded',on?'true':'false');menu.setAttribute('aria-hidden',on?'false':'true');menu.classList.toggle('sc-theme-menu-open',on);syncOpenRotation(root,on);if(on&&focus){var o=menu.querySelector('[aria-checked="true"]')||menu.querySelector('.sc-theme-option');if(o)o.focus();}}
function install(root){var b=root&&root.querySelector('.sc-theme-toggle'),menu=root&&root.querySelector('.sc-theme-menu'),ctl=b&&b.closest('.sc-theme-control');if(!b||!menu||!ctl)return function(){};apply(root,load(),false);var timer=0,inside=false,items=options(root);
function enter(e){if(e.pointerType==='touch')return;inside=true;if(timer){clearTimeout(timer);timer=0;}if(fine.matches)setOpen(root,true,false);}
function leave(e){if(e.pointerType==='touch')return;inside=false;if(timer)clearTimeout(timer);if(fine.matches)timer=setTimeout(function(){timer=0;if(!inside&&!ctl.contains(document.activeElement))setOpen(root,false,false);},120);}
function iconEnter(e){if(e.pointerType==='touch'||isCompact())return;var mode=norm(root.getAttribute('data-sc-theme-mode')||'')||selected();if(mode==='light')setButtonRotation(parts(root),18,true);}
function iconLeave(e){if(e.pointerType==='touch'||isCompact())return;setButtonRotation(parts(root),0,true);}
function toggle(e){e.preventDefault();e.stopPropagation();setOpen(root,fine.matches&&inside&&!isCompact()?true:b.getAttribute('aria-expanded')!=='true',false);}
function choose(e){var o=e.target&&e.target.closest?e.target.closest('[data-sc-theme-option]'):null;if(!o||!menu.contains(o))return;e.preventDefault();e.stopPropagation();transition(root,o.getAttribute('data-sc-theme-option'),true);setOpen(root,false,false);b.focus();}
function outside(e){if(b.getAttribute('aria-expanded')==='true'&&!ctl.contains(e.target))setOpen(root,false,false);}
function keys(e){var i=items.indexOf(e.target);if(e.target===b&&(e.key==='ArrowDown'||e.key==='ArrowUp')){e.preventDefault();setOpen(root,true,true);return;}if(b.getAttribute('aria-expanded')!=='true')return;if(e.key==='Escape'){e.preventDefault();setOpen(root,false,false);b.focus();return;}if(i<0)return;if(e.key==='ArrowDown'||e.key==='ArrowRight'){e.preventDefault();items[(i+1)%items.length].focus();}else if(e.key==='ArrowUp'||e.key==='ArrowLeft'){e.preventDefault();items[(i-1+items.length)%items.length].focus();}else if(e.key==='Home'){e.preventDefault();items[0].focus();}else if(e.key==='End'){e.preventDefault();items[items.length-1].focus();}}
ctl.addEventListener('pointerenter',enter);ctl.addEventListener('pointerleave',leave);b.addEventListener('pointerenter',iconEnter);b.addEventListener('pointerleave',iconLeave);b.addEventListener('click',toggle);menu.addEventListener('click',choose);root.addEventListener('keydown',keys);document.addEventListener('pointerdown',outside,true);return function(){if(timer)clearTimeout(timer);stopMain();stopHover();P.kill();ctl.removeEventListener('pointerenter',enter);ctl.removeEventListener('pointerleave',leave);b.removeEventListener('pointerenter',iconEnter);b.removeEventListener('pointerleave',iconLeave);b.removeEventListener('click',toggle);menu.removeEventListener('click',choose);root.removeEventListener('keydown',keys);document.removeEventListener('pointerdown',outside,true);};}
function systemChanged(){if(selected()!=='system')return;var before=doc.getAttribute('data-sc-theme-resolved')||resolved('system'),after=resolved('system'),root=document.querySelector('.sc-catalog-tools');if(before===after)return;P.animate(before,function(){doc.setAttribute('data-sc-theme-resolved',after);if(root)root.setAttribute('data-sc-theme-actual',after);emit('system',after);});}
if(SC.motion&&SC.motion.whenLoaded)SC.motion.whenLoaded(function(x){deps=x;});else if(SC.motion&&SC.motion.whenReady)SC.motion.whenReady(function(x){deps=x;});if(systemDark.addEventListener)systemDark.addEventListener('change',systemChanged);else systemDark.addListener(systemChanged);var api={install:install,apply:apply,sync:function(){var r=document.querySelector('.sc-catalog-tools');if(r){meta(r,selected());setStatic(r,selected());}},getMode:selected,getResolved:function(){return resolved(selected());}};C.theme=api;SC.theme=api;
})();