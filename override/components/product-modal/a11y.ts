/* Gestiona el aislamiento y el foco del modal de producto. */
(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,MS=SC&&SC.productModalSelectors;if(!SC||!U||!C||!MS||SC.__productModalA11yBooted)return;SC.__productModalA11yBooted=true;
var each=U.each;
interface BackgroundState{node:HTMLElement;inertSupported:boolean;inert?:boolean;ariaHidden?:string|null}
function focusableElements(dialog:HTMLElement):HTMLElement[]{
  return Array.prototype.filter.call(dialog.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'),function(el:HTMLElement):boolean{return el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';}) as HTMLElement[];
}
function lockBackground(modal:HTMLElement):()=>void{
  var backgroundState:BackgroundState[]=[];
  var inertSupported=typeof HTMLElement!=='undefined'&&'inert' in HTMLElement.prototype;
  each(Array.from(document.body.children) as HTMLElement[],function(node:HTMLElement):void{
    if(node===modal)return;var state:BackgroundState={node:node,inertSupported:inertSupported};
    if(inertSupported){state.inert=node.inert;node.inert=true;}else{state.ariaHidden=node.getAttribute('aria-hidden');node.setAttribute('aria-hidden','true');}backgroundState.push(state);
  });
  var released=false;
  return function():void{if(released)return;released=true;backgroundState.forEach(function(state:BackgroundState):void{if(!document.documentElement.contains(state.node))return;if(state.inertSupported)state.node.inert=!!state.inert;else if(state.ariaHidden===null)state.node.removeAttribute('aria-hidden');else if(state.ariaHidden!==undefined)state.node.setAttribute('aria-hidden',state.ariaHidden);});backgroundState=[];};
}
function trapTab(modal:HTMLElement,event:KeyboardEvent):void{var dialog=modal.querySelector<HTMLElement>(MS.dialog);if(!dialog)return;var items=focusableElements(dialog);if(!items.length){event.preventDefault();dialog.focus();return;}var first=items[0],last=items[items.length-1],current=document.activeElement;if(!first||!last)return;if(event.shiftKey&&(current===first||!dialog.contains(current))){event.preventDefault();last.focus();}else if(!event.shiftKey&&current===last){event.preventDefault();first.focus();}}
function containFocus(modal:HTMLElement|null,event:FocusEvent):void{if(!modal||modal.contains(event.target as Node))return;var dialog=modal.querySelector<HTMLElement>(MS.dialog);if(!dialog)return;var items=focusableElements(dialog);(items[0]||dialog).focus();}
SC.productModalA11y={focusableElements:focusableElements,lockBackground:lockBackground,trapTab:trapTab,containFocus:containFocus};
})();
