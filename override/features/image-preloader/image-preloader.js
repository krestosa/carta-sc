(function(){
'use strict';
var SC=window.SCOverride=window.SCOverride||{};if(SC.__imagePreloaderBooted)return;SC.__imagePreloaderBooted=true;
var seen=new Set(),high=[],low=[],active=0,idleHandle=0,observer=null,started=false,MAX_ACTIVE=4,NEAR_VIEWPORT=1.5;
function absolute(url){if(!url)return'';try{var parsed=new URL(url,location.href);return /^(https?:)$/i.test(parsed.protocol)?parsed.href:'';}catch(_){return'';}}
function nearViewport(node){if(!node||!node.getBoundingClientRect)return false;var rect=node.getBoundingClientRect(),h=innerHeight||document.documentElement.clientHeight||0;return rect.bottom>=-h*.25&&rect.top<=h*NEAR_VIEWPORT;}
function queue(url,priority){url=absolute(url);if(!url||seen.has(url))return;seen.add(url);(priority?high:low).push(url);pump();}
function backgroundUrls(node,priority){if(!node)return;var value=node.style&&node.style.backgroundImage||'';if(!value||value==='none')return;var match,re=/url\((['"]?)(.*?)\1\)/g;while((match=re.exec(value)))queue(match[2],priority);}
function imageUrl(img){return img&&(img.currentSrc||img.getAttribute('src')||img.src)||'';}
function collectImage(img){if(!img)return;var priority=nearViewport(img);if(priority){try{img.loading='eager';img.fetchPriority='high';}catch(_){}}queue(imageUrl(img),priority);}
function scan(root){if(!root||root.nodeType!==1&&root.nodeType!==9)return;var imgs=[],stages=[];if(root.nodeType===1&&root.matches){if(root.matches('img[src],img[srcset]'))imgs.push(root);if(root.matches('.imgShop,.imgLiquidNoFillShop'))stages.push(root);}if(root.querySelectorAll){imgs=imgs.concat(Array.from(root.querySelectorAll('img[src],img[srcset]')));stages=stages.concat(Array.from(root.querySelectorAll('.imgShop,.imgLiquidNoFillShop')));}imgs.forEach(collectImage);stages.forEach(function(stage){backgroundUrls(stage,nearViewport(stage));});}
function finish(loader){active=Math.max(0,active-1);loader.onload=loader.onerror=null;pump();}
function load(url,priority){active++;var loader=new Image();try{loader.decoding='async';loader.fetchPriority=priority?'high':'low';}catch(_){}loader.onload=loader.onerror=function(){finish(loader);};loader.src=url;}
function drainLow(){idleHandle=0;while(active<MAX_ACTIVE&&!high.length&&low.length)load(low.shift(),false);}
function scheduleLow(){if(idleHandle||!low.length)return;if(window.requestIdleCallback)idleHandle=requestIdleCallback(drainLow,{timeout:700});else idleHandle=setTimeout(drainLow,80);}
function pump(){while(active<MAX_ACTIVE&&high.length)load(high.shift(),true);if(!high.length&&active<MAX_ACTIVE)scheduleLow();}
function observe(){if(observer||!window.MutationObserver||!document.body)return;observer=new MutationObserver(function(mutations){mutations.forEach(function(mutation){if(mutation.type==='attributes'){collectImage(mutation.target);return;}Array.prototype.forEach.call(mutation.addedNodes||[],function(node){if(node&&node.nodeType===1)scan(node);});});});observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src','srcset']});}
function start(){if(started)return;started=true;scan(document);observe();window.addEventListener('load',function(){scan(document);},{once:true});}
function destroy(){if(observer){observer.disconnect();observer=null;}if(idleHandle){if(window.cancelIdleCallback)cancelIdleCallback(idleHandle);else clearTimeout(idleHandle);idleHandle=0;}high.length=0;low.length=0;started=false;}
SC.imagePreloader={start:start,scan:scan,destroy:destroy};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
