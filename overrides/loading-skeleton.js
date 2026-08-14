(function(){
'use strict';
if(window.__scCatalogSkeletonBooted)return;
window.__scCatalogSkeletonBooted=true;

var currentScript=document.currentScript;
if(currentScript)currentScript.dataset.loaded='true';

var root=document.documentElement;
var desktop=window.matchMedia('(min-width: 993px)');
var MIN_VISIBLE_MS=100;
var MAX_WAIT_MS=2000;
var EXIT_MS=240;
var started=Date.now();
var finished=false;
var skeletonHosts=[];

if(!desktop.matches){
  root.classList.remove('sc-catalog-skeleton','sc-catalog-content-loading','sc-catalog-skeleton-leaving','sc-skeleton-ready');
  return;
}
root.classList.add('sc-catalog-skeleton','sc-catalog-content-loading');

function ready(fn){
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
}

function nextPaint(){
  return new Promise(function(resolve){requestAnimationFrame(function(){requestAnimationFrame(resolve);});});
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
    setTimeout(function(){observer.disconnect();resolve();},1100);
  });
}

function waitForFonts(){
  if(!document.fonts||!document.fonts.ready)return Promise.resolve();
  return Promise.race([
    document.fonts.ready.catch(function(){}),
    new Promise(function(resolve){setTimeout(resolve,800);})
  ]);
}

function clearDynamicSkeleton(){
  skeletonHosts.forEach(function(host){
    Array.prototype.forEach.call(host.querySelectorAll(':scope > .sc-skeleton-layer'),function(layer){layer.remove();});
    host.classList.remove('sc-skeleton-host','sc-skeleton-text','sc-skeleton-image');
  });
  skeletonHosts=[];
}

function remember(host){
  if(skeletonHosts.indexOf(host)===-1)skeletonHosts.push(host);
}

function mergeLineRects(rects){
  var sorted=rects.slice().sort(function(a,b){return a.top===b.top?a.left-b.left:a.top-b.top;});
  var lines=[];
  sorted.forEach(function(rect){
    var center=rect.top+rect.height/2;
    var line=null;
    for(var i=0;i<lines.length;i+=1){
      var otherCenter=lines[i].top+lines[i].height/2;
      if(Math.abs(center-otherCenter)<=Math.max(3,Math.min(rect.height,lines[i].height)*0.45)){
        line=lines[i];
        break;
      }
    }
    if(!line){
      lines.push({left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom,width:rect.width,height:rect.height});
      return;
    }
    line.left=Math.min(line.left,rect.left);
    line.top=Math.min(line.top,rect.top);
    line.right=Math.max(line.right,rect.right);
    line.bottom=Math.max(line.bottom,rect.bottom);
    line.width=line.right-line.left;
    line.height=line.bottom-line.top;
  });
  return lines;
}

function measuredTextRects(host){
  var hostRect=host.getBoundingClientRect();
  if(hostRect.width<=1||hostRect.height<=1)return[];
  var raw=[];
  var walker=document.createTreeWalker(host,NodeFilter.SHOW_TEXT,{acceptNode:function(node){
    if(!node.nodeValue||!node.nodeValue.trim())return NodeFilter.FILTER_REJECT;
    if(node.parentElement&&node.parentElement.closest('.sc-skeleton-layer'))return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT;
  }});
  var node;
  while((node=walker.nextNode())){
    var range=document.createRange();
    range.selectNodeContents(node);
    Array.prototype.forEach.call(range.getClientRects(),function(rect){
      if(rect.width>1&&rect.height>2&&rect.bottom>hostRect.top&&rect.top<hostRect.bottom){
        raw.push({left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom,width:rect.width,height:rect.height});
      }
    });
    range.detach&&range.detach();
  }
  return mergeLineRects(raw).map(function(rect){
    var height=Math.max(5,Math.min(16,rect.height*0.56));
    return{
      left:Math.max(0,rect.left-hostRect.left),
      top:Math.max(0,rect.top-hostRect.top+(rect.height-height)/2),
      width:Math.max(2,Math.min(hostRect.width,rect.width)),
      height:height
    };
  });
}

function makeTextSkeleton(host){
  if(!host||host.offsetParent===null)return;
  var rects=measuredTextRects(host);
  if(!rects.length)return;
  host.classList.add('sc-skeleton-host','sc-skeleton-text');
  remember(host);
  var layer=document.createElement('span');
  layer.className='sc-skeleton-layer';
  layer.setAttribute('aria-hidden','true');
  rects.forEach(function(rect){
    var bar=document.createElement('span');
    bar.className='sc-skeleton-bar';
    bar.style.left=rect.left.toFixed(2)+'px';
    bar.style.top=rect.top.toFixed(2)+'px';
    bar.style.width=rect.width.toFixed(2)+'px';
    bar.style.height=rect.height.toFixed(2)+'px';
    layer.appendChild(bar);
  });
  host.appendChild(layer);
}

function makeImageSkeleton(host){
  if(!host||host.offsetParent===null)return;
  var rect=host.getBoundingClientRect();
  if(rect.width<=1||rect.height<=1)return;
  host.classList.add('sc-skeleton-host','sc-skeleton-image');
  remember(host);
  var layer=document.createElement('span');
  layer.className='sc-skeleton-layer';
  layer.setAttribute('aria-hidden','true');
  host.appendChild(layer);
}

function buildDynamicSkeleton(){
  clearDynamicSkeleton();

  var banner=document.querySelector('.bannerShop .BanContShop');
  makeImageSkeleton(banner);

  document.querySelectorAll('.sc-catalog-toolbar .nav-top-li > a.anchorLink').forEach(makeTextSkeleton);
  document.querySelectorAll('.listadoShop .titleShopSeccion > div').forEach(makeTextSkeleton);
  document.querySelectorAll('.listadoShop .subTitleShopSeccion').forEach(makeTextSkeleton);
  document.querySelectorAll('.listadoShop .productoShop .imgShop').forEach(makeImageSkeleton);
  document.querySelectorAll('.listadoShop .productoShop .title-shop1').forEach(makeTextSkeleton);
  document.querySelectorAll('.listadoShop .productoShop .descrip').forEach(makeTextSkeleton);
  document.querySelectorAll('.listadoShop .productoShop .priceRow').forEach(makeTextSkeleton);

  root.classList.add('sc-skeleton-ready');
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
    setTimeout(done,950);
  });
}

function waitForImage(img){
  return new Promise(function(resolve){
    if(!img||img.complete&&img.naturalWidth)return resolve();
    var done=function(){img.removeEventListener('load',done);img.removeEventListener('error',done);resolve();};
    img.addEventListener('load',done,{once:true});
    img.addEventListener('error',done,{once:true});
    setTimeout(done,950);
  });
}

function waitForAboveFoldImages(){
  var jobs=[];
  var limit=window.innerHeight*1.25;
  var banner=document.querySelector('.bannerShop .imgBannerShop');
  if(banner)jobs.push(waitForImage(banner));

  document.querySelectorAll('.listadoShop .productoShop .imgShop').forEach(function(box){
    var rect=box.getBoundingClientRect();
    if(rect.top>limit||rect.bottom<0)return;
    var img=box.querySelector('img');
    if(img)jobs.push(waitForImage(img));
    var bg=backgroundUrl(box);
    if(bg)jobs.push(preload(bg));
  });
  return Promise.all(jobs);
}

function freezeInitialViewportCards(){
  var vh=window.innerHeight;
  var cards=[];
  document.querySelectorAll('.listadoShop .productoShop').forEach(function(card){
    var rect=card.getBoundingClientRect();
    if(rect.top<vh&&rect.bottom>0){
      card.classList.add('sc-static-initial-card');
      cards.push(card);
      card.style.removeProperty('opacity');
      card.style.removeProperty('visibility');
      card.style.removeProperty('transform');
    }
  });

  if(window.gsap&&cards.length){
    window.gsap.killTweensOf(cards);
    window.gsap.set(cards,{autoAlpha:1,clearProps:'opacity,visibility,transform'});
  }
  window.__scStaticInitialCards=cards;
}

function finish(){
  if(finished)return;
  finished=true;
  var remaining=Math.max(0,MIN_VISIBLE_MS-(Date.now()-started));
  setTimeout(function(){
    /* Freeze what the user already sees before releasing the overlay. Any GSAP
       product tween started earlier is killed while it is still hidden below
       the skeleton, so above-fold cards can never visibly animate. */
    freezeInitialViewportCards();
    root.classList.add('sc-catalog-skeleton-leaving');
    root.classList.remove('sc-catalog-content-loading');

    setTimeout(function(){
      root.classList.remove('sc-catalog-skeleton','sc-catalog-skeleton-leaving','sc-skeleton-ready');
      clearDynamicSkeleton();
      var container=document.querySelector('.containerShop');
      if(container)container.removeAttribute('aria-busy');
    },EXIT_MS);
  },remaining);
}

ready(function(){
  var container=document.querySelector('.containerShop');
  if(container)container.setAttribute('aria-busy','true');

  var prepared=Promise.all([waitForLayout(),waitForFonts()])
    .then(nextPaint)
    .then(function(){buildDynamicSkeleton();return nextPaint();});

  Promise.race([
    prepared.then(waitForAboveFoldImages).then(nextPaint),
    new Promise(function(resolve){setTimeout(function(){
      if(!root.classList.contains('sc-skeleton-ready')){
        buildDynamicSkeleton();
      }
      resolve();
    },MAX_WAIT_MS);})
  ]).then(finish,finish);
});
})();
