(function(){
'use strict';
var SC=window.SCOverride,CFG=SC&&SC.config,C=SC&&SC.catalogTools;if(!SC||!CFG||SC.__catalogThemeBooted)return;SC.__catalogThemeBooted=true;
var MODES=['system','light','dark'],STORE_KEY='scTheme:v1',doc=document.documentElement,systemDark=window.matchMedia('(prefers-color-scheme: dark)'),persistHandle=0,persistMode='',switchToken=0,switchTimers=[];
var MAIN_STATE={
  system:{solar:'rotate(34deg) scale(.62)',solarOpacity:0,rays:'rotate(26deg) scale(.34)',raysOpacity:0,cut:'translate(11.5px,-8.5px)',auto:'rotate(0deg) scale(1)',autoOpacity:1},
  light:{solar:'rotate(0deg) scale(1)',solarOpacity:1,rays:'rotate(0deg) scale(1)',raysOpacity:1,cut:'translate(11.5px,-8.5px)',auto:'rotate(-38deg) scale(.62)',autoOpacity:0},
  dark:{solar:'rotate(-7deg) scale(1.13)',solarOpacity:1,rays:'rotate(26deg) scale(.34)',raysOpacity:0,cut:'translate(0px,0px)',auto:'rotate(38deg) scale(.62)',autoOpacity:0}
};
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
function sync(root,mode){
  if(!root)return;var button=root.querySelector('.sc-theme-toggle'),actual=resolved(mode);
  root.setAttribute('data-sc-theme-mode',mode);root.setAttribute('data-sc-theme-actual',actual);
  if(button){button.setAttribute('aria-label',label(mode));button.setAttribute('title',mode==='system'?'Tema automático':'Tema '+(mode==='dark'?'oscuro':'claro'));}
  options(root).forEach(function(option){var on=option.getAttribute('data-sc-theme-option')===mode;option.setAttribute('aria-checked',on?'true':'false');option.classList.toggle('sc-theme-option-selected',on);});
}
function commit(root,mode,persist,skipSync){
  mode=normalize(mode)||'system';
  var previousMode=selected(),previousActual=doc.getAttribute('data-sc-theme-resolved')||resolved(previousMode),actual=resolved(mode),visualChanged=previousActual!==actual,modeChanged=previousMode!==mode;
  if(doc.getAttribute('data-sc-theme')!==mode)doc.setAttribute('data-sc-theme',mode);
  setResolved(actual);
  if(!skipSync)sync(root,mode);
  if(visualChanged)emit(mode,actual);
  if(persist&&modeChanged)scheduleSave(mode);
}
function apply(root,mode,persist){commit(root,mode,persist,false);}
function cancelNodeMotion(node){if(!node||!node.__scThemeMotion)return;try{node.__scThemeMotion.cancel();}catch(_){}node.__scThemeMotion=null;}
function play(node,keyframes,duration){
  if(!node||!node.animate||reducedMotion())return null;cancelNodeMotion(node);
  var animation=node.animate(keyframes,{duration:duration||680,easing:'linear',fill:'none'});node.__scThemeMotion=animation;
  animation.onfinish=animation.oncancel=function(){if(node.__scThemeMotion===animation)node.__scThemeMotion=null;};return animation;
}
function clearInline(node){if(!node)return;cancelNodeMotion(node);node.style.removeProperty('transform');node.style.removeProperty('opacity');}
function clearHoverMotion(scope){if(!scope)return;Array.prototype.forEach.call(scope.querySelectorAll('[data-sc-theme-hover-inline]'),function(node){node.removeAttribute('data-sc-theme-hover-inline');clearInline(node);});}
function pin(node,transform){if(!node)return;node.setAttribute('data-sc-theme-hover-inline','');node.style.transform=transform;}
function animateMainHover(root,on){
  var button=root&&root.querySelector('.sc-theme-toggle');if(!button)return;clearHoverMotion(button);if(!on||reducedMotion())return;
  var mode=normalize(root.getAttribute('data-sc-theme-mode')||'')||selected(),node,other;
  if(mode==='system'){
    node=button.querySelector('.sc-theme-auto-glyph');other=button.querySelector('.sc-theme-auto-half');pin(node,'rotate(0deg) scale(1)');pin(other,'translateX(0px)');
    play(node,[{transform:'rotate(0deg) scale(1)',offset:0},{transform:'rotate(-9deg) scale(.965)',offset:.17},{transform:'rotate(148deg) scale(1.055)',offset:.58},{transform:'rotate(-12deg) scale(.99)',offset:.82},{transform:'rotate(0deg) scale(1)',offset:1}],700);
    play(other,[{transform:'translateX(0px)',offset:0},{transform:'translateX(-.25px)',offset:.22},{transform:'translateX(.7px)',offset:.58},{transform:'translateX(-.14px)',offset:.82},{transform:'translateX(0px)',offset:1}],700);
  }else if(mode==='light'){
    node=button.querySelector('.sc-theme-rays');other=button.querySelector('.sc-theme-disc');pin(node,'rotate(0deg) scale(1)');pin(other,'scale(1)');
    play(node,[{transform:'rotate(0deg) scale(1)',offset:0},{transform:'rotate(-8deg) scale(.94)',offset:.18},{transform:'rotate(35deg) scale(1.11)',offset:.56},{transform:'rotate(-5deg) scale(1.025)',offset:.8},{transform:'rotate(0deg) scale(1)',offset:1}],660);
    play(other,[{transform:'scale(1)',offset:0},{transform:'scale(.93)',offset:.28},{transform:'scale(1.105)',offset:.58},{transform:'scale(.985)',offset:.82},{transform:'scale(1)',offset:1}],660);
  }else{
    node=button.querySelector('.sc-theme-solar-glyph');other=button.querySelector('.sc-theme-cut');pin(node,'rotate(-7deg) scale(1.13)');pin(other,'translate(0px,0px)');
    play(node,[{transform:'rotate(-7deg) scale(1.13)',offset:0},{transform:'rotate(-2deg) scale(1.105)',offset:.18},{transform:'rotate(-19deg) scale(1.185)',offset:.48},{transform:'rotate(-4deg) scale(1.14)',offset:.72},{transform:'rotate(-7deg) scale(1.13)',offset:1}],720);
    play(other,[{transform:'translate(0px,0px)',offset:0},{transform:'translate(.7px,-.4px)',offset:.18},{transform:'translate(-1.6px,1.08px)',offset:.48},{transform:'translate(.5px,-.32px)',offset:.72},{transform:'translate(0px,0px)',offset:1}],720);
  }
}
function animateOptionHover(option,on){
  if(!option)return;clearHoverMotion(option);if(!on||reducedMotion()||option.getAttribute('aria-checked')==='true')return;
  var mode=option.getAttribute('data-sc-theme-option'),node,other;
  if(mode==='system'){
    node=option.querySelector('.sc-theme-option-icon');other=option.querySelector('.sc-theme-option-auto-half');pin(node,'rotate(0deg) scale(1)');pin(other,'translateX(0px)');
    play(node,[{transform:'rotate(0deg) scale(1)',offset:0},{transform:'rotate(-9deg) scale(.965)',offset:.17},{transform:'rotate(148deg) scale(1.055)',offset:.58},{transform:'rotate(-12deg) scale(.99)',offset:.82},{transform:'rotate(0deg) scale(1)',offset:1}],700);
    play(other,[{transform:'translateX(0px)',offset:0},{transform:'translateX(-.2px)',offset:.22},{transform:'translateX(.55px)',offset:.58},{transform:'translateX(-.1px)',offset:.82},{transform:'translateX(0px)',offset:1}],700);
  }else if(mode==='light'){
    node=option.querySelector('.sc-theme-option-rays');other=option.querySelector('.sc-theme-option-sun-disc');pin(node,'rotate(0deg) scale(1)');pin(other,'scale(1)');
    play(node,[{transform:'rotate(0deg) scale(1)',offset:0},{transform:'rotate(-8deg) scale(.94)',offset:.18},{transform:'rotate(35deg) scale(1.11)',offset:.56},{transform:'rotate(-5deg) scale(1.025)',offset:.8},{transform:'rotate(0deg) scale(1)',offset:1}],660);
    play(other,[{transform:'scale(1)',offset:0},{transform:'scale(.93)',offset:.28},{transform:'scale(1.105)',offset:.58},{transform:'scale(.985)',offset:.82},{transform:'scale(1)',offset:1}],660);
  }else if(mode==='dark'){
    node=option.querySelector('.sc-theme-option-icon');other=option.querySelector('.sc-theme-option-dark-cut');pin(node,'rotate(0deg) scale(1)');pin(other,'translate(0px,0px)');
    play(node,[{transform:'rotate(0deg) scale(1)',offset:0},{transform:'rotate(5deg) scale(.98)',offset:.18},{transform:'rotate(-12deg) scale(1.055)',offset:.48},{transform:'rotate(2deg) scale(1.01)',offset:.72},{transform:'rotate(0deg) scale(1)',offset:1}],720);
    play(other,[{transform:'translate(0px,0px)',offset:0},{transform:'translate(.55px,-.32px)',offset:.18},{transform:'translate(-1.25px,.84px)',offset:.48},{transform:'translate(.4px,-.25px)',offset:.72},{transform:'translate(0px,0px)',offset:1}],720);
  }
}
function animateModeChange(root,from,to){
  if(!root){return;}from=normalize(from)||'system';to=normalize(to)||'system';var button=root.querySelector('.sc-theme-toggle'),a=MAIN_STATE[from],b=MAIN_STATE[to];sync(root,to);if(!button||reducedMotion()||from===to)return;
  var solar=button.querySelector('.sc-theme-solar-glyph'),rays=button.querySelector('.sc-theme-rays'),cut=button.querySelector('.sc-theme-cut'),auto=button.querySelector('.sc-theme-auto-glyph');
  clearHoverMotion(button);
  var solarFrames=[{transform:a.solar,opacity:a.solarOpacity,offset:0}],rayFrames=[{transform:a.rays,opacity:a.raysOpacity,offset:0}],cutFrames=[{transform:a.cut,offset:0}],autoFrames=[{transform:a.auto,opacity:a.autoOpacity,offset:0}];
  if(to==='dark'){
    solarFrames.push({transform:'rotate(-20deg) scale(1.19)',opacity:1,offset:.72});cutFrames.push({transform:'translate(-1.35px,.9px)',offset:.62});rayFrames.push({transform:'rotate(34deg) scale(.24)',opacity:0,offset:.62});
  }else if(to==='light'){
    solarFrames.push({transform:'rotate(4deg) scale(1.035)',opacity:1,offset:.7});cutFrames.push({transform:'translate(12.35px,-9.15px)',offset:.68});rayFrames.push({transform:'rotate(-7deg) scale(1.1)',opacity:1,offset:.7});
  }else{
    autoFrames.push({transform:'rotate(-14deg) scale(1.065)',opacity:1,offset:.72});solarFrames.push({transform:'rotate(42deg) scale(.57)',opacity:0,offset:.7});
  }
  solarFrames.push({transform:b.solar,opacity:b.solarOpacity,offset:1});rayFrames.push({transform:b.rays,opacity:b.raysOpacity,offset:1});cutFrames.push({transform:b.cut,offset:1});autoFrames.push({transform:b.auto,opacity:b.autoOpacity,offset:1});
  play(solar,solarFrames,560);play(rays,rayFrames,520);play(cut,cutFrames,560);play(auto,autoFrames,560);
}
function clearSwitch(){
  switchToken++;switchTimers.forEach(clearTimeout);switchTimers.length=0;
  doc.classList.remove('sc-theme-transitioning');doc.removeAttribute('data-sc-theme-transition-phase');doc.style.removeProperty('--sc-theme-transition-surface');
}
function transitionApply(root,mode,persist){
  mode=normalize(mode)||'system';var current=selected(),actual=resolved(mode),currentActual=doc.getAttribute('data-sc-theme-resolved')||resolved(current);
  if(currentActual===actual){clearSwitch();animateModeChange(root,current,mode);commit(root,mode,persist,true);return;}
  if(reducedMotion()){clearSwitch();apply(root,mode,persist);return;}
  clearSwitch();var token=switchToken,surface='';
  try{surface=getComputedStyle(doc).getPropertyValue('--sc-color-surface').trim();}catch(_){}
  if(surface)doc.style.setProperty('--sc-theme-transition-surface',surface);
  doc.classList.add('sc-theme-transitioning');doc.setAttribute('data-sc-theme-transition-phase','idle');
  animateModeChange(root,current,mode);
  requestAnimationFrame(function(){if(token!==switchToken)return;doc.setAttribute('data-sc-theme-transition-phase','out');});
  switchTimers.push(setTimeout(function(){if(token!==switchToken)return;commit(root,mode,persist,true);},105));
  switchTimers.push(setTimeout(function(){if(token!==switchToken)return;doc.setAttribute('data-sc-theme-transition-phase','in');},135));
  switchTimers.push(setTimeout(function(){if(token!==switchToken)return;switchTimers.length=0;doc.classList.remove('sc-theme-transitioning');doc.removeAttribute('data-sc-theme-transition-phase');doc.style.removeProperty('--sc-theme-transition-surface');},340));
}
function syncMounted(){var root=document.querySelector('.sc-catalog-tools');if(root)sync(root,selected());}
function setOpen(root,on,focusSelected){
  var button=root&&root.querySelector('.sc-theme-toggle'),menu=root&&root.querySelector('.sc-theme-menu');if(!button||!menu)return;
  on=!!on;button.setAttribute('aria-expanded',on?'true':'false');menu.setAttribute('aria-hidden',on?'false':'true');menu.classList.toggle('sc-theme-menu-open',on);
  if(on&&focusSelected){var current=menu.querySelector('[aria-checked="true"]')||menu.querySelector('.sc-theme-option');if(current)current.focus();}
}
function install(root){
  var button=root&&root.querySelector('.sc-theme-toggle'),menu=root&&root.querySelector('.sc-theme-menu'),control=button&&button.closest('.sc-theme-control');if(!button||!menu||!control)return function(){};apply(root,load(),false);
  var closeTimer=0,hovering=false,items=options(root);
  function clearClose(){if(closeTimer){clearTimeout(closeTimer);closeTimer=0;}}
  function hoverEnter(event){if(event.pointerType==='touch')return;hovering=true;clearClose();setOpen(root,true,false);}
  function hoverLeave(event){if(event.pointerType==='touch')return;hovering=false;clearClose();closeTimer=setTimeout(function(){closeTimer=0;if(!hovering&&!control.contains(document.activeElement))setOpen(root,false,false);},120);}
  function iconEnter(event){if(event.pointerType==='touch')return;animateMainHover(root,true);}
  function iconLeave(event){if(event.pointerType==='touch')return;animateMainHover(root,false);}
  function optionEnter(event){if(event.pointerType==='touch')return;animateOptionHover(event.currentTarget,true);}
  function optionLeave(event){if(event.pointerType==='touch')return;animateOptionHover(event.currentTarget,false);}
  function toggle(event){if(event){event.preventDefault();event.stopPropagation();}if(hovering){setOpen(root,true,false);return;}setOpen(root,button.getAttribute('aria-expanded')!=='true',false);}
  function choose(event){var option=event.target&&event.target.closest?event.target.closest('[data-sc-theme-option]'):null;if(!option||!menu.contains(option))return;event.preventDefault();event.stopPropagation();animateOptionHover(option,false);transitionApply(root,option.getAttribute('data-sc-theme-option'),true);setOpen(root,false,false);button.focus();}
  function outside(event){if(button.getAttribute('aria-expanded')!=='true'||control.contains(event.target))return;clearClose();setOpen(root,false,false);}
  function keydown(event){
    var open=button.getAttribute('aria-expanded')==='true',target=event.target,itemsNow=options(root),index=itemsNow.indexOf(target);
    if(target===button&&(event.key==='ArrowDown'||event.key==='ArrowUp')){event.preventDefault();setOpen(root,true,true);return;}
    if(!open)return;
    if(event.key==='Escape'){event.preventDefault();clearClose();setOpen(root,false,false);button.focus();return;}
    if(index<0)return;
    if(event.key==='ArrowDown'||event.key==='ArrowRight'){event.preventDefault();itemsNow[(index+1)%itemsNow.length].focus();}
    else if(event.key==='ArrowUp'||event.key==='ArrowLeft'){event.preventDefault();itemsNow[(index-1+itemsNow.length)%itemsNow.length].focus();}
    else if(event.key==='Home'){event.preventDefault();itemsNow[0].focus();}
    else if(event.key==='End'){event.preventDefault();itemsNow[itemsNow.length-1].focus();}
  }
  control.addEventListener('pointerenter',hoverEnter);control.addEventListener('pointerleave',hoverLeave);button.addEventListener('pointerenter',iconEnter);button.addEventListener('pointerleave',iconLeave);button.addEventListener('click',toggle);menu.addEventListener('click',choose);root.addEventListener('keydown',keydown);document.addEventListener('pointerdown',outside,true);
  items.forEach(function(option){option.addEventListener('pointerenter',optionEnter);option.addEventListener('pointerleave',optionLeave);});
  return function(){clearClose();clearSwitch();animateMainHover(root,false);items.forEach(function(option){animateOptionHover(option,false);option.removeEventListener('pointerenter',optionEnter);option.removeEventListener('pointerleave',optionLeave);});control.removeEventListener('pointerenter',hoverEnter);control.removeEventListener('pointerleave',hoverLeave);button.removeEventListener('pointerenter',iconEnter);button.removeEventListener('pointerleave',iconLeave);button.removeEventListener('click',toggle);menu.removeEventListener('click',choose);root.removeEventListener('keydown',keydown);document.removeEventListener('pointerdown',outside,true);};
}
var api={install:install,apply:apply,sync:syncMounted,getMode:selected,getResolved:function(){return resolved(selected());}};
C.theme=api;SC.theme=api;
})();