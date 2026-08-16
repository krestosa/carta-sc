(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,S=C&&C.selectors,K=C&&C.classes,N=SC&&SC.categoryNav,I=N&&N.categoryIndicator;
if(!SC||!U||!N||!I||SC.__categoryNavActiveStateBooted)return;SC.__categoryNavActiveStateBooted=true;
var each=U.each,active=null;
function current(){return active;}
function setActive(target,animate){
  if(!target)return;var previous=active,changed=target!==previous;active=target;
  N.links().forEach(function(link){var on=N.anchor(link.getAttribute('href'))===target;link.classList.toggle("sc-motion-current",on);if(on)link.setAttribute('aria-current','location');else if(link.getAttribute('aria-current')==='location')link.removeAttribute('aria-current');});
  each(document.querySelectorAll("a.anchorLinkSub"+'.'+"sc-motion-current"),function(link){link.classList.remove("sc-motion-current");link.removeAttribute('aria-current');});
  each(document.querySelectorAll(N.selectors.select),function(select){for(var i=0;i<select.options.length;i++)if(N.anchor(select.options[i].value)===target){if(select.value!==select.options[i].value)select.value=select.options[i].value;break;}});
  I.move(target,animate&&changed);
  if(changed&&previous&&N.requestCenterActive)N.requestCenterActive(previous,target);else if(N.scheduleRail)N.scheduleRail();
}
N.categoryActive={current:current,set:setActive};N.setActive=setActive;
})();
