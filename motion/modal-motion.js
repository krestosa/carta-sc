(function(){
'use strict';
if(window.__scModalMotionBooted)return;
window.__scModalMotionBooted=true;

var attempts=0;
var observer=null;

function reduced(){return window.matchMedia('(prefers-reduced-motion: reduce)').matches;}

function getModal(node){
  if(!node)return null;
  if(node.matches&&node.matches('.sc-product-modal'))return node;
  return node.querySelector&&node.querySelector('.sc-product-modal');
}

function animateOpen(modal){
  if(!modal||modal.dataset.scMotionOpened==='1'||!window.gsap)return;
  modal.dataset.scMotionOpened='1';
  var dialog=modal.querySelector('.sc-product-modal__dialog');
  if(!dialog)return;

  if(reduced()){
    window.gsap.set([modal,dialog],{clearProps:'opacity,visibility,transform'});
    return;
  }

  var gsap=window.gsap;
  gsap.killTweensOf([modal,dialog]);
  gsap.set(modal,{autoAlpha:0});
  gsap.set(dialog,{autoAlpha:0,y:10,scale:0.992,transformOrigin:'50% 50%'});
  gsap.timeline({defaults:{overwrite:'auto'}})
    .to(modal,{autoAlpha:1,duration:0.14,ease:'power2.out'},0)
    .to(dialog,{autoAlpha:1,y:0,scale:1,duration:0.20,ease:'power3.out',clearProps:'transform,opacity,visibility'},0.015);
}

/* Run the catalogue's native close immediately so activeModal is cleared and
   the page becomes interactive at once. The old DOM node remains for its native
   190ms removal window, which is enough for our short visual exit. */
function releaseNativeClose(modal,mode){
  if(!modal)return;
  modal.dataset.scMotionClosing='released';

  if(mode==='button'){
    var button=modal.querySelector('.sc-product-modal__close');
    if(button)button.click();
    return;
  }

  if(mode==='overlay'){
    modal.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true,view:window}));
    return;
  }

  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
}

function animateClose(modal,mode){
  if(!modal||modal.dataset.scMotionClosing)return;

  modal.dataset.scMotionClosing='animating';
  modal.style.pointerEvents='none';
  document.body.classList.remove('sc-product-modal-open');

  var dialog=modal.querySelector('.sc-product-modal__dialog');
  var gsap=window.gsap;

  /* Functional close happens first. This means another card can open during
     the visual tail without the previous modal closing the new one. */
  releaseNativeClose(modal,mode);

  if(!gsap||reduced()||!dialog)return;

  gsap.killTweensOf([modal,dialog]);
  gsap.timeline({defaults:{overwrite:'auto'}})
    .to(dialog,{autoAlpha:0,y:6,scale:0.994,duration:0.11,ease:'power2.in'},0)
    .to(modal,{autoAlpha:0,duration:0.13,ease:'power2.inOut'},0.005);
}

function onClick(event){
  var button=event.target.closest&&event.target.closest('.sc-product-modal__close');
  if(!button)return;
  var modal=button.closest('.sc-product-modal');
  if(!modal||modal.dataset.scMotionClosing==='released')return;
  event.preventDefault();
  event.stopPropagation();
  if(event.stopImmediatePropagation)event.stopImmediatePropagation();
  animateClose(modal,'button');
}

function onMouseDown(event){
  var modal=event.target&&event.target.matches&&event.target.matches('.sc-product-modal')?event.target:null;
  if(!modal||modal.dataset.scMotionClosing==='released')return;
  event.preventDefault();
  event.stopPropagation();
  if(event.stopImmediatePropagation)event.stopImmediatePropagation();
  animateClose(modal,'overlay');
}

function activeUnreleasedModal(){
  var modals=document.querySelectorAll('.sc-product-modal');
  for(var i=modals.length-1;i>=0;i-=1){
    if(modals[i].dataset.scMotionClosing!=='released')return modals[i];
  }
  return null;
}

function onKeyDown(event){
  if(event.key!=='Escape'&&event.key!=='Esc')return;
  var modal=activeUnreleasedModal();
  if(!modal)return;
  event.preventDefault();
  event.stopPropagation();
  if(event.stopImmediatePropagation)event.stopImmediatePropagation();
  animateClose(modal,'escape');
}

function install(){
  if(!window.gsap){
    if(attempts++<120)window.setTimeout(install,50);
    return;
  }

  document.addEventListener('click',onClick,true);
  document.addEventListener('mousedown',onMouseDown,true);
  document.addEventListener('keydown',onKeyDown,true);

  var existing=activeUnreleasedModal();
  if(existing)requestAnimationFrame(function(){animateOpen(existing);});

  if(document.body&&window.MutationObserver){
    observer=new MutationObserver(function(mutations){
      mutations.forEach(function(mutation){
        Array.prototype.forEach.call(mutation.addedNodes,function(node){
          var modal=getModal(node);
          if(modal)requestAnimationFrame(function(){animateOpen(modal);});
        });
      });
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();

/* Deploy marker: fast-nonblocking-modal-v4. */
