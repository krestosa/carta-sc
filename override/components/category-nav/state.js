(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,N=SC&&SC.categoryNav;if(!SC||!U||!N||SC.__categoryNavStateBooted)return;SC.__categoryNavStateBooted=true;
var each=U.each,metrics=[],active=null,indicators=[],spyRaf=0,indicatorDirty=true;

function refreshMetrics(){
  var seen=[];metrics=[];
  N.links().forEach(function(link){
    var target=N.anchor(link.getAttribute('href'));if(!target||seen.indexOf(target)>=0)return;
    seen.push(target);metrics.push({target:target,top:target.getBoundingClientRect().top+(pageYOffset||document.documentElement.scrollTop||0)});
  });
  metrics.sort(function(a,b){return a.top-b.top;});indicatorDirty=true;scheduleSpy();
}
function current(){
  if(!metrics.length)return null;
  var mark=(pageYOffset||document.documentElement.scrollTop||0)+N.offset()+2,target=metrics[0].target;
  for(var i=0;i<metrics.length;i++){if(metrics[i].top<=mark)target=metrics[i].target;else break;}
  return target;
}
function indicator(root){
  for(var i=0;i<indicators.length;i++)if(indicators[i].root===root)return indicators[i];
  var line=document.createElement('span');line.className='sc-category-indicator';line.setAttribute('aria-hidden','true');
  root.classList.add('sc-category-motion-root');root.appendChild(line);
  var entry={root:root,line:line,x:0,w:1,init:false};indicators.push(entry);return entry;
}
function visual(link){
  var fallback=link.getBoundingClientRect();
  try{var range=document.createRange();range.selectNodeContents(link);var rect=range.getBoundingClientRect();if(rect&&rect.width>1&&rect.height>0)return rect;}catch(_){}
  return fallback;
}
function moveIndicator(target,animate){
  indicators=indicators.filter(function(entry){return document.documentElement.contains(entry.root);});
  each(document.querySelectorAll('.wrapp-nav-tabsTopShop .nav-tabsTopShop,.wtopShopMenuMobile .topShopMenuMobile .nav-tabs,.topShopMenuMobileScroller .nav-tabsTopShop'),function(root){
    if(root.closest('.topPullDown,.dropdown-menu'))return;
    var link=N.links(root).find(function(item){return N.anchor(item.getAttribute('href'))===target&&U.visible(item);});if(!link)return;
    var entry=indicator(root),rootRect=root.getBoundingClientRect(),linkRect=visual(link),scale=root.offsetWidth&&rootRect.width?rootRect.width/root.offsetWidth:1;
    if(!isFinite(scale)||scale<=0)scale=1;
    var x=(linkRect.left-rootRect.left)/scale+(root.scrollLeft||0),width=linkRect.width/scale,inset=Math.min(1.25,Math.max(0,width*.025));
    x+=inset;width=Math.max(6,width-inset*2);
    var distance=Math.abs((entry.x+entry.w/2)-(x+width/2)),used=false;
    if(SC.motion&&SC.motion.run)used=SC.motion.run(function(deps){
      var gsap=deps.gsap;gsap.killTweensOf(entry.line);
      if(!entry.init||!animate||SC.motion.reduced())gsap.set(entry.line,{x:x,scaleX:width,autoAlpha:1,transformOrigin:'0% 50%'});
      else{var p=Math.min(1,distance/680),duration=.26+.26*Math.pow(p,.58);gsap.to(entry.line,{x:x,scaleX:width,autoAlpha:1,duration:duration,ease:'power2.inOut',overwrite:true});}
    });
    if(!used){entry.line.style.opacity='1';entry.line.style.transform='translate3d('+x+'px,0,0) scaleX('+width+')';entry.line.style.transformOrigin='0 50%';}
    entry.x=x;entry.w=width;entry.init=true;
  });
}
function setActive(target,animate){
  if(!target)return;
  var changed=target!==active;active=target;
  N.links().forEach(function(link){
    var on=N.anchor(link.getAttribute('href'))===target;link.classList.toggle('sc-motion-current',on);
    if(on)link.setAttribute('aria-current','location');else if(link.getAttribute('aria-current')==='location')link.removeAttribute('aria-current');
  });
  each(document.querySelectorAll('a.anchorLinkSub.sc-motion-current'),function(link){link.classList.remove('sc-motion-current');link.removeAttribute('aria-current');});
  each(document.querySelectorAll('.JSgoMenu'),function(select){
    for(var i=0;i<select.options.length;i++)if(N.anchor(select.options[i].value)===target){if(select.value!==select.options[i].value)select.value=select.options[i].value;break;}
  });
  moveIndicator(target,animate&&changed);indicatorDirty=false;
  if(changed&&N.requestCenterActive)N.requestCenterActive();else if(N.scheduleRail)N.scheduleRail();
}
function spy(){spyRaf=0;var target=current();if(target&&target!==active)setActive(target,true);else if(target&&indicatorDirty){moveIndicator(target,false);indicatorDirty=false;}}
function scheduleSpy(){if(!spyRaf)spyRaf=requestAnimationFrame(spy);}

N.refreshMetrics=refreshMetrics;
N.refreshSections=refreshMetrics;
N.current=current;
N.moveIndicator=moveIndicator;
N.setActive=setActive;
N.scheduleSpy=scheduleSpy;
})();
