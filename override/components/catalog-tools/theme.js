(function(){
'use strict';
var SC=window.SCOverride,CFG=SC&&SC.config,C=SC&&SC.catalogTools;if(!SC||!CFG||SC.__catalogThemeBooted)return;SC.__catalogThemeBooted=true;
var MODES=['system','light','dark'],STORE_KEY='scTheme:v1',doc=document.documentElement,systemDark=window.matchMedia('(prefers-color-scheme: dark)'),persistHandle=0,persistMode='';
var ICONS={
  system:'M10.85 12.65h2.3L12 9l-1.15 3.65zM20 8.69V4h-4.69L12 .69 8.69 4H4v4.69L.69 12 4 15.31V20h4.69L12 23.31 15.31 20H20v-4.69L23.31 12 20 8.69zM14.3 16l-.7-2h-3.2l-.7 2H7.8L11 7h2l3.2 9h-1.9z',
  light:'M12,7c-2.76,0-5,2.24-5,5s2.24,5,5,5s5-2.24,5-5S14.76,7,12,7L12,7z M2,13l2,0c0.55,0,1-0.45,1-1s-0.45-1-1-1l-2,0 c-0.55,0-1,0.45-1,1S1.45,13,2,13z M20,13l2,0c0.55,0,1-0.45,1-1s-0.45-1-1-1l-2,0c-0.55,0-1,0.45-1,1S19.45,13,20,13z M11,2v2 c0,0.55,0.45,1,1s1-0.45,1-1V2c0-0.55-0.45-1-1-1S11,1.45,11,2z M11,20v2c0,0.55,0.45,1,1s1-0.45,1-1v-2c0-0.55-0.45-1-1-1 C11.45,19,11,19.45,11,20z M5.99,4.58c-0.39-0.39-1.03-0.39-1.41,0c-0.39,0.39-0.39,1.03,0,1.41l1.06,1.06 c0.39,0.39,1.03,0.39,1.41,0s0.39-1.03,0-1.41L5.99,4.58z M18.36,16.95c-0.39-0.39-1.03-0.39-1.41,0c-0.39,0.39-0.39,1.03,0,1.41 l1.06,1.06c0.39,0.39,1.03,0.39,1.41,0c0.39-0.39,0.39-1.03,0-1.41L18.36,16.95z M19.42,5.99c0.39-0.39,0.39-1.03,0-1.41 c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06c-0.39,0.39-0.39,1.03,0,1.41s1.03,0.39,1.41,0L19.42,5.99z M7.05,18.36 c0.39,0.39,0.39,1.03,0,1.41c-0.39,0.39-1.03,0.39-1.41,0l-1.06-1.06c-0.39-0.39-0.39-1.03,0-1.41s1.03-0.39,1.41,0L7.05,18.36z',
  dark:'M12,3c-4.97,0-9,4.03-9,9s4.03,9,9,9s9-4.03,9-9c0-0.46-0.04-0.92-0.1-1.36c-0.98,1.37-2.58,2.26-4.4,2.26 c-2.98,0-5.4-2.42-5.4-5.4c0-1.81,0.89-3.42,2.26-4.4C12.92,3.04,12.46,3,12,3L12,3z'
};
function normalize(mode){return MODES.indexOf(mode)>=0?mode:'';}
function selected(){return normalize(doc.getAttribute('data-sc-theme')||'')||'system';}
function resolved(mode){return mode==='system'?(systemDark.matches?'dark':'light'):mode;}
function load(){var mode=normalize(doc.getAttribute('data-sc-theme')||'');if(mode)return mode;try{mode=normalize(localStorage.getItem(STORE_KEY)||'');}catch(_){mode='';}return mode||'system';}
function saveNow(mode){try{localStorage.setItem(STORE_KEY,mode);}catch(_){} }
function scheduleSave(mode){persistMode=mode;if(persistHandle)return;if(window.requestIdleCallback)persistHandle=window.requestIdleCallback(function(){persistHandle=0;saveNow(persistMode);},{timeout:250});else persistHandle=window.setTimeout(function(){persistHandle=0;saveNow(persistMode);},0);}
function text(mode){return'Tema: '+(mode==='system'?'sistema':mode==='dark'?'oscuro':'claro')+'. Cambiar tema';}
function syncIcon(root,mode){var button=root&&root.querySelector('.sc-theme-toggle'),path=button&&button.querySelector('[data-sc-theme-icon-path]'),label=text(mode);if(button){button.setAttribute('aria-label',label);button.setAttribute('title',label);}if(!path)return;path.setAttribute('d',ICONS[mode]);path.setAttribute('data-sc-icon-state',mode);}
function emit(mode,actual){try{window.dispatchEvent(new CustomEvent('sc:themechange',{detail:{mode:mode,resolved:actual}}));}catch(_){} }
function setResolved(actual){if(doc.getAttribute('data-sc-theme-resolved')!==actual)doc.setAttribute('data-sc-theme-resolved',actual);}
function apply(root,mode,persist){mode=normalize(mode)||'system';var actual=resolved(mode);if(doc.getAttribute('data-sc-theme')!==mode)doc.setAttribute('data-sc-theme',mode);setResolved(actual);syncIcon(root,mode);emit(mode,actual);if(persist)scheduleSave(mode);}
function syncMounted(){var root=document.querySelector('.sc-catalog-tools');if(root)syncIcon(root,selected());}
function install(root){var button=root&&root.querySelector('.sc-theme-toggle');if(!button)return function(){};apply(root,load(),false);function click(event){if(event){event.preventDefault();event.stopPropagation();}var mode=selected(),index=MODES.indexOf(mode);apply(root,MODES[(index+1)%MODES.length],true);}button.addEventListener('click',click);return function(){button.removeEventListener('click',click);};}
var api={install:install,apply:apply,sync:syncMounted,getMode:selected,getResolved:function(){return resolved(selected());}};
C.theme=api;SC.theme=api;
})();
