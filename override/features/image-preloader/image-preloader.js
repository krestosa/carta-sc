(function(){
'use strict';
var SC=window.SCOverride=window.SCOverride||{};if(SC.__imagePreloaderBooted)return;SC.__imagePreloaderBooted=true;
if(document.documentElement)document.documentElement.classList.add('sc-image-preloader-active');
var seen=new Set(),settled=new Set(),waiters=new Map(),high=[],low=[],active=0,idleHandle=0,observer=null,started=false,MAX_ACTIVE=4,NEAR_VIEWPORT=1.5,STAGE='.imgShop,.imgLiquidNoFillShop';
function absolute(url){if(!url)return'';try{var parsed=new URL(url,location.href);return /^(https?:)$/i.test(parsed.protocol)?parsed.href:'';}catch(_){return'';}}
function nearViewport(node){if(!node||!node.getBoundingClientRect)return false;var rect=node.getBoundingClientRect(),h=innerHeight||document.documentElement.clientHeight||0;return rect.bottom>=-h*.25&&rect.top<=h*NEAR_VIEWPORT;}
function markLoading(stage){if(!stage)return;stage.classList.remove('sc-image-ready');stage.classList.add('sc-image-loading');}
function markReady(stage){if(!stage)return;stage.classList.remove('sc-image-loading');stage.classList.add('sc-image-ready');}
function bindBackground(url,stage){if(!stage)return;if(settled.has(url)){markReady(stage);return;}markLoading(stage);var nodes=waiters.get(url);if(!nodes){nodes=new Set();waiters.set(url,nodes);}nodes.add(stage);}
function settle(url){url=absolute(url);if(!url)return;settled.add(url);var nodes=waiters.get(url);if(nodes){nodes.forEach(markReady);waiters.delete(url);}}
function queue(url,priority,backgroundStage){url=absolute(url);if(!url){if(backgroundStage)markReady(backgroundStage);return;}if(backgroundStage)bindBackground(url,backgroundStage);if(settled.has(url)||seen.has(url))return;seen.add(url);(priority?high:low).push(url);pump();}
function imageUrl(img){return img&&(img.currentSrc||img.getAttribute('src')||img.src)||'';}
function stageFor(img){return img&&img.closest?img.closest(STAGE):null;}
function revealDecoded(img,stage){var url=imageUrl(img);if(url)settle(url);if(!stage)return;if(img&&typeof img.decode==='function'&&img.naturalWidth){img.decode().catch(function(){}).then(function(){markReady(stage);});}else markReady(stage);}
function bindNativeImage(img,stage){if(!img||!stage)return;markLoading(stage);if(!img.__scImagePreloaderBound){img.__scImagePreloaderBound=true;img.addEventListener('load',function(){revealDecoded(img,stage);});img.addEventListener('error',function(){var url=imageUrl(img);if(url)settle(url);markReady(stage);});}}
function collectImage(img,stage){if(!img)return;stage=stage||stageFor(img);var priority=nearViewport(stage||img),url=imageUrl(img);if(priority){try{img.loading='eager';img.fetchPriority='high';}catch(_){}}if(stage){bindNativeImage(img,stage);if(img.complete){if(img.naturalWidth)revealDecoded(img,stage);else markReady(stage);}}queue(url,priority,null);}
function backgroundUrls(stage){var value=stage&&stage.style&&stage.style.backgroundImage||'',urls=[],match,re=/url\((['"]?)(.*?)\1\)/g;while((match=re.exec(value)))urls.push(match[2]);return urls;}
function collectStage(stage){if(!stage)return;var img=stage.querySelector('img[src],img[srcset]');if(img){collectImage(img,stage);return;}var urls=backgroundUrls(stage),priority=nearViewport(stage);if(!urls.length){markReady(stage);return;}markLoading(stage);urls.forEach(function(url){queue(url,priority,stage);});}
function scan(root){if(!root||root.nodeType!==1&&root.nodeType!==9)return;var stages=new Set(),imgs=new Set();if(root.nodeType===1&&root.matches){if(root.matches(STAGE))stages.add(root);if(root.matches('img[src],img[srcset]'))imgs.add(root);}if(root.querySelectorAll){Array.prototype.forEach.call(root.querySelectorAll(STAGE),function(node){stages.add(node);});Array.prototype.forEach.call(root.querySelectorAll('img[src],img[srcset]'),function(node){imgs.add(node);});}stages.forEach(collectStage);imgs.forEach(function(img){if(!stageFor(img))collectImage(img,null);});}
function finish(loader,url){settle(url);active=Math.max(0,active-1);loader.onload=loader.onerror=null;pump();}
function load(url,priority){active++;var loader=new Image();try{loader.decoding='async';loader.fetchPriority=priority?'high':'low';}catch(_){}loader.onload=loader.onerror=function(){finish(loader,url);};loader.src=url;}
function drainLow(){idleHandle=0;while(active<MAX_ACTIVE&&!high.length&&low.length)load(low.shift(),false);}
function scheduleLow(){if(idleHandle||!low.length)return;if(window.requestIdleCallback)idleHandle=requestIdleCallback(drainLow,{timeout:700});else idleHandle=setTimeout(drainLow,80);}
function pump(){while(active<MAX_ACTIVE&&high.length)load(high.shift(),true);if(!high.length&&active<MAX_ACTIVE)scheduleLow();}
function observe(){if(observer||!window.MutationObserver||!document.body)return;observer=new MutationObserver(function(mutations){mutations.forEach(function(mutation){if(mutation.type==='attributes'){var target=mutation.target;if(target.matches&&target.matches(STAGE))collectStage(target);else if(target.matches&&target.matches('img'))collectImage(target);return;}Array.prototype.forEach.call(mutation.addedNodes||[],function(node){if(node&&node.nodeType===1)scan(node);});});});observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src','srcset','style']});}
function start(){if(started)return;started=true;scan(document);observe();window.addEventListener('load',function(){scan(document);},{once:true});}
function destroy(){if(observer){observer.disconnect();observer=null;}if(idleHandle){if(window.cancelIdleCallback)cancelIdleCallback(idleHandle);else clearTimeout(idleHandle);idleHandle=0;}high.length=0;low.length=0;waiters.clear();document.documentElement.classList.remove('sc-image-preloader-active');started=false;}
SC.imagePreloader={start:start,scan:scan,destroy:destroy};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
