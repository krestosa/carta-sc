(function(){
'use strict';

var SC=window.SCOverride,CFG=SC&&SC.config,C=SC&&SC.catalogTools;
if(!SC||!CFG||SC.__catalogThemeBooted)return;
SC.__catalogThemeBooted=true;

var MODES=['system','light','dark'],STORE_KEY='scTheme:v1',doc=document.documentElement,systemDark=window.matchMedia('(prefers-color-scheme: dark)'),finePointer=window.matchMedia('(hover:hover) and (pointer:fine)'),persistHandle=0,persistMode='',iconToken=0,iconTimeline=null,paletteToken=0,paletteTween=null,motionDeps=null;
var THEME_VARS=['--sc-color-ink','--sc-color-heading','--sc-color-copy','--sc-color-muted','--sc-color-trait','--sc-color-surface','--sc-color-surface-transparent','--sc-color-border','--sc-color-border-strong'];

function normalize(mode){return MODES.indexOf(mode)>=0?mode:'';}
function selected(){return normalize(doc.getAttribute('data-sc-theme')||'')||'system';}
function resolved(mode){return mode==='system'?(systemDark.matches?'dark':'light'):mode;}
function reducedMotion(){return!!(CFG.queries&&CFG.queries.reducedMotion&&CFG.queries.reducedMotion.matches);}
function load(){var mode=normalize(doc.getAttribute('data-sc-theme')||'');if(mode)return mode;try{mode=normalize(localStorage.getItem(STORE_KEY)||'');}catch(_){mode='';}return mode||'system';}
function saveNow(mode){try{localStorage.setItem(STORE_KEY,mode);}catch(_){} }
function scheduleSave(mode){persistMode=mode;if(persistHandle)return;if(window.requestIdleCallback)persistHandle=window.requestIdleCallback(function(){persistHandle=0;saveNow(persistMode);},{timeout:250});else persistHandle=window.setTimeout(function(){persistHandle=0;saveNow(persistMode);},0);}
function label(mode){return mode==='system'?'Tema automático. Elegir tema':mode==='dark'?'Tema oscuro. Elegir tema':'Tema claro. Elegir tema';}
function setResolved(actual){if(doc.getAttribute('data-sc-theme-resolved')!==actual)doc.setAttribute('data-sc-theme-resolved',actual);}
function emit(mode,actual){try{window.dispatchEvent(new CustomEvent('sc:themechange',{detail:{mode:mode,resolved:actual}}));}catch(_){} }
function options(root){return root?Array.prototype.slice.call(root.querySelectorAll('[data-sc-theme-option]')):[];}
function syncMeta(root,mode){if(!root)return;var button=root.querySelector('.sc-theme-toggle'),actual=resolved(mode);root.setAttribute('data-sc-theme-actual',actual);if(button){button.setAttribute('aria-label',label(mode));button.setAttribute('title',mode==='system'?'Tema automático':'Tema '+(mode==='dark'?'oscuro':'claro'));}options(root).forEach(function(option){var on=option.getAttribute('data-sc-theme-option')===mode;option.setAttribute('aria-checked',on?'true':'false');option.classList.toggle('sc-theme-option-selected',on);});}

function iconLayers(root){var host=root&&root.querySelector('[data-sc-theme-icon]');if(!host)return null;var system=host.querySelector('[data-sc-theme-layer="system"]'),light=host.querySelector('[data-sc-theme-layer="light"]'),dark=host.querySelector('[data-sc-theme-layer="dark"]');return system&&light&&dark?{host:host,system:system,light:light,dark:dark,all:[system,light,dark]}:null;}
function setLayerPresentation(layer,on){if(!layer)return;layer.style.setProperty('display','block','important');layer.style.setProperty('visibility','visible','important');layer.style.setProperty('opacity',on?'1':'0','important');layer.style.setProperty('pointer-events','none','important');layer.style.removeProperty('transform');}
function setStaticIcon(root,mode){mode=normalize(mode)||'system';var layers=iconLayers(root);if(!layers)return;layers.host.style.setProperty('display','block','important');layers.host.style.setProperty('visibility','visible','important');layers.host.style.setProperty('opacity','1','important');layers.host.style.setProperty('color','var(--sc-color-ink,#0a0a0a)','important');MODES.forEach(function(name){setLayerPresentation(layers[name],name===mode);});}
function releaseLayerPresentation(layers){if(!layers)return;layers.all.forEach(function(layer){layer.style.removeProperty('display');layer.style.removeProperty('visibility');layer.style.removeProperty('opacity');layer.style.removeProperty('pointer-events');layer.style.removeProperty('transform');});}
function sync(root,mode){mode=normalize(mode)||'system';if(!root)return;root.setAttribute('data-sc-theme-mode',mode);syncMeta(root,mode);setStaticIcon(root,mode);}
function commit(root,mode,persist,skipSync){mode=normalize(mode)||'system';var previousMode=selected(),previousActual=doc.getAttribute('data-sc-theme-resolved')||resolved(previousMode),actual=resolved(mode),visualChanged=previousActual!==actual,modeChanged=previousMode!==mode;if(doc.getAttribute('data-sc-theme')!==mode)doc.setAttribute('data-sc-theme',mode);setResolved(actual);if(!skipSync)sync(root,mode);if(visualChanged)emit(mode,actual);if(persist&&modeChanged)scheduleSave(mode);}
function cancelIconMotion(root,restoreStatic){iconToken++;if(iconTimeline){try{iconTimeline.kill();}catch(_){}iconTimeline=null;}if(root){root.removeAttribute('data-sc-theme-animating');var layers=iconLayers(root),gsap=motionDeps&&motionDeps.gsap;if(gsap&&layers)gsap.killTweensOf(layers.all);if(restoreStatic)setStaticIcon(root,normalize(root.getAttribute('data-sc-theme-mode')||'')||selected());}return iconToken;}
function finalizeIcon(root,token,to){if(token!==iconToken||!root)return;if(iconTimeline){try{iconTimeline.kill();}catch(_){}iconTimeline=null;}root.removeAttribute('data-sc-theme-animating');setStaticIcon(root,to);}
function animateModeChange(root,from,to){
  if(!root)return;
  from=normalize(from)||'system';to=normalize(to)||'system';syncMeta(root,to);
  var layers=iconLayers(root),gsap=motionDeps&&motionDeps.gsap;
  if(!layers||from===to||!gsap){sync(root,to);return;}
  var outgoing=layers[from],incoming=layers[to],token=cancelIconMotion(root,false),short=reducedMotion(),outDuration=short?.09:.18,inDuration=short?.14:.28;
  releaseLayerPresentation(layers);
  layers.host.style.setProperty('display','block','important');layers.host.style.setProperty('visibility','visible','important');layers.host.style.setProperty('opacity','1','important');layers.host.style.setProperty('color','var(--sc-color-ink,#0a0a0a)','important');
  root.setAttribute('data-sc-theme-animating','true');root.setAttribute('data-sc-theme-mode',to);
  gsap.set(layers.all,{opacity:0});gsap.set(outgoing,{opacity:1});gsap.set(incoming,{opacity:0});
  iconTimeline=gsap.timeline({onComplete:function(){finalizeIcon(root,token,to);}})
    .to(outgoing,{opacity:0,duration:outDuration,ease:'power1.in',overwrite:'auto'},0)
    .to(incoming,{opacity:1,duration:inDuration,ease:'power2.out',overwrite:'auto'},short?.03:.06);
}

function capturePalette(){var styles=getComputedStyle(doc),values={};THEME_VARS.forEach(function(name){values[name]=styles.getPropertyValue(name).trim();});return values;}
function clearPaletteInline(){THEME_VARS.forEach(function(name){doc.style.removeProperty(name);});}
function applyPaletteInline(values){THEME_VARS.forEach(function(name){if(values&&values[name])doc.style.setProperty(name,values[name]);});}
function cancelPaletteMotion(){paletteToken++;if(paletteTween){try{paletteTween.kill();}catch(_){}paletteTween=null;}}
function animatePalette(root,mode,persist){
  mode=normalize(mode)||'system';
  var gsap=motionDeps&&motionDeps.gsap,current=selected(),currentActual=doc.getAttribute('data-sc-theme-resolved')||resolved(current),targetActual=resolved(mode);
  if(currentActual===targetActual||!gsap){cancelPaletteMotion();clearPaletteInline();commit(root,mode,persist,true);return;}
  var from=capturePalette();
  cancelPaletteMotion();
  clearPaletteInline();
  commit(root,mode,persist,true);
  var to=capturePalette(),token=paletteToken,duration=reducedMotion()?.18:.48,tweenVars={duration:duration,ease:reducedMotion()?'power1.inOut':'power2.inOut',overwrite:'auto',onComplete:function(){if(token!==paletteToken)return;paletteTween=null;clearPaletteInline();},onInterrupt:function(){if(token===paletteToken)paletteTween=null;}};
  applyPaletteInline(from);
  THEME_VARS.forEach(function(name){tweenVars[name]=to[name];});
  paletteTween=gsap.to(doc,tweenVars);
}
function apply(root,mode,persist){cancelIconMotion(root,false);cancelPaletteMotion();clearPaletteInline();commit(root,mode,persist,false);}
function transitionApply(root,mode,persist){mode=normalize(mode)||'system';var current=selected(),visual=normalize(root&&root.getAttribute('data-sc-theme-mode')||'')||current;animateModeChange(root,visual,mode);animatePalette(root,mode,persist);}

function syncMounted(){var root=document.querySelector('.sc-catalog-tools');if(root)sync(root,selected());}
function setOpen(root,on,focusSelected){var button=root&&root.querySelector('.sc-theme-toggle'),menu=root&&root.querySelector('.sc-theme-menu');if(!button||!menu)return;on=!!on;button.setAttribute('aria-expanded',on?'true':'false');menu.setAttribute('aria-hidden',on?'false':'true');menu.classList.toggle('sc-theme-menu-open',on);if(on&&focusSelected){var current=menu.querySelector('[aria-checked="true"]')||menu.querySelector('.sc-theme-option');if(current)current.focus();}}
function install(root){
  var button=root&&root.querySelector('.sc-theme-toggle'),menu=root&&root.querySelector('.sc-theme-menu'),control=button&&button.closest('.sc-theme-control');if(!button||!menu||!control)return function(){};
  button.style.setProperty('visibility','visible','important');button.style.setProperty('color','var(--sc-color-ink,#0a0a0a)','important');apply(root,load(),false);var closeTimer=0,hovering=false;
  function clearClose(){if(closeTimer){clearTimeout(closeTimer);closeTimer=0;}}
  function hoverEnter(event){if(event.pointerType==='touch'||!finePointer.matches)return;hovering=true;clearClose();setOpen(root,true,false);}
  function hoverLeave(event){if(event.pointerType==='touch'||!finePointer.matches)return;hovering=false;clearClose();closeTimer=setTimeout(function(){closeTimer=0;if(!hovering&&!control.contains(document.activeElement))setOpen(root,false,false);},120);}
  function toggle(event){if(event){event.preventDefault();event.stopPropagation();}if(finePointer.matches&&hovering){setOpen(root,true,false);return;}setOpen(root,button.getAttribute('aria-expanded')!=='true',false);}
  function choose(event){var option=event.target&&event.target.closest?event.target.closest('[data-sc-theme-option]'):null;if(!option||!menu.contains(option))return;event.preventDefault();event.stopPropagation();transitionApply(root,option.getAttribute('data-sc-theme-option'),true);setOpen(root,false,false);button.focus();}
  function outside(event){if(button.getAttribute('aria-expanded')!=='true'||control.contains(event.target))return;clearClose();setOpen(root,false,false);}
  function keydown(event){var open=button.getAttribute('aria-expanded')==='true',target=event.target,itemsNow=options(root),index=itemsNow.indexOf(target);if(target===button&&(event.key==='ArrowDown'||event.key==='ArrowUp')){event.preventDefault();setOpen(root,true,true);return;}if(!open)return;if(event.key==='Escape'){event.preventDefault();clearClose();setOpen(root,false,false);button.focus();return;}if(index<0)return;if(event.key==='ArrowDown'||event.key==='ArrowRight'){event.preventDefault();itemsNow[(index+1)%itemsNow.length].focus();}else if(event.key==='ArrowUp'||event.key==='ArrowLeft'){event.preventDefault();itemsNow[(index-1+itemsNow.length)%itemsNow.length].focus();}else if(event.key==='Home'){event.preventDefault();itemsNow[0].focus();}else if(event.key==='End'){event.preventDefault();itemsNow[itemsNow.length-1].focus();}}
  control.addEventListener('pointerenter',hoverEnter);control.addEventListener('pointerleave',hoverLeave);button.addEventListener('click',toggle);menu.addEventListener('click',choose);root.addEventListener('keydown',keydown);document.addEventListener('pointerdown',outside,true);
  return function(){clearClose();cancelIconMotion(root,false);cancelPaletteMotion();clearPaletteInline();control.removeEventListener('pointerenter',hoverEnter);control.removeEventListener('pointerleave',hoverLeave);button.removeEventListener('click',toggle);menu.removeEventListener('click',choose);root.removeEventListener('keydown',keydown);document.removeEventListener('pointerdown',outside,true);};
}
function systemChanged(){if(selected()!=='system')return;var before=doc.getAttribute('data-sc-theme-resolved')||'',actual=resolved('system');setResolved(actual);syncMounted();if(before&&before!==actual)emit('system',actual);}

if(SC.motion&&typeof SC.motion.whenLoaded==='function')SC.motion.whenLoaded(function(deps){motionDeps=deps;});else if(SC.motion&&typeof SC.motion.whenReady==='function')SC.motion.whenReady(function(deps){motionDeps=deps;});
if(systemDark.addEventListener)systemDark.addEventListener('change',systemChanged);else if(systemDark.addListener)systemDark.addListener(systemChanged);
var api={install:install,apply:apply,sync:syncMounted,getMode:selected,getResolved:function(){return resolved(selected());}};C.theme=api;SC.theme=api;
})();