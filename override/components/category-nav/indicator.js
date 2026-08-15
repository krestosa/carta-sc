(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,N=SC&&SC.categoryNav,T=SC&&SC.templates;
if(!SC||!U||!N||!T||SC.__categoryNavIndicatorBooted)return;SC.__categoryNavIndicatorBooted=true;
var each=U.each,entries=[],dirty=true;
function mount(root){return root.closest('.topShopMenuMobileScroller')||root;}
function entry(root){var host=mount(root);for(var i=0;i<entries.length;i++)if(entries[i].root===root&&entries[i].host===host)return entries[i];var line=T.clone('category-indicator');host.classList.add('sc-category-motion-root');host.appendChild(line);if(host.classList.contains('topShopMenuMobileScroller'))line.style.setProperty('bottom','0','important');var item={root:root,host:host,line:line,x:0,w:1,init:false,fallback:null};entries.push(item);return item;}
function visual(link){var fallback=link.getBoundingClientRect();try{var range=document.createRange();range.selectNodeContents(link);var rect=range.getBoundingClientRect();if(rect&&rect.width>1&&rect.height>0)return rect;}catch(_){}return fallback;}
function reduced(){return SC.motion&&SC.motion.reduced?SC.motion.reduced():matchMedia('(prefers-reduced-motion: reduce)').matches;}
function transform(x,width){return 'translate3d('+x+'px,0,0) scaleX('+width+')';}
function fallbackMove(item,x,width,animate,duration){
  if(item.fallback){try{item.fallback.cancel();}catch(_){}item.fallback=null;}
  var line=item.line,to=transform(x,width),from=getComputedStyle(line).transform;
  line.style.opacity='1';line.style.transform=to;line.style.transformOrigin='0 50%';
  if(!item.init||!animate||reduced()||!line.animate)return;
  item.fallback=line.animate([{transform:from&&from!=='none'?from:transform(item.x,item.w),opacity:1},{transform:to,opacity:1}],{duration:Math.round(duration*1000),easing:'cubic-bezier(.22,1,.36,1)'});
  item.fallback.onfinish=item.fallback.oncancel=function(){item.fallback=null;};
}
function move(target,animate){
  entries=entries.filter(function(item){return document.documentElement.contains(item.root)&&document.documentElement.contains(item.host);});
  each(document.querySelectorAll('.wrapp-nav-tabsTopShop .nav-tabsTopShop,.wtopShopMenuMobile .topShopMenuMobile .nav-tabs,.topShopMenuMobileScroller .nav-tabsTopShop'),function(root){
    if(root.closest('.topPullDown,.dropdown-menu'))return;
    var link=N.links(root).find(function(item){return N.anchor(item.getAttribute('href'))===target&&U.visible(item);});if(!link)return;
    var item=entry(root),linkRect=visual(link),x,width,scale=1,inset;
    if(item.host.classList.contains('topShopMenuMobileScroller')){
      var hostRect=item.host.getBoundingClientRect();x=item.host.scrollLeft+(linkRect.left-hostRect.left);width=linkRect.width;
    }else{
      var rootRect=root.getBoundingClientRect();scale=root.offsetWidth&&rootRect.width?rootRect.width/root.offsetWidth:1;if(!isFinite(scale)||scale<=0)scale=1;x=(linkRect.left-rootRect.left)/scale+(root.scrollLeft||0);width=linkRect.width/scale;
    }
    inset=Math.min(1.25,Math.max(0,width*.025));x+=inset;width=Math.max(6,width-inset*2);
    var distance=Math.abs((item.x+item.w/2)-(x+width/2)),p=Math.min(1,distance/680),duration=.32+.28*Math.pow(p,.58),used=false;
    if(item.fallback){try{item.fallback.cancel();}catch(_){}item.fallback=null;}
    if(SC.motion&&SC.motion.run)used=SC.motion.run(function(deps){var gsap=deps.gsap;gsap.killTweensOf(item.line);if(!item.init||!animate||SC.motion.reduced())gsap.set(item.line,{x:x,scaleX:width,autoAlpha:1,transformOrigin:'0% 50%'});else gsap.to(item.line,{x:x,scaleX:width,autoAlpha:1,duration:duration,ease:'power3.out',overwrite:true});});
    if(!used)fallbackMove(item,x,width,animate,duration);
    item.x=x;item.w=width;item.init=true;
  });dirty=false;
}
function markDirty(){dirty=true;}function isDirty(){return dirty;}
N.categoryIndicator={move:move,markDirty:markDirty,isDirty:isDirty};N.moveIndicator=move;
})();
