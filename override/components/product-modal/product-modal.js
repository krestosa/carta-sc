(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,S=C&&C.selectors,K=C&&C.classes,V=SC&&SC.productModalView,A=SC&&SC.productModalA11y,M=SC&&SC.productModalMotion;
if(!SC||!U||!V||!A||!M||SC.__productModalBooted)return;SC.__productModalBooted=true;
var ready=U.ready,activeModal=null,activeLink=null,closingModal=null,previousFocus=null,releaseBackground=null,closingRelease=null,closingRestore=null,openRaf=0,closeTimer=0,initialized=false,touchStart=null,returnUrl='',PRODUCT_MODAL_CLOSE_DELAY=190,HASH_PREFIX='#producto-';
function noop(){}
function focus(node){if(!node||!document.documentElement.contains(node))return;try{node.focus({preventScroll:true});}catch(_){node.focus();}}
function cancelOpenRaf(){if(openRaf){cancelAnimationFrame(openRaf);openRaf=0;}}
function cancelCloseTimer(){if(closeTimer){clearTimeout(closeTimer);closeTimer=0;}}
function slugText(value){var text=String(value||'').toLowerCase().trim();if(text.normalize)text=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'');return text.replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'producto';}
function titleOf(link){var card=link&&link.closest(S.productCard),title=card&&card.querySelector(S.productTitle);return(title&&title.textContent||'').replace(/\s+/g,' ').trim();}
function allLinks(){return Array.prototype.slice.call(document.querySelectorAll(S.productLink));}
function slugFor(link){var base=slugText(titleOf(link)),matches=allLinks().filter(function(candidate){return slugText(titleOf(candidate))===base;}),index=matches.indexOf(link);return base+(index>0?'-'+(index+1):'');}
function findBySlug(slug){var links=allLinks();for(var i=0;i<links.length;i++)if(slugFor(links[i])===slug)return links[i];return null;}
function currentProductHash(){return(location.hash||'').indexOf(HASH_PREFIX)===0;}
function productUrl(link){return(location.pathname||'/')+(location.search||'')+HASH_PREFIX+slugFor(link);}
function writeProductHash(link){try{history.replaceState(history.state,document.title,productUrl(link));}catch(_){}}
function clearProductHash(){if(!currentProductHash())return;try{history.replaceState(history.state,document.title,returnUrl||(location.pathname||'/')+(location.search||''));}catch(_){}}
function displayedLinks(){
  var links=allLinks().filter(function(link){var card=link.closest(S.productCard);return card&&!card.hidden&&card.getClientRects().length>0&&getComputedStyle(card).display!=='none';});
  links.sort(function(a,b){var ar=a.closest(S.productCard).getBoundingClientRect(),br=b.closest(S.productCard).getBoundingClientRect(),ay=ar.top+(window.scrollY||0),by=br.top+(window.scrollY||0);if(Math.abs(ay-by)>.5)return ay-by;return ar.left-br.left;});return links;
}
function navigationState(){var links=displayedLinks(),index=links.indexOf(activeLink);return{links:links,index:index,prev:index>0?links[index-1]:null,next:index>=0&&index<links.length-1?links[index+1]:null};}
function makeNavButton(className,label,path){var button=document.createElement('button');button.type='button';button.className=className;button.setAttribute('aria-label',label);button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+path+'"></path></svg>';return button;}
function decorateModal(modal){
  var stage=modal&&modal.querySelector('.sc-product-modal__image-stage');if(!stage||stage.querySelector('.sc-product-modal__previous'))return;
  stage.appendChild(makeNavButton('sc-product-modal__browse-button sc-product-modal__previous','Producto anterior','M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z'));
  stage.appendChild(makeNavButton('sc-product-modal__browse-button sc-product-modal__next','Producto siguiente','M8.59 16.59 10 18l6-6-6-6-1.41 1.41L13.17 12z'));
  var hint=document.createElement('div');hint.className='sc-product-modal__browse-hint';hint.setAttribute('aria-hidden','true');hint.innerHTML='<span>‹</span><span>Deslizá para ver más</span><span>›</span>';stage.appendChild(hint);
}
function syncNavigation(){
  if(!activeModal)return;var state=navigationState(),prev=activeModal.querySelector('.sc-product-modal__previous'),next=activeModal.querySelector('.sc-product-modal__next'),hint=activeModal.querySelector('.sc-product-modal__browse-hint'),browsable=state.links.length>1;
  activeModal.classList.toggle('sc-product-modal--browsable',browsable);if(prev)prev.disabled=!state.prev;if(next)next.disabled=!state.next;if(hint)hint.hidden=!browsable;
}
function animateSwap(modal,direction){
  if(!modal||C.queries.reducedMotion.matches)return;var dialog=modal.querySelector('.sc-product-modal__dialog');if(!dialog||!dialog.animate)return;dialog.animate([{opacity:.82,transform:'translateX('+(direction>0?'18px':'-18px')+')'},{opacity:1,transform:'translateX(0)'}],{duration:210,easing:'cubic-bezier(.22,1,.36,1)'});
}
function buildModal(link){var modal=V.build(link);if(!modal)return null;decorateModal(modal);return modal;}
function replaceProduct(link,direction){
  if(!activeModal||!link)return;var nextModal=buildModal(link);if(!nextModal)return;var old=activeModal;nextModal.classList.add('is-visible');old.replaceWith(nextModal);activeModal=nextModal;activeLink=link;writeProductHash(link);syncNavigation();animateSwap(nextModal,direction||1);var target=nextModal.querySelector(direction<0?'.sc-product-modal__previous':'.sc-product-modal__next')||nextModal.querySelector('.sc-product-modal__close');focus(target);
}
function navigate(direction){var state=navigationState(),link=direction<0?state.prev:state.next;if(link)replaceProduct(link,direction);}
function finishClose(modal,restoreFocus){
  if(closingModal!==modal)return;cancelCloseTimer();if(modal.parentNode)modal.parentNode.removeChild(modal);document.body.classList.remove('sc-product-modal-open');var release=closingRelease||noop,restore=closingRestore;closingModal=null;closingRelease=null;closingRestore=null;release();if(restoreFocus!==false)focus(restore);
}
function closeModal(event,keepHash){
  if(event)event.preventDefault();if(!activeModal||closingModal)return;cancelOpenRaf();var modal=activeModal;closingRestore=previousFocus;closingRelease=releaseBackground||noop;activeModal=null;activeLink=null;closingModal=modal;previousFocus=null;releaseBackground=null;touchStart=null;if(!keepHash)clearProductHash();modal.classList.remove('is-visible');M.close(modal);var delay=C.queries.reducedMotion.matches?0:PRODUCT_MODAL_CLOSE_DELAY;closeTimer=window.setTimeout(function(){closeTimer=0;finishClose(modal,true);},delay);
}
function openModal(link,options){
  options=options||{};if(activeModal||closingModal||!link)return;var modal=buildModal(link);if(!modal)return;previousFocus=options.fromHash?null:link;returnUrl=options.fromHash?(location.pathname||'/')+(location.search||''):(location.pathname||'/')+(location.search||'')+(currentProductHash()?'':location.hash||'');document.body.appendChild(modal);document.body.classList.add('sc-product-modal-open');activeModal=modal;activeLink=link;releaseBackground=A.lockBackground(modal)||noop;if(!options.fromHash)writeProductHash(link);syncNavigation();focus(modal.querySelector('.sc-product-modal__close'));cancelOpenRaf();openRaf=requestAnimationFrame(function(){openRaf=0;if(activeModal===modal){modal.classList.add('is-visible');M.open(modal);}});
}
function openFromHash(){if(!initialized||activeModal||closingModal||!currentProductHash())return;var slug=(location.hash||'').slice(HASH_PREFIX.length),link=findBySlug(slug);if(link)openModal(link,{fromHash:true});}
function onClick(event){
  var prev=event.target.closest&&event.target.closest('.sc-product-modal__previous'),next=event.target.closest&&event.target.closest('.sc-product-modal__next');if(activeModal&&prev&&activeModal.contains(prev)){event.preventDefault();event.stopPropagation();navigate(-1);return;}if(activeModal&&next&&activeModal.contains(next)){event.preventDefault();event.stopPropagation();navigate(1);return;}
  var close=event.target.closest&&event.target.closest('.sc-product-modal__close');if(close&&activeModal&&activeModal.contains(close)){event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation();closeModal();return;}
  var link=event.target.closest&&event.target.closest(S.productLink);if(!link)return;if((event.button&&event.button!==0)||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation();openModal(link);
}
function onMouseDown(event){if(!activeModal||event.target!==activeModal)return;event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation();closeModal();}
function onPointerDown(event){if(!activeModal||event.pointerType==='mouse')return;var stage=event.target.closest&&event.target.closest('.sc-product-modal__image-stage');if(!stage||!activeModal.contains(stage))return;touchStart={id:event.pointerId,x:event.clientX,y:event.clientY};}
function onPointerUp(event){if(!touchStart||touchStart.id!==event.pointerId)return;var start=touchStart;touchStart=null;var dx=event.clientX-start.x,dy=event.clientY-start.y;if(Math.abs(dx)<46||Math.abs(dx)<Math.abs(dy)*1.15)return;event.preventDefault();navigate(dx<0?1:-1);}
function onKeyDown(event){
  if(!activeModal)return;if(event.key==='Escape'||event.key==='Esc'){event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation();closeModal();return;}if(event.key==='ArrowLeft'){event.preventDefault();navigate(-1);return;}if(event.key==='ArrowRight'){event.preventDefault();navigate(1);return;}if(event.key==='Tab')A.trapTab(activeModal,event);
}
function onFocusIn(event){A.containFocus(activeModal,event);}
function onHashChange(){if(currentProductHash()){if(!activeModal)openFromHash();else{var link=findBySlug((location.hash||'').slice(HASH_PREFIX.length));if(link&&link!==activeLink)replaceProduct(link,1);}}else if(activeModal)closeModal(null,true);}
function addListeners(){document.addEventListener('click',onClick,true);document.addEventListener('mousedown',onMouseDown,true);document.addEventListener('pointerdown',onPointerDown,true);document.addEventListener('pointerup',onPointerUp,true);document.addEventListener('keydown',onKeyDown,true);document.addEventListener('focusin',onFocusIn);window.addEventListener('hashchange',onHashChange);}
function removeListeners(){document.removeEventListener('click',onClick,true);document.removeEventListener('mousedown',onMouseDown,true);document.removeEventListener('pointerdown',onPointerDown,true);document.removeEventListener('pointerup',onPointerUp,true);document.removeEventListener('keydown',onKeyDown,true);document.removeEventListener('focusin',onFocusIn);window.removeEventListener('hashchange',onHashChange);}
function init(){if(initialized)return;initialized=true;addListeners();requestAnimationFrame(openFromHash);}
function destroy(){
  if(initialized){initialized=false;removeListeners();}cancelOpenRaf();cancelCloseTimer();var modal=activeModal||closingModal,restore=previousFocus||closingRestore,release=releaseBackground||closingRelease||noop;activeModal=null;activeLink=null;closingModal=null;previousFocus=null;releaseBackground=null;closingRelease=null;closingRestore=null;touchStart=null;if(modal&&modal.parentNode)modal.parentNode.removeChild(modal);if(document.body)document.body.classList.remove('sc-product-modal-open');release();focus(restore);
}
ready(init);SC.productModal={open:openModal,close:closeModal,navigate:navigate,getActive:function(){return activeModal;},isClosing:function(){return!!closingModal;},init:init,destroy:destroy};
})();
