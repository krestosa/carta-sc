(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,N=SC&&SC.categoryNav,T=SC&&SC.templates;
if(!SC||!U||!N||!T||SC.__categoryNavIndicatorBooted)return;SC.__categoryNavIndicatorBooted=true;
var each=U.each,entries=[],dirty=true;
function entry(root){for(var i=0;i<entries.length;i++)if(entries[i].root===root)return entries[i];var line=T.clone('category-indicator');root.classList.add('sc-category-motion-root');root.appendChild(line);var item={root:root,line:line,x:0,w:1,init:false};entries.push(item);return item;}
function visual(link){var fallback=link.getBoundingClientRect();try{var range=document.createRange();range.selectNodeContents(link);var rect=range.getBoundingClientRect();if(rect&&rect.width>1&&rect.height>0)return rect;}catch(_){}return fallback;}
function move(target,animate){
  entries=entries.filter(function(item){return document.documentElement.contains(item.root);});
  each(document.querySelectorAll('.wrapp-nav-tabsTopShop .nav-tabsTopShop,.wtopShopMenuMobile .topShopMenuMobile .nav-tabs,.topShopMenuMobileScroller .nav-tabsTopShop'),function(root){
    if(root.closest('.topPullDown,.dropdown-menu'))return;
    var link=N.links(root).find(function(item){return N.anchor(item.getAttribute('href'))===target&&U.visible(item);});if(!link)return;
    var item=entry(root),rootRect=root.getBoundingClientRect(),linkRect=visual(link),scale=root.offsetWidth&&rootRect.width?rootRect.width/root.offsetWidth:1;if(!isFinite(scale)||scale<=0)scale=1;
    var x=(linkRect.left-rootRect.left)/scale+(root.scrollLeft||0),width=linkRect.width/scale,inset=Math.min(1.25,Math.max(0,width*.025));x+=inset;width=Math.max(6,width-inset*2);
    var distance=Math.abs((item.x+item.w/2)-(x+width/2)),used=false;
    if(SC.motion&&SC.motion.run)used=SC.motion.run(function(deps){var gsap=deps.gsap;gsap.killTweensOf(item.line);if(!item.init||!animate||SC.motion.reduced())gsap.set(item.line,{x:x,scaleX:width,autoAlpha:1,transformOrigin:'0% 50%'});else{var p=Math.min(1,distance/680),duration=.26+.26*Math.pow(p,.58);gsap.to(item.line,{x:x,scaleX:width,autoAlpha:1,duration:duration,ease:'power2.inOut',overwrite:true});}});
    if(!used){item.line.style.opacity='1';item.line.style.transform='translate3d('+x+'px,0,0) scaleX('+width+')';item.line.style.transformOrigin='0 50%';}
    item.x=x;item.w=width;item.init=true;
  });dirty=false;
}
function markDirty(){dirty=true;}function isDirty(){return dirty;}
N.categoryIndicator={move:move,markDirty:markDirty,isDirty:isDirty};N.moveIndicator=move;
})();
