(function(){
'use strict';
var SC=window.SCOverride=window.SCOverride||{};
SC.utils=SC.utils||{};

/* Normaliza texto visible para comparaciones. */
SC.utils.text=function(node:Node|null|undefined):string{return node?(node.textContent||'').replace(/\s+/g,' ').trim():'';};

/* Ejecuta al quedar listo el DOM. */
SC.utils.ready=function(fn:()=>void):void{document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();};
SC.utils.each=function<T>(list:ArrayLike<T>|null|undefined,fn:(value:T,index:number)=>void):void{Array.prototype.forEach.call(list||[],fn);};
SC.utils.matches=function(node:Element|null|undefined,selector:string):boolean{return !!(node&&node.nodeType===1&&node.matches&&node.matches(selector));};

/* Comprueba visibilidad geométrica real. */
SC.utils.visible=function(node:HTMLElement|null|undefined):boolean{
  if(!node)return false;
  var rect=node.getBoundingClientRect();
  return rect.height>0&&(node.offsetParent!==null||node.getClientRects().length>0);
};

/* Recalcula motion después del próximo frame. */
SC.utils.refreshMotion=function(delay:number|null|undefined):void{
  requestAnimationFrame(function(){
    if(SC.motion&&typeof SC.motion.refresh==='function')SC.motion.refresh(delay==null?0:delay);
  });
};
})();
