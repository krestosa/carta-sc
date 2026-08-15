(function(){
'use strict';
var SC=window.SCOverride=window.SCOverride||{};
SC.utils=SC.utils||{};
SC.utils.text=function(node){return node?node.textContent.replace(/\s+/g,' ').trim():'';};
SC.utils.ready=function(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();};
SC.utils.each=function(list,fn){Array.prototype.forEach.call(list||[],fn);};
SC.utils.matches=function(node,selector){return !!(node&&node.nodeType===1&&node.matches&&node.matches(selector));};
SC.utils.visible=function(node){
  if(!node)return false;
  var rect=node.getBoundingClientRect();
  return rect.height>0&&(node.offsetParent!==null||node.getClientRects().length>0);
};
SC.utils.refreshMotion=function(delay){
  requestAnimationFrame(function(){
    if(SC.motion&&typeof SC.motion.refresh==='function'){
      SC.motion.refresh(delay==null?0:delay);
      return;
    }
    if(window.ScrollTrigger&&typeof window.ScrollTrigger.refresh==='function')window.ScrollTrigger.refresh();
  });
};
})();