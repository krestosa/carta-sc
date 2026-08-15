(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils;if(!SC||!U||SC.__productModalA11yBooted)return;SC.__productModalA11yBooted=true;
var each=U.each;

function focusableElements(dialog){
  return Array.prototype.filter.call(
    dialog.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'),
    function(el){return el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';}
  );
}
function lockBackground(modal){
  var backgroundState=[];
  var inertSupported=typeof HTMLElement!=='undefined'&&'inert' in HTMLElement.prototype;
  each(document.body.children,function(node){
    if(node===modal)return;
    var state={node:node,inertSupported:inertSupported};
    if(inertSupported){state.inert=!!node.inert;node.inert=true;}
    else{state.ariaHidden=node.getAttribute('aria-hidden');node.setAttribute('aria-hidden','true');}
    backgroundState.push(state);
  });
  var released=false;
  return function(){
    if(released)return;released=true;
    backgroundState.forEach(function(state){
      if(!state.node||!document.documentElement.contains(state.node))return;
      if(state.inertSupported)state.node.inert=state.inert;
      else if(state.ariaHidden===null)state.node.removeAttribute('aria-hidden');
      else state.node.setAttribute('aria-hidden',state.ariaHidden);
    });
    backgroundState=[];
  };
}
function trapTab(modal,event){
  var dialog=modal&&modal.querySelector('.sc-product-modal__dialog');if(!dialog)return;
  var items=focusableElements(dialog);
  if(!items.length){event.preventDefault();dialog.focus();return;}
  var first=items[0],last=items[items.length-1],current=document.activeElement;
  if(event.shiftKey&&(current===first||!dialog.contains(current))){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&current===last){event.preventDefault();first.focus();}
}
function containFocus(modal,event){
  if(!modal||modal.contains(event.target))return;
  var dialog=modal.querySelector('.sc-product-modal__dialog'),items=focusableElements(dialog);
  (items[0]||dialog).focus();
}

SC.productModalA11y={focusableElements:focusableElements,lockBackground:lockBackground,trapTab:trapTab,containFocus:containFocus};
})();