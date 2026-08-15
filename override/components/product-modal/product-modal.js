(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,V=SC&&SC.productModalView,A=SC&&SC.productModalA11y,M=SC&&SC.productModalMotion;
if(!SC||!U||!V||!A||!M||SC.__productModalBooted)return;SC.__productModalBooted=true;
var ready=U.ready,activeModal=null,closingModal=null,previousFocus=null,releaseBackground=null;

function noop(){}
function closeModal(event){
  if(event)event.preventDefault();
  if(!activeModal||closingModal)return;
  var modal=activeModal,restore=previousFocus,release=releaseBackground||noop;
  activeModal=null;closingModal=modal;previousFocus=null;releaseBackground=null;
  modal.classList.remove('is-visible');
  M.close(modal);
  document.body.classList.remove('sc-product-modal-open');
  var delay=matchMedia('(prefers-reduced-motion: reduce)').matches?0:190;
  window.setTimeout(function(){
    if(modal.parentNode)modal.parentNode.removeChild(modal);
    release();
    if(closingModal===modal)closingModal=null;
    if(restore&&document.documentElement.contains(restore)){
      try{restore.focus({preventScroll:true});}catch(_){restore.focus();}
    }
  },delay);
}
function openModal(link){
  if(activeModal||closingModal)return;
  var modal=V.build(link);if(!modal)return;
  previousFocus=link;
  document.body.appendChild(modal);
  document.body.classList.add('sc-product-modal-open');
  activeModal=modal;
  releaseBackground=A.lockBackground(modal)||noop;
  var close=modal.querySelector('.sc-product-modal__close');
  try{close.focus({preventScroll:true});}catch(_){close.focus();}
  requestAnimationFrame(function(){if(activeModal===modal){modal.classList.add('is-visible');M.open(modal);}});
}
function onClick(event){
  var close=event.target.closest&&event.target.closest('.sc-product-modal__close');
  if(close&&activeModal&&activeModal.contains(close)){
    event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation();
    closeModal();return;
  }
  var link=event.target.closest&&event.target.closest('a.fancyboxModalAddProd');if(!link)return;
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
function install(){
  document.addEventListener('click',onClick,true);
  document.addEventListener('mousedown',onMouseDown,true);
  document.addEventListener('keydown',onKeyDown,true);
  document.addEventListener('focusin',onFocusIn);
}
ready(install);
SC.productModal={
  open:openModal,
  close:closeModal,
  getActive:function(){return activeModal;},
  isClosing:function(){return!!closingModal;}
};
})();