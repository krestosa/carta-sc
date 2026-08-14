(function(){
'use strict';
if(window.__scCategoryIndicatorEdgeBooted)return;
window.__scCategoryIndicatorEdgeBooted=true;

var desktopQuery=window.matchMedia('(min-width: 993px)');
var raf=0;
var observer=null;

function visualRect(link){
  var fallback=link.getBoundingClientRect();
  try{
    var range=document.createRange();
    range.selectNodeContents(link);
    var rect=range.getBoundingClientRect();
    if(rect&&rect.width>1&&rect.height>0)return rect;
  }catch(e){}
  return fallback;
}

function activeLink(root){
  return root.querySelector(':scope > .nav-top-li > a.anchorLink.sc-motion-current')
    ||root.querySelector(':scope > .nav-top-li > a.anchorLink[aria-current="location"]')
    ||root.querySelector(':scope > .nav-top-li.active > a.anchorLink')
    ||root.querySelector(':scope > .nav-top-li > a.anchorLink.active');
}

function updateRoot(root){
  var line=root.querySelector(':scope > .sc-category-indicator');
  var first=root.querySelector(':scope > .nav-top-li > a.anchorLink[href^="#"]');
  if(!line||!first)return;

  var active=activeLink(root);
  if(active!==first){
    line.style.setProperty('margin-left','0px','important');
    return;
  }

  var linkRect=first.getBoundingClientRect();
  var textRect=visualRect(first);
  var inset=Math.min(1.25,Math.max(0,textRect.width*0.025));
  var correction=Math.max(0,(textRect.left-linkRect.left)+inset);

  line.style.setProperty('margin-left',(-correction)+'px','important');
}

function update(){
  raf=0;
  if(!desktopQuery.matches)return;
  document.querySelectorAll('.sc-catalog-toolbar .nav-tabsTopShop').forEach(updateRoot);
}

function schedule(){
  if(raf)cancelAnimationFrame(raf);
  raf=requestAnimationFrame(update);
}

function boot(){
  if(observer)observer.disconnect();
  observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{
    subtree:true,
    childList:true,
    attributes:true,
    attributeFilter:['class','aria-current']
  });
  schedule();

  if(document.fonts&&document.fonts.ready){
    document.fonts.ready.then(schedule).catch(function(){});
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();

window.addEventListener('resize',schedule,{passive:true});
if(desktopQuery.addEventListener)desktopQuery.addEventListener('change',schedule);
else desktopQuery.addListener(schedule);
})();
