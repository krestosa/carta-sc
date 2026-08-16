(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,S=C&&C.selectors,K=C&&C.classes,V=SC&&SC.productModalView,A=SC&&SC.productModalA11y,M=SC&&SC.productModalMotion;
if(!SC||!U||!V||!A||!M||SC.__productModalBooted)return;SC.__productModalBooted=true;
var ready=U.ready,activeModal=null,closingModal=null,previousFocus=null,releaseBackground=null,closingRelease=null,closingRestore=null,openRaf=0,closeTimer=0,initialized=false,PRODUCT_MODAL_CLOSE_DELAY=190;

function noop(){}
function focus(node){if(!node||!document.documentElement.contains(node))return;try{node.focus({preventScroll:true});}catch(_){node.focus();}}
function cancelOpenRaf(){if(openRaf){cancelAnimationFrame(openRaf);openRaf=0;}}
function cancelCloseTimer(){if(closeTimer){clearTimeout(closeTimer);closeTimer=0;}}
function finishClose(modal,restoreFocus){
  if(closingModal!==modal)return;
  cancelCloseTimer();if(modal.parentNode)modal.parentNode.removeChild(modal);document.body.classList.remove("sc-product-modal-open");
  var release=closingRelease||noop,restore=closingRestore;closingModal=null;closingRelease=null;closingRestore=null;release();if(restoreFocus!==false)focus(restore);
}
function closeModal(event){
  if(event)event.preventDefault();
  if(!activeModal||closingModal)return;
  cancelOpenRaf();var modal=activeModal;
  closingRestore=previousFocus;closingRelease=releaseBackground||noop;activeModal=null;closingModal=modal;previousFocus=null;releaseBackground=null;
  modal.classList.remove('is-visible');M.close(modal);
  var delay=C.queries.reducedMotion.matches?0:PRODUCT_MODAL_CLOSE_DELAY;
  closeTimer=window.setTimeout(function(){closeTimer=0;finishClose(modal,true);},delay);
}
function openModal(link){
  if(activeModal||closingModal)return;
  var modal=V.build(link);if(!modal)return;
  previousFocus=link;document.body.appendChild(modal);document.body.classList.add("sc-product-modal-open");activeModal=modal;releaseBackground=A.lockBackground(modal)||noop;
  focus(modal.querySelector(".sc-product-modal__close"));
  cancelOpenRaf();openRaf=requestAnimationFrame(function(){openRaf=0;if(activeModal===modal){modal.classList.add('is-visible');M.open(modal);}});
}
function onClick(event){
  var close=event.target.closest&&event.target.closest(".sc-product-modal__close");
  if(close&&activeModal&&activeModal.contains(close)){
    event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation();
    closeModal();return;
  }
  var link=event.target.closest&&event.target.closest(S.productLink);if(!link)return;
  if((event.button&&event.button!==0)||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation();
  openModal(link);
}
function onMouseDown(event){
  if(!activeModal||event.target!==activeModal)return;
  event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation();
  closeModal();
}
function onKeyDown(event){
  if(!activeModal)return;
  if(event.key==='Escape'||event.key==='Esc'){
    event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation();
    closeModal();return;
  }
  if(event.key==='Tab')A.trapTab(activeModal,event);
}
function onFocusIn(event){A.containFocus(activeModal,event);}
function addListeners(){
  document.addEventListener('click',onClick,true);document.addEventListener('mousedown',onMouseDown,true);document.addEventListener('keydown',onKeyDown,true);document.addEventListener('focusin',onFocusIn);
}
function removeListeners(){
  document.removeEventListener('click',onClick,true);document.removeEventListener('mousedown',onMouseDown,true);document.removeEventListener('keydown',onKeyDown,true);document.removeEventListener('focusin',onFocusIn);
}
function init(){if(initialized)return;initialized=true;addListeners();}
function destroy(){
  if(initialized){initialized=false;removeListeners();}
  cancelOpenRaf();cancelCloseTimer();var modal=activeModal||closingModal,restore=previousFocus||closingRestore,release=releaseBackground||closingRelease||noop;
  activeModal=null;closingModal=null;previousFocus=null;releaseBackground=null;closingRelease=null;closingRestore=null;
  if(modal&&modal.parentNode)modal.parentNode.removeChild(modal);if(document.body)document.body.classList.remove("sc-product-modal-open");release();focus(restore);
}
ready(init);
SC.productModal={open:openModal,close:closeModal,getActive:function(){return activeModal;},isClosing:function(){return!!closingModal;},init:init,destroy:destroy};
})();
