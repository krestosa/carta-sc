(function(){
'use strict';
if(window.__scCatalogSkeletonBooted)return;
window.__scCatalogSkeletonBooted=true;

var root=document.documentElement;
var desktop=window.matchMedia('(min-width: 993px)');
var MIN_VISIBLE_MS=120;
var MAX_WAIT_MS=1800;
var EXIT_MS=280;
var started=Date.now();
var finished=false;

if(!desktop.matches)return;
root.classList.add('sc-catalog-skeleton','sc-catalog-content-loading');

function ready(fn){
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
}

function waitForLayout(){
  return new Promise(function(resolve){
    if(document.body&&document.body.classList.contains('sc-catalog-layout-ready'))return resolve();
    var body=document.body;
    if(!body)return ready(function(){waitForLayout().then(resolve);});
    var observer=new MutationObserver(function(){
      if(body.classList.contains('sc-catalog-layout-ready')){
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(body,{attributes:true,attributeFilter:['class']});
    setTimeout(function(){observer.disconnect();resolve();},900);
  });
}

function waitForFonts(){
  if(!document.fonts||!document.fonts.ready)return Promise.resolve();
  return Promise.race([
    document.fonts.ready.catch(function(){}),
    new Promise(function(resolve){setTimeout(resolve,700);})
  ]);
}

function backgroundUrl(el){
  if(!el)return'';
  var value=el.style.backgroundImage||getComputedStyle(el).backgroundImage||'';
  var match=value.match(/^url\(["']?(.*?)["']?\)$/);
  return match?match[1]:'';
}

function preload(url){
  return new Promise(function(resolve){
    if(!url)return resolve();
    var img=new Image();
    var done=function(){img.onload=img.onerror=null;resolve();};
    img.onload=done;
    img.onerror=done;
    img.src=url;
    if(img.complete)done();
    setTimeout(done,900);
  });
}

function waitForAboveFoldImages(){
  var jobs=[];
  var banner=document.querySelector('.bannerShop .imgBannerShop');
  if(banner){
    if(banner.complete&&banner.naturalWidth){}else{
      jobs.push(new Promise(function(resolve){
        var done=function(){banner.removeEventListener('load',done);banner.removeEventListener('error',done);resolve();};
        banner.addEventListener('load',done,{once:true});
        banner.addEventListener('error',done,{once:true});
        setTimeout(done,900);
      }));
    }
  }

  Array.prototype.slice.call(document.querySelectorAll('.listadoShop .productoShop .imgShop'),0,6).forEach(function(box){
    jobs.push(preload(backgroundUrl(box)));
  });
  return Promise.all(jobs);
}

function nextPaint(){
  return new Promise(function(resolve){
    requestAnimationFrame(function(){requestAnimationFrame(resolve);});
  });
}

function finish(){
  if(finished)return;
  finished=true;
  var remaining=Math.max(0,MIN_VISIBLE_MS-(Date.now()-started));
  setTimeout(function(){
    /* Content and placeholders overlap during this state. CSS crossfades them,
       so the catalogue never flashes between skeleton and final content. */
    root.classList.add('sc-catalog-skeleton-leaving');
    root.classList.remove('sc-catalog-content-loading');
    setTimeout(function(){
      root.classList.remove('sc-catalog-skeleton','sc-catalog-skeleton-leaving');
      var container=document.querySelector('.containerShop');
      if(container)container.removeAttribute('aria-busy');
    },EXIT_MS);
  },remaining);
}

ready(function(){
  var container=document.querySelector('.containerShop');
  if(container)container.setAttribute('aria-busy','true');

  Promise.race([
    Promise.all([waitForLayout(),waitForFonts()]).then(waitForAboveFoldImages).then(nextPaint),
    new Promise(function(resolve){setTimeout(resolve,MAX_WAIT_MS);})
  ]).then(finish,finish);
});
})();