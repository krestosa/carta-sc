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
function install(root){
  var button=root&&root.querySelector('.sc-theme-toggle'),menu=root&&root.querySelector('.sc-theme-menu');if(!button||!menu)return function(){};apply(root,load(),false);
  function toggle(event){if(event){event.preventDefault();event.stopPropagation();}setOpen(root,button.getAttribute('aria-expanded')!=='true',false);}
  function choose(event){var option=event.target&&event.target.closest?event.target.closest('[data-sc-theme-option]'):null;if(!option||!menu.contains(option))return;event.preventDefault();event.stopPropagation();apply(root,option.getAttribute('data-sc-theme-option'),true);setOpen(root,false,false);button.focus();}
  function outside(event){if(button.getAttribute('aria-expanded')!=='true'||root.contains(event.target))return;setOpen(root,false,false);}
  function keydown(event){
    var open=button.getAttribute('aria-expanded')==='true',target=event.target,items=options(root),index=items.indexOf(target);
    if(target===button&&(event.key==='ArrowDown'||event.key==='ArrowUp')){event.preventDefault();setOpen(root,true,true);return;}
    if(!open)return;
    if(event.key==='Escape'){event.preventDefault();setOpen(root,false,false);button.focus();return;}
    if(index<0)return;
    if(event.key==='ArrowDown'||event.key==='ArrowRight'){event.preventDefault();items[(index+1)%items.length].focus();}
    else if(event.key==='ArrowUp'||event.key==='ArrowLeft'){event.preventDefault();items[(index-1+items.length)%items.length].focus();}
    else if(event.key==='Home'){event.preventDefault();items[0].focus();}
    else if(event.key==='End'){event.preventDefault();items[items.length-1].focus();}
  }
  button.addEventListener('click',toggle);menu.addEventListener('click',choose);root.addEventListener('keydown',keydown);document.addEventListener('pointerdown',outside,true);
  return function(){button.removeEventListener('click',toggle);menu.removeEventListener('click',choose);root.removeEventListener('keydown',keydown);document.removeEventListener('pointerdown',outside,true);};
}
var api={install:install,apply:apply,sync:syncMounted,getMode:selected,getResolved:function(){return resolved(selected());}};
C.theme=api;SC.theme=api;
})();
