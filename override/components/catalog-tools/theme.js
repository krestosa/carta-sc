(function(){
'use strict';
var SC=window.SCOverride,CFG=SC&&SC.config,C=SC&&SC.catalogTools;if(!SC||!CFG||SC.__catalogThemeBooted)return;SC.__catalogThemeBooted=true;
var MODES=['system','light','dark'],STORE_KEY='scTheme:v1',doc=document.documentElement,systemDark=window.matchMedia('(prefers-color-scheme: dark)'),persistHandle=0,persistMode='';
function normalize(mode){return MODES.indexOf(mode)>=0?mode:'';}
function selected(){return normalize(doc.getAttribute('data-sc-theme')||'')||'system';}
function resolved(mode){return mode==='system'?(systemDark.matches?'dark':'light'):mode;}
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
function apply(root,mode,persist){mode=normalize(mode)||'system';var actual=resolved(mode),changed=selected()!==mode||doc.getAttribute('data-sc-theme-resolved')!==actual;if(doc.getAttribute('data-sc-theme')!==mode)doc.setAttribute('data-sc-theme',mode);setResolved(actual);sync(root,mode);if(changed)emit(mode,actual);if(persist)scheduleSave(mode);}
function syncMounted(){var root=document.querySelector('.sc-catalog-tools');if(root)sync(root,selected());}
function setOpen(root,on,focusSelected){
  var button=root&&root.querySelector('.sc-theme-toggle'),menu=root&&root.querySelector('.sc-theme-menu');if(!button||!menu)return;
  on=!!on;button.setAttribute('aria-expanded',on?'true':'false');menu.setAttribute('aria-hidden',on?'false':'true');menu.classList.toggle('sc-theme-menu-open',on);
  if(on&&focusSelected){var current=menu.querySelector('[aria-checked="true"]')||menu.querySelector('.sc-theme-option');if(current)current.focus();}
}
function setSlowMotion(root){
  if(!root)return;
  Array.prototype.forEach.call(root.querySelectorAll('.sc-theme-solar-glyph,.sc-theme-auto-glyph,.sc-theme-cut'),function(node){node.style.transitionDuration='400ms';});
  Array.prototype.forEach.call(root.querySelectorAll('.sc-theme-disc,.sc-theme-rays,.sc-theme-auto-half'),function(node){node.style.transitionDuration='340ms';});
  Array.prototype.forEach.call(root.querySelectorAll('.sc-theme-option-icon,.sc-theme-option-auto-half,.sc-theme-option-sun-disc,.sc-theme-option-rays,.sc-theme-option-dark-cut'),function(node){node.style.transitionDuration='320ms';});
}
function clearMainPreview(root){
  if(!root)return;var selectors=['.sc-theme-auto-glyph','.sc-theme-auto-half','.sc-theme-rays','.sc-theme-disc','.sc-theme-solar-glyph','.sc-theme-cut'];
  selectors.forEach(function(selector){var node=root.querySelector('.sc-theme-toggle '+selector);if(node)node.style.removeProperty('transform');});
}
function previewMain(root,on){
  if(!root)return;clearMainPreview(root);if(!on)return;var mode=selected(),button=root.querySelector('.sc-theme-toggle'),node;if(!button)return;
  if(mode==='system'){
    node=button.querySelector('.sc-theme-auto-glyph');if(node)node.style.transform='rotate(150deg) scale(1.04)';
    node=button.querySelector('.sc-theme-auto-half');if(node)node.style.transform='translateX(.4px)';
  }else if(mode==='light'){
    node=button.querySelector('.sc-theme-rays');if(node)node.style.transform='rotate(24deg) scale(1.08)';
    node=button.querySelector('.sc-theme-disc');if(node)node.style.transform='scale(1.09)';
  }else{
    node=button.querySelector('.sc-theme-solar-glyph');if(node)node.style.transform='rotate(-12deg) scale(1.19)';
    node=button.querySelector('.sc-theme-cut');if(node)node.style.transform='translate(-.35px,.25px)';
  }
}
function previewSelectedOption(option,on){
  if(!option||option.getAttribute('aria-checked')!=='true')return;var mode=option.getAttribute('data-sc-theme-option'),node;
  if(mode==='system'){
    node=option.querySelector('.sc-theme-option-icon');if(node)node.style.transform=on?'rotate(150deg) scale(1.04)':'';
    node=option.querySelector('.sc-theme-option-auto-half');if(node)node.style.transform=on?'translateX(.4px)':'';
  }else if(mode==='light'){
    node=option.querySelector('.sc-theme-option-rays');if(node)node.style.transform=on?'rotate(24deg) scale(1.08)':'';
    node=option.querySelector('.sc-theme-option-sun-disc');if(node)node.style.transform=on?'scale(1.09)':'';
  }else if(mode==='dark'){
    node=option.querySelector('.sc-theme-option-icon');if(node)node.style.transform=on?'rotate(-12deg) scale(1.07)':'';
    node=option.querySelector('.sc-theme-option-dark-cut');if(node)node.style.transform=on?'translate(-.35px,.25px)':'';
  }
}
function install(root){
  var button=root&&root.querySelector('.sc-theme-toggle'),menu=root&&root.querySelector('.sc-theme-menu'),control=button&&button.closest('.sc-theme-control');if(!button||!menu||!control)return function(){};apply(root,load(),false);setSlowMotion(root);
  var closeTimer=0,hovering=false,items=options(root);
  function clearClose(){if(closeTimer){clearTimeout(closeTimer);closeTimer=0;}}
  function hoverEnter(event){if(event.pointerType==='touch')return;hovering=true;clearClose();setOpen(root,true,false);}
  function hoverLeave(event){if(event.pointerType==='touch')return;hovering=false;clearClose();closeTimer=setTimeout(function(){closeTimer=0;if(!hovering&&!control.contains(document.activeElement))setOpen(root,false,false);},120);}
  function iconEnter(event){if(event.pointerType==='touch')return;previewMain(root,true);}
  function iconLeave(event){if(event.pointerType==='touch')return;previewMain(root,false);}
  function optionEnter(event){if(event.pointerType==='touch')return;previewSelectedOption(event.currentTarget,true);}
  function optionLeave(event){if(event.pointerType==='touch')return;previewSelectedOption(event.currentTarget,false);}
  function toggle(event){if(event){event.preventDefault();event.stopPropagation();}if(hovering){setOpen(root,true,false);return;}setOpen(root,button.getAttribute('aria-expanded')!=='true',false);}
  function choose(event){var option=event.target&&event.target.closest?event.target.closest('[data-sc-theme-option]'):null;if(!option||!menu.contains(option))return;event.preventDefault();event.stopPropagation();previewSelectedOption(option,false);apply(root,option.getAttribute('data-sc-theme-option'),true);setOpen(root,false,false);button.focus();}
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
  return function(){clearClose();previewMain(root,false);items.forEach(function(option){previewSelectedOption(option,false);option.removeEventListener('pointerenter',optionEnter);option.removeEventListener('pointerleave',optionLeave);});control.removeEventListener('pointerenter',hoverEnter);control.removeEventListener('pointerleave',hoverLeave);button.removeEventListener('pointerenter',iconEnter);button.removeEventListener('pointerleave',iconLeave);button.removeEventListener('click',toggle);menu.removeEventListener('click',choose);root.removeEventListener('keydown',keydown);document.removeEventListener('pointerdown',outside,true);};
}
var api={install:install,apply:apply,sync:syncMounted,getMode:selected,getResolved:function(){return resolved(selected());}};
C.theme=api;SC.theme=api;
})();
