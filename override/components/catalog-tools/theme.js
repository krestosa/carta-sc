(function(){
'use strict';

var SC=window.SCOverride,CFG=SC&&SC.config,C=SC&&SC.catalogTools;
if(!SC||!CFG||SC.__catalogThemeBooted)return;
SC.__catalogThemeBooted=true;

var MODES=['system','light','dark'],
    STORE_KEY='scTheme:v1',
    doc=document.documentElement,
    systemDark=window.matchMedia('(prefers-color-scheme: dark)'),
    finePointer=window.matchMedia('(hover:hover) and (pointer:fine)'),
    persistHandle=0,
    persistMode='',
    switchToken=0,
    switchTimers=[],
    iconToken=0,
    iconTimeline=null,
    motionDeps=null;

var ICON_STATE={
  system:{
    solar:{rotation:34,scale:.62,opacity:0},
    rays:{rotation:26,scale:.34,opacity:0},
    cut:{x:11.5,y:-8.5},
    auto:{rotation:0,scale:1,opacity:1}
  },
  light:{
    solar:{rotation:0,scale:1,opacity:1},
    rays:{rotation:0,scale:1,opacity:1},
    cut:{x:11.5,y:-8.5},
    auto:{rotation:-38,scale:.62,opacity:0}
  },
  dark:{
    solar:{rotation:-7,scale:1.13,opacity:1},
    rays:{rotation:26,scale:.34,opacity:0},
    cut:{x:0,y:0},
    auto:{rotation:38,scale:.62,opacity:0}
  }
};

function normalize(mode){return MODES.indexOf(mode)>=0?mode:'';}
function selected(){return normalize(doc.getAttribute('data-sc-theme')||'')||'system';}
function resolved(mode){return mode==='system'?(systemDark.matches?'dark':'light'):mode;}
function reducedMotion(){return!!(CFG.queries&&CFG.queries.reducedMotion&&CFG.queries.reducedMotion.matches);}
function load(){
  var mode=normalize(doc.getAttribute('data-sc-theme')||'');
  if(mode)return mode;
  try{mode=normalize(localStorage.getItem(STORE_KEY)||'');}catch(_){mode='';}
  return mode||'system';
}
function saveNow(mode){try{localStorage.setItem(STORE_KEY,mode);}catch(_){}}
function scheduleSave(mode){
  persistMode=mode;
  if(persistHandle)return;
  if(window.requestIdleCallback){
    persistHandle=window.requestIdleCallback(function(){persistHandle=0;saveNow(persistMode);},{timeout:250});
  }else{
    persistHandle=window.setTimeout(function(){persistHandle=0;saveNow(persistMode);},0);
  }
}
function label(mode){
  return mode==='system'?'Tema automático. Elegir tema':mode==='dark'?'Tema oscuro. Elegir tema':'Tema claro. Elegir tema';
}
function setResolved(actual){
  if(doc.getAttribute('data-sc-theme-resolved')!==actual)doc.setAttribute('data-sc-theme-resolved',actual);
}
function emit(mode,actual){
  try{window.dispatchEvent(new CustomEvent('sc:themechange',{detail:{mode:mode,resolved:actual}}));}catch(_){}
}
function options(root){
  return root?Array.prototype.slice.call(root.querySelectorAll('[data-sc-theme-option]')):[];
}
function syncMeta(root,mode){
  if(!root)return;
  var button=root.querySelector('.sc-theme-toggle'),actual=resolved(mode);
  root.setAttribute('data-sc-theme-actual',actual);
  if(button){
    button.setAttribute('aria-label',label(mode));
    button.setAttribute('title',mode==='system'?'Tema automático':'Tema '+(mode==='dark'?'oscuro':'claro'));
  }
  options(root).forEach(function(option){
    var on=option.getAttribute('data-sc-theme-option')===mode;
    option.setAttribute('aria-checked',on?'true':'false');
    option.classList.toggle('sc-theme-option-selected',on);
  });
}
function sync(root,mode){
  mode=normalize(mode)||'system';
  if(!root)return;
  root.setAttribute('data-sc-theme-mode',mode);
  syncMeta(root,mode);
}
function commit(root,mode,persist,skipSync){
  mode=normalize(mode)||'system';
  var previousMode=selected(),
      previousActual=doc.getAttribute('data-sc-theme-resolved')||resolved(previousMode),
      actual=resolved(mode),
      visualChanged=previousActual!==actual,
      modeChanged=previousMode!==mode;
  if(doc.getAttribute('data-sc-theme')!==mode)doc.setAttribute('data-sc-theme',mode);
  setResolved(actual);
  if(!skipSync)sync(root,mode);
  if(visualChanged)emit(mode,actual);
  if(persist&&modeChanged)scheduleSave(mode);
}

function iconParts(root){
  var button=root&&root.querySelector('.sc-theme-toggle');
  return button?{
    solar:button.querySelector('.sc-theme-solar-glyph'),
    rays:button.querySelector('.sc-theme-rays'),
    cut:button.querySelector('.sc-theme-cut'),
    auto:button.querySelector('.sc-theme-auto-glyph')
  }:null;
}
function usableParts(parts){
  return!!(parts&&parts.solar&&parts.rays&&parts.cut&&parts.auto);
}
function setGsapState(gsap,parts,state){
  gsap.set(parts.solar,{rotation:state.solar.rotation,scale:state.solar.scale,autoAlpha:state.solar.opacity,svgOrigin:'12 12',force3D:false});
  gsap.set(parts.rays,{rotation:state.rays.rotation,scale:state.rays.scale,autoAlpha:state.rays.opacity,svgOrigin:'12 12',force3D:false});
  gsap.set(parts.cut,{x:state.cut.x,y:state.cut.y,force3D:false});
  gsap.set(parts.auto,{rotation:state.auto.rotation,scale:state.auto.scale,autoAlpha:state.auto.opacity,svgOrigin:'12 12',force3D:false});
}
function clearGsapState(gsap,parts){
  if(!gsap||!usableParts(parts))return;
  gsap.set([parts.solar,parts.rays,parts.cut,parts.auto],{clearProps:'transform,opacity,visibility'});
}
function cancelIconMotion(root,clearInline){
  iconToken++;
  if(iconTimeline){
    try{iconTimeline.kill();}catch(_){}
    iconTimeline=null;
  }
  if(root){
    root.removeAttribute('data-sc-theme-animating');
    if(clearInline&&motionDeps&&motionDeps.gsap)clearGsapState(motionDeps.gsap,iconParts(root));
  }
  return iconToken;
}
function finalizeIcon(root,token){
  if(token!==iconToken||!root)return;
  var gsap=motionDeps&&motionDeps.gsap,parts=iconParts(root);
  if(iconTimeline){
    try{iconTimeline.kill();}catch(_){}
    iconTimeline=null;
  }
  if(gsap)clearGsapState(gsap,parts);
  root.removeAttribute('data-sc-theme-animating');
}
function animateModeChange(root,from,to){
  if(!root)return;
  from=normalize(from)||'system';
  to=normalize(to)||'system';
  syncMeta(root,to);

  var parts=iconParts(root);
  if(!usableParts(parts)||from===to||reducedMotion()){
    sync(root,to);
    return;
  }

  var gsap=motionDeps&&motionDeps.gsap;
  if(!gsap){
    /* First interaction may happen while the lazily-loaded GSAP bundle is still
       arriving. CSS handles that one transition; no per-frame JS fallback. */
    sync(root,to);
    return;
  }

  var source=ICON_STATE[from],target=ICON_STATE[to],token=cancelIconMotion(root,false),
      ease=(CFG.motion&&CFG.motion.easings&&CFG.motion.easings.strongOut)||'power3.out';

  setGsapState(gsap,parts,source);
  root.setAttribute('data-sc-theme-mode',to);
  root.setAttribute('data-sc-theme-animating','true');

  iconTimeline=gsap.timeline({
    defaults:{duration:.28,ease:ease,overwrite:'auto'},
    onComplete:function(){finalizeIcon(root,token);}
  });
  iconTimeline
    .to(parts.solar,{rotation:target.solar.rotation,scale:target.solar.scale,autoAlpha:target.solar.opacity,svgOrigin:'12 12',force3D:false},0)
    .to(parts.rays,{rotation:target.rays.rotation,scale:target.rays.scale,autoAlpha:target.rays.opacity,svgOrigin:'12 12',force3D:false},0)
    .to(parts.cut,{x:target.cut.x,y:target.cut.y,force3D:false},0)
    .to(parts.auto,{rotation:target.auto.rotation,scale:target.auto.scale,autoAlpha:target.auto.opacity,svgOrigin:'12 12',force3D:false},0);
}
function apply(root,mode,persist){
  cancelIconMotion(root,true);
  commit(root,mode,persist,false);
}

function clearSwitch(){
  switchToken++;
  switchTimers.forEach(clearTimeout);
  switchTimers.length=0;
  doc.classList.remove('sc-theme-transitioning');
  doc.removeAttribute('data-sc-theme-transition-phase');
  doc.style.removeProperty('--sc-theme-transition-surface');
}
function transitionApply(root,mode,persist){
  mode=normalize(mode)||'system';
  var current=selected(),
      visual=normalize(root&&root.getAttribute('data-sc-theme-mode')||'')||current,
      actual=resolved(mode),
      currentActual=doc.getAttribute('data-sc-theme-resolved')||resolved(current);

  animateModeChange(root,visual,mode);

  if(currentActual===actual){
    clearSwitch();
    commit(root,mode,persist,true);
    return;
  }
  if(reducedMotion()){
    clearSwitch();
    apply(root,mode,persist);
    return;
  }

  clearSwitch();
  var token=switchToken,surface='';
  try{surface=getComputedStyle(doc).getPropertyValue('--sc-color-surface').trim();}catch(_){}
  if(surface)doc.style.setProperty('--sc-theme-transition-surface',surface);
  doc.classList.add('sc-theme-transitioning');
  doc.setAttribute('data-sc-theme-transition-phase','idle');
  requestAnimationFrame(function(){
    if(token!==switchToken)return;
    doc.setAttribute('data-sc-theme-transition-phase','out');
  });
  switchTimers.push(setTimeout(function(){
    if(token!==switchToken)return;
    commit(root,mode,persist,true);
  },105));
  switchTimers.push(setTimeout(function(){
    if(token!==switchToken)return;
    doc.setAttribute('data-sc-theme-transition-phase','in');
  },135));
  switchTimers.push(setTimeout(function(){
    if(token!==switchToken)return;
    switchTimers.length=0;
    doc.classList.remove('sc-theme-transitioning');
    doc.removeAttribute('data-sc-theme-transition-phase');
    doc.style.removeProperty('--sc-theme-transition-surface');
  },340));
}

function syncMounted(){
  var root=document.querySelector('.sc-catalog-tools');
  if(root)sync(root,selected());
}
function setOpen(root,on,focusSelected){
  var button=root&&root.querySelector('.sc-theme-toggle'),
      menu=root&&root.querySelector('.sc-theme-menu');
  if(!button||!menu)return;
  on=!!on;
  button.setAttribute('aria-expanded',on?'true':'false');
  menu.setAttribute('aria-hidden',on?'false':'true');
  menu.classList.toggle('sc-theme-menu-open',on);
  if(on&&focusSelected){
    var current=menu.querySelector('[aria-checked="true"]')||menu.querySelector('.sc-theme-option');
    if(current)current.focus();
  }
}
function install(root){
  var button=root&&root.querySelector('.sc-theme-toggle'),
      menu=root&&root.querySelector('.sc-theme-menu'),
      control=button&&button.closest('.sc-theme-control');
  if(!button||!menu||!control)return function(){};

  apply(root,load(),false);
  var closeTimer=0,hovering=false;

  function clearClose(){
    if(closeTimer){clearTimeout(closeTimer);closeTimer=0;}
  }
  function hoverEnter(event){
    if(event.pointerType==='touch'||!finePointer.matches)return;
    hovering=true;
    clearClose();
    setOpen(root,true,false);
  }
  function hoverLeave(event){
    if(event.pointerType==='touch'||!finePointer.matches)return;
    hovering=false;
    clearClose();
    closeTimer=setTimeout(function(){
      closeTimer=0;
      if(!hovering&&!control.contains(document.activeElement))setOpen(root,false,false);
    },120);
  }
  function toggle(event){
    if(event){event.preventDefault();event.stopPropagation();}
    if(finePointer.matches&&hovering){setOpen(root,true,false);return;}
    setOpen(root,button.getAttribute('aria-expanded')!=='true',false);
  }
  function choose(event){
    var option=event.target&&event.target.closest?event.target.closest('[data-sc-theme-option]'):null;
    if(!option||!menu.contains(option))return;
    event.preventDefault();
    event.stopPropagation();
    transitionApply(root,option.getAttribute('data-sc-theme-option'),true);
    setOpen(root,false,false);
    button.focus();
  }
  function outside(event){
    if(button.getAttribute('aria-expanded')!=='true'||control.contains(event.target))return;
    clearClose();
    setOpen(root,false,false);
  }
  function keydown(event){
    var open=button.getAttribute('aria-expanded')==='true',
        target=event.target,
        itemsNow=options(root),
        index=itemsNow.indexOf(target);
    if(target===button&&(event.key==='ArrowDown'||event.key==='ArrowUp')){
      event.preventDefault();
      setOpen(root,true,true);
      return;
    }
    if(!open)return;
    if(event.key==='Escape'){
      event.preventDefault();
      clearClose();
      setOpen(root,false,false);
      button.focus();
      return;
    }
    if(index<0)return;
    if(event.key==='ArrowDown'||event.key==='ArrowRight'){
      event.preventDefault();
      itemsNow[(index+1)%itemsNow.length].focus();
    }else if(event.key==='ArrowUp'||event.key==='ArrowLeft'){
      event.preventDefault();
      itemsNow[(index-1+itemsNow.length)%itemsNow.length].focus();
    }else if(event.key==='Home'){
      event.preventDefault();
      itemsNow[0].focus();
    }else if(event.key==='End'){
      event.preventDefault();
      itemsNow[itemsNow.length-1].focus();
    }
  }

  control.addEventListener('pointerenter',hoverEnter);
  control.addEventListener('pointerleave',hoverLeave);
  button.addEventListener('click',toggle);
  menu.addEventListener('click',choose);
  root.addEventListener('keydown',keydown);
  document.addEventListener('pointerdown',outside,true);

  return function(){
    clearClose();
    clearSwitch();
    cancelIconMotion(root,true);
    control.removeEventListener('pointerenter',hoverEnter);
    control.removeEventListener('pointerleave',hoverLeave);
    button.removeEventListener('click',toggle);
    menu.removeEventListener('click',choose);
    root.removeEventListener('keydown',keydown);
    document.removeEventListener('pointerdown',outside,true);
  };
}
function systemChanged(){
  if(selected()!=='system')return;
  var before=doc.getAttribute('data-sc-theme-resolved')||'',actual=resolved('system');
  setResolved(actual);
  syncMounted();
  if(before&&before!==actual)emit('system',actual);
}

if(SC.motion&&typeof SC.motion.whenReady==='function'){
  SC.motion.whenReady(function(deps){motionDeps=deps;});
}
if(systemDark.addEventListener)systemDark.addEventListener('change',systemChanged);
else if(systemDark.addListener)systemDark.addListener(systemChanged);

var api={
  install:install,
  apply:apply,
  sync:syncMounted,
  getMode:selected,
  getResolved:function(){return resolved(selected());}
};
C.theme=api;
SC.theme=api;
})();
