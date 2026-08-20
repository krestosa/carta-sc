/* Sincroniza la categoría activa entre enlaces, selector e indicador visual. Mantiene un
   único estado compartido para evitar que desktop y mobile marquen destinos distintos. */
(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,N=SC&&SC.categoryNav,I=N&&N.categoryIndicator;
if(!SC||!U||!N||!I||SC.__categoryNavActiveStateBooted)return;SC.__categoryNavActiveStateBooted=true;
var each=U.each,active:HTMLElement|null=null;
function current():HTMLElement|null{return active;}
/* Actualiza semántica, selector e indicador en una sola escritura lógica. */
function setActive(target:HTMLElement|null,animate:boolean):void{
  if(!target)return;var previous=active,changed=target!==previous;active=target;
  (N.links() as HTMLAnchorElement[]).forEach(function(link:HTMLAnchorElement){
    var item=link.closest<HTMLElement>('.nav-top-li'),on=N.anchor(link.getAttribute('href'))===target;
    if(item)item.classList.remove('active');link.classList.toggle('sc-motion-current',on);
    if(on)link.setAttribute('aria-current','location');else if(link.getAttribute('aria-current')==='location')link.removeAttribute('aria-current');
  });
  each(document.querySelectorAll('a.anchorLinkSub.sc-motion-current'),function(link:Element){link.classList.remove('sc-motion-current');link.removeAttribute('aria-current');});
  each(document.querySelectorAll('select'),function(select:HTMLSelectElement){
    if(!select.matches(N.selectors.select))return;
    for(var i=0;i<select.options.length;i++){var option=select.options.item(i);if(option&&N.anchor(option.value)===target){if(select.value!==option.value)select.value=option.value;break;}}
  });
  I.move(target,animate&&changed);
  if(changed&&previous&&N.requestCenterActive)N.requestCenterActive(previous,target);else if(N.scheduleRail)N.scheduleRail();
}
N.categoryActive={current:current,set:setActive};N.setActive=setActive;
})();