(function(){
'use strict';
var SC=window.SCOverride,CFG=SC&&SC.config,C=SC&&SC.catalogTools;if(!SC||!CFG||SC.__catalogThemeBooted)return;SC.__catalogThemeBooted=true;
var MODES=['system','light','dark'],STORE_KEY='scTheme:v1',doc=document.documentElement,systemDark=window.matchMedia('(prefers-color-scheme: dark)'),finePointer=window.matchMedia('(hover:hover) and (pointer:fine)'),persistHandle=0,persistMode='',switchToken=0,switchTimers=[],iconToken=0,iconAnimations=[];
var ICON_STATE={
  system:{shape:'rotate(0deg) scale(1)',rays:'rotate(18deg) scale(.18)',raysOpacity:0,moon:'translate(10.8px,-8px) scale(.86)',auto:'scaleX(1)'},
  light:{shape:'rotate(0deg) scale(1)',rays:'rotate(0deg) scale(1)',raysOpacity:1,moon:'translate(10.8px,-8px) scale(.86)',auto:'scaleX(0)'},
  dark:{shape:'rotate(-6deg) scale(1.1)',rays:'rotate(26deg) scale(.18)',raysOpacity:0,moon:'translate(0px,0px) scale(1)',auto:'scaleX(0)'}
};
var NEUTRAL={shape:'rotate(0deg) scale(1)',rays:'rotate(18deg) scale(.18)',raysOpacity:0,moon:'translate(10.8px,-8px) scale(.86)',auto:'scaleX(0)'};
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
function syncMeta(root,mode){
  if(!root)return;var button=root.querySelector('.sc-theme-toggle'),actual=resolved(mode);
  root.setAttribute('data-sc-theme-actual',actual);
  if(button){button.setAttribute('aria-label',label(mode));button.setAttribute('title',mode==='system'?'Tema automático':'Tema '+(mode==='dark'?'oscuro':'claro'));}
  options(root).forEach(function(option){var on=option.getAttribute('data-sc-theme-option')===mode;option.setAttribute('aria-checked',on?'true':'false');option.classList.toggle('sc-theme-option-selected',on);});
}
function sync(root,mode){mode=normalize(mode)||'system';if(!root)return;root.setAttribute('data-sc-theme-mode',mode);syncMeta(root,mode);}
function commit(root,mode,persist,skipSync){
  mode=normalize(mode)||'system';var previousMode=selected(),previousActual=doc.getAttribute('data-sc-theme-resolved')||resolved(previousMode),actual=resolved(mode),visualChanged=previousActual!==actual,modeChanged=previousMode!==mode;
  if(doc.getAttribute('data-sc-theme')!==mode)doc.setAttribute('data-sc-theme',mode);setResolved(actual);if(!skipSync)sync(root,mode);if(visualChanged)emit(mode,actual);if(persist&&modeChanged)scheduleSave(mode);
}
function apply(root,mode,persist){cancelIconMotion(root);commit(root,mode,persist,false);}
function setPreview(root,on){var button=root&&root.querySelector('.sc-theme-toggle');if(!button)return;if(reducedMotion())on=false;if(on)button.setAttribute('data-sc-theme-preview','true');else button.removeAttribute('data-sc-theme-preview');}
function cancelIconMotion(root){
  iconToken++;iconAnimations.forEach(function(animation){try{animation.cancel();}catch(_){}});iconAnimations.length=0;if(root)root.removeAttribute('data-sc-theme-animating');return iconToken;
}
function animatePart(node,frames,duration,easing){
  if(!node||!node.animate||reducedMotion())return Promise.resolve();var animation=node.animate(frames,{duration:duration,easing:easing||'cubic-bezier(.22,1,.36,1)',fill:'forwards'});iconAnimations.push(animation);return animation.finished.catch(function(){});
}
function iconParts(root){var button=root&&root.querySelector('.sc-theme-toggle');return button?{shape:button.querySelector('.sc-theme-shape'),rays:button.querySelector('.sc-theme-rays'),moon:button.querySelector('.sc-theme-moon-cut'),auto:button.querySelector('.sc-theme-auto-cut'),core:button.querySelector('.sc-theme-core')}:null;}
function finalizeIcon(root,mode,token){if(token!==iconToken)return;root.setAttribute('data-sc-theme-mode',mode);root.removeAttribute('data-sc-theme-animating');iconAnimations.forEach(function(animation){try{animation.cancel();}catch(_){}});iconAnimations.length=0;}
function animateModeChange(root,from,to){
  if(!root)return;from=normalize(from)||'system';to=normalize(to)||'system';syncMeta(root,to);var parts=iconParts(root);if(!parts||from===to||reducedMotion()){sync(root,to);return;}
  var token=cancelIconMotion(root),source=ICON_STATE[from],target=ICON_STATE[to];root.setAttribute('data-sc-theme-animating','true');
  (async function(){
    var collapse=[];
    if(from==='light'){
      collapse.push(animatePart(parts.rays,[{transform:source.rays,opacity:1},{transform:'rotate(18deg) scale(.18)',opacity:0}],170));
      collapse.push(animatePart(parts.core,[{transform:'scale(1)'},{transform:'scale(.965)'},{transform:'scale(1)'}],190));
    }else if(from==='dark'){
      collapse.push(animatePart(parts.moon,[{transform:source.moon},{transform:'translate(4.4px,-3.2px) scale(.94)',offset:.48},{transform:NEUTRAL.moon}],210));
      collapse.push(animatePart(parts.shape,[{transform:source.shape},{transform:NEUTRAL.shape}],210));
    }else{
      collapse.push(animatePart(parts.auto,[{transform:source.auto},{transform:'scaleX(.48)',offset:.48},{transform:NEUTRAL.auto}],180));
      collapse.push(animatePart(parts.core,[{transform:'scale(1)'},{transform:'scale(1.04)',offset:.55},{transform:'scale(1)'}],180));
    }
    await Promise.all(collapse);if(token!==iconToken)return;
    var reveal=[];
    if(to==='light'){
      reveal.push(animatePart(parts.rays,[{transform:NEUTRAL.rays,opacity:0},{transform:'rotate(7deg) scale(.72)',opacity:.72,offset:.62},{transform:target.rays,opacity:1}],220));
      reveal.push(animatePart(parts.shape,[{transform:NEUTRAL.shape},{transform:target.shape}],220));
    }else if(to==='dark'){
      reveal.push(animatePart(parts.moon,[{transform:NEUTRAL.moon},{transform:'translate(3.7px,-2.75px) scale(.94)',offset:.46},{transform:target.moon}],230));
      reveal.push(animatePart(parts.shape,[{transform:NEUTRAL.shape},{transform:target.shape}],230));
    }else{
      reveal.push(animatePart(parts.auto,[{transform:NEUTRAL.auto},{transform:'scaleX(.52)',offset:.48},{transform:target.auto}],205));
      reveal.push(animatePart(parts.shape,[{transform:NEUTRAL.shape},{transform:target.shape}],205));
    }
    await Promise.all(reveal);if(token!==iconToken)return;finalizeIcon(root,to,token);
  })();
}
function clearSwitch(){switchToken++;switchTimers.forEach(clearTimeout);switchTimers.length=0;doc.classList.remove('sc-theme-transitioning');doc.removeAttribute('data-sc-theme-transition-phase');doc.style.removeProperty('--sc-theme-transition-surface');}
function transitionApply(root,mode,persist){
  mode=normalize(mode)||'system';var current=selected(),visual=normalize(root&&root.getAttribute('data-sc-theme-mode')||'')||current,actual=resolved(mode),currentActual=doc.getAttribute('data-sc-theme-resolved')||resolved(current);animateModeChange(root,visual,mode);
  if(currentActual===actual){clearSwitch();commit(root,mode,persist,true);return;}
  if(reducedMotion()){clearSwitch();apply(root,mode,persist);return;}
  clearSwitch();var token=switchToken,surface='';try{surface=getComputedStyle(doc).getPropertyValue('--sc-color-surface').trim();}catch(_){}if(surface)doc.style.setProperty('--sc-theme-transition-surface',surface);
  doc.classList.add('sc-theme-transitioning');doc.setAttribute('data-sc-theme-transition-phase','idle');requestAnimationFrame(function(){if(token!==switchToken)return;doc.setAttribute('data-sc-theme-transition-phase','out');});
  switchTimers.push(setTimeout(function(){if(token!==switchToken)return;commit(root,mode,persist,true);},105));
  switchTimers.push(setTimeout(function(){if(token!==switchToken)return;doc.setAttribute('data-sc-theme-transition-phase','in');},135));
  switchTimers.push(setTimeout(function(){if(token!==switchToken)return;switchTimers.length=0;doc.classList.remove('sc-theme-transitioning');doc.removeAttribute('data-sc-theme-transition-phase');doc.style.removeProperty('--sc-theme-transition-surface');},340));
}
function syncMounted(){var root=document.querySelector('.sc-catalog-tools');if(root)sync(root,selected());}
function setOpen(root,on,focusSelected){
  var button=root&&root.querySelector('.sc-theme-toggle'),menu=root&&root.querySelector('.sc-theme-menu');if(!button||!menu)return;on=!!on;button.setAttribute('aria-expanded',on?'true':'false');menu.setAttribute('aria-hidden',on?'false':'true');menu.classList.toggle('sc-theme-menu-open',on);if(!finePointer.matches)setPreview(root,on);if(on&&focusSelected){var current=menu.querySelector('[aria-checked="true"]')||menu.querySelector('.sc-theme-option');if(current)current.focus();}
}
function install(root){
  var button=root&&root.querySelector('.sc-theme-toggle'),menu=root&&root.querySelector('.sc-theme-menu'),control=button&&button.closest('.sc-theme-control');if(!button||!menu||!control)return function(){};apply(root,load(),false);
  var closeTimer=0,hovering=false;
  function clearClose(){if(closeTimer){clearTimeout(closeTimer);closeTimer=0;}}
  function hoverEnter(event){if(event.pointerType==='touch'||!finePointer.matches)return;hovering=true;clearClose();setOpen(root,true,false);}
  function hoverLeave(event){if(event.pointerType==='touch'||!finePointer.matches)return;hovering=false;clearClose();closeTimer=setTimeout(function(){closeTimer=0;if(!hovering&&!control.contains(document.activeElement))setOpen(root,false,false);},120);}
  function iconEnter(event){if(event.pointerType==='touch'||!finePointer.matches)return;setPreview(root,true);}
  function iconLeave(event){if(event.pointerType==='touch'||!finePointer.matches)return;setPreview(root,false);}
  function toggle(event){if(event){event.preventDefault();event.stopPropagation();}if(finePointer.matches&&hovering){setOpen(root,true,false);return;}setOpen(root,button.getAttribute('aria-expanded')!=='true',false);}
  function choose(event){var option=event.target&&event.target.closest?event.target.closest('[data-sc-theme-option]'):null;if(!option||!menu.contains(option))return;event.preventDefault();event.stopPropagation();transitionApply(root,option.getAttribute('data-sc-theme-option'),true);setOpen(root,false,false);button.focus();}
  function outside(event){if(button.getAttribute('aria-expanded')!=='true'||control.contains(event.target))return;clearClose();setOpen(root,false,false);}
  function keydown(event){
    var open=button.getAttribute('aria-expanded')==='true',target=event.target,itemsNow=options(root),index=itemsNow.indexOf(target);if(target===button&&(event.key==='ArrowDown'||event.key==='ArrowUp')){event.preventDefault();setOpen(root,true,true);return;}if(!open)return;if(event.key==='Escape'){event.preventDefault();clearClose();setOpen(root,false,false);button.focus();return;}if(index<0)return;if(event.key==='ArrowDown'||event.key==='ArrowRight'){event.preventDefault();itemsNow[(index+1)%itemsNow.length].focus();}else if(event.key==='ArrowUp'||event.key==='ArrowLeft'){event.preventDefault();itemsNow[(index-1+itemsNow.length)%itemsNow.length].focus();}else if(event.key==='Home'){event.preventDefault();itemsNow[0].focus();}else if(event.key==='End'){event.preventDefault();itemsNow[itemsNow.length-1].focus();}
  }
  control.addEventListener('pointerenter',hoverEnter);control.addEventListener('pointerleave',hoverLeave);button.addEventListener('pointerenter',iconEnter);button.addEventListener('pointerleave',iconLeave);button.addEventListener('click',toggle);menu.addEventListener('click',choose);root.addEventListener('keydown',keydown);document.addEventListener('pointerdown',outside,true);
  return function(){clearClose();clearSwitch();cancelIconMotion(root);setPreview(root,false);control.removeEventListener('pointerenter',hoverEnter);control.removeEventListener('pointerleave',hoverLeave);button.removeEventListener('pointerenter',iconEnter);button.removeEventListener('pointerleave',iconLeave);button.removeEventListener('click',toggle);menu.removeEventListener('click',choose);root.removeEventListener('keydown',keydown);document.removeEventListener('pointerdown',outside,true);};
}
function systemChanged(){if(selected()!=='system')return;var before=doc.getAttribute('data-sc-theme-resolved')||'',actual=resolved('system');setResolved(actual);syncMounted();if(before&&before!==actual)emit('system',actual);}
if(systemDark.addEventListener)systemDark.addEventListener('change',systemChanged);else if(systemDark.addListener)systemDark.addListener(systemChanged);
var api={install:install,apply:apply,sync:syncMounted,getMode:selected,getResolved:function(){return resolved(selected());}};C.theme=api;SC.theme=api;
})();
