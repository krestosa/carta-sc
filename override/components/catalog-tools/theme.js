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
    motionDeps=null,
    SWITCH_COMMIT=210,
    SWITCH_IN=225,
    SWITCH_END=545;

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
function saveNow(mode){try{localStorage.setItem(STORE_KEY,mode);}catch(_){} }
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
function prepareMotion(){
  if(SC.motion&&typeof SC.motion.prepare==='function')SC.motion.prepare();
}

function iconLayers(root){
  var host=root&&root.querySelector('[data-sc-theme-icon]');
  if(!host)return null;
  var system=host.querySelector('[data-sc-theme-layer="system"]'),
      light=host.querySelector('[data-sc-theme-layer="light"]'),
      dark=host.querySelector('[data-sc-theme-layer="dark"]');
  return system&&light&&dark?{system:system,light:light,dark:dark,all:[system,light,dark]}:null;
}
function clearIconStyles(gsap,layers){
  if(!gsap||!layers)return;
  gsap.set(layers.all,{clearProps:'transform,opacity,visibility'});
}
function cancelIconMotion(root,clearInline){
  iconToken++;
  if(iconTimeline){
    try{iconTimeline.kill();}catch(_){}
    iconTimeline=null;
  }
  if(root){
    root.removeAttribute('data-sc-theme-animating');
    if(clearInline&&motionDeps&&motionDeps.gsap)clearIconStyles(motionDeps.gsap,iconLayers(root));
  }
  return iconToken;
}
function finalizeIcon(root,token){
  if(token!==iconToken||!root)return;
  var gsap=motionDeps&&motionDeps.gsap;
  if(iconTimeline){
    try{iconTimeline.kill();}catch(_){}
    iconTimeline=null;
  }
  if(gsap)clearIconStyles(gsap,iconLayers(root));
  root.removeAttribute('data-sc-theme-animating');
}
function animateModeChange(root,from,to){
  if(!root)return;
  from=normalize(from)||'system';
  to=normalize(to)||'system';
  syncMeta(root,to);

  var layers=iconLayers(root);
  if(!layers||from===to||reducedMotion()){
    sync(root,to);
    return;
  }

  var gsap=motionDeps&&motionDeps.gsap;
  if(!gsap){
    root.setAttribute('data-sc-theme-mode',to);
    return;
  }

  var outgoing=layers[from],
      incoming=layers[to],
      direction=MODES.indexOf(to)>=MODES.indexOf(from)?1:-1,
      token=cancelIconMotion(root,true);

  root.setAttribute('data-sc-theme-animating','true');
  root.setAttribute('data-sc-theme-mode',to);

  gsap.set(layers.all,{
    autoAlpha:0,
    scale:.84,
    rotation:0,
    x:0,
    y:0,
    transformOrigin:'50% 50%',
    force3D:false
  });
  gsap.set(outgoing,{
    autoAlpha:1,
    scale:1,
    rotation:0,
    x:0,
    y:0,
    transformOrigin:'50% 50%',
    force3D:false
  });
  gsap.set(incoming,{
    autoAlpha:0,
    scale:.84,
    rotation:8*direction,
    x:1.5*direction,
    y:0,
    transformOrigin:'50% 50%',
    force3D:false
  });

  iconTimeline=gsap.timeline({onComplete:function(){finalizeIcon(root,token);}});
  iconTimeline
    .to(outgoing,{
      autoAlpha:0,
      scale:.84,
      rotation:-8*direction,
      x:-1.5*direction,
      duration:.2,
      ease:'power2.in',
      transformOrigin:'50% 50%',
      force3D:false
    },0)
    .to(incoming,{
      autoAlpha:1,
      scale:1,
      rotation:0,
      x:0,
      duration:.34,
      ease:'power3.out',
      transformOrigin:'50% 50%',
      force3D:false
    },.07);
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

  prepareMotion();
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
  },SWITCH_COMMIT));
  switchTimers.push(setTimeout(function(){
    if(token!==switchToken)return;
    doc.setAttribute('data-sc-theme-transition-phase','in');
  },SWITCH_IN));
  switchTimers.push(setTimeout(function(){
    if(token!==switchToken)return;
    switchTimers.length=0;
    doc.classList.remove('sc-theme-transitioning');
    doc.removeAttribute('data-sc-theme-transition-phase');
    doc.style.removeProperty('--sc-theme-transition-surface');
  },SWITCH_END));
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
    prepareMotion();
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
    prepareMotion();
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
