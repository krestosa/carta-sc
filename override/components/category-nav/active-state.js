(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,N=SC&&SC.categoryNav,I=N&&N.categoryIndicator;
if(!SC||!U||!N||!I||SC.__categoryNavActiveStateBooted)return;SC.__categoryNavActiveStateBooted=true;
var each=U.each,active=null,primeRaf=0;
function current(){return active;}
function setActive(target,animate){
  if(!target)return;var previous=active,changed=target!==previous;active=target;
  N.links().forEach(function(link){
    var item=link.closest('.nav-top-li'),on=N.anchor(link.getAttribute('href'))===target;
    if(item)item.classList.remove('active');
    link.classList.toggle('sc-motion-current',on);
    if(on)link.setAttribute('aria-current','location');else if(link.getAttribute('aria-current')==='location')link.removeAttribute('aria-current');
  });
  each(document.querySelectorAll('a.anchorLinkSub.sc-motion-current'),function(link){link.classList.remove('sc-motion-current');link.removeAttribute('aria-current');});
  each(document.querySelectorAll(N.selectors.select),function(select){for(var i=0;i<select.options.length;i++)if(N.anchor(select.options[i].value)===target){if(select.value!==select.options[i].value)select.value=select.options[i].value;break;}});
  I.move(target,animate&&changed);
  if(changed&&previous&&N.requestCenterActive)N.requestCenterActive(previous,target);else if(N.scheduleRail)N.scheduleRail();
}
function initialTarget(){
  var seen=[],first=null,best=null,bestTop=-Infinity,mark=(N.offset?N.offset():0)+(N.currentMarkOffset||0);
  N.links().forEach(function(link){var target=N.anchor(link.getAttribute('href')),rect;if(!target||seen.indexOf(target)>=0)return;seen.push(target);if(!first)first=target;rect=target.getBoundingClientRect();if(rect.top<=mark&&rect.top>bestTop){best=target;bestTop=rect.top;}});
  return best||first;
}
function primeIndicator(target,remaining){
  if(active!==target)return;I.move(target,false);if(document.querySelector('.sc-category-indicator')||remaining<=0)return;
  primeRaf=requestAnimationFrame(function(){primeRaf=0;primeIndicator(target,remaining-1);});
}
function prime(){var target=initialTarget();if(!target)return;setActive(target,false);primeIndicator(target,8);}
prime();
N.categoryActive={current:current,set:setActive,prime:prime};N.setActive=setActive;
})();
