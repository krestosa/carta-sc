(function(){
'use strict';
var SC=window.SCOverride,CFG=SC&&SC.config,C=SC&&SC.catalogTools;if(!SC||!CFG||!C||SC.__catalogThemePaletteBooted)return;SC.__catalogThemePaletteBooted=true;

/* Estado de la transición y animaciones activas. */
interface PaletteSnapshot{[key:string]:string;}
interface PaletteContext{from:PaletteSnapshot;to:PaletteSnapshot;duration:number;token:number;fade:boolean;}
type ActiveMotion={kill?:()=>void;cancel?:()=>void};
var doc=document.documentElement,deps:MotionDeps|null=null,overlay:HTMLElement|null=null,active:ActiveMotion[]=[],token=0;
function reduce():boolean{return!!(CFG.queries&&CFG.queries.reducedMotion&&CFG.queries.reducedMotion.matches);}
function capture():PaletteSnapshot{var s=getComputedStyle(doc);return{'--sc-color-ink':s.getPropertyValue('--sc-color-ink').trim(),'--sc-color-surface':s.getPropertyValue('--sc-color-surface').trim()};}

/* Crea una capa fija para ocultar el cambio de paleta. */
function ensureOverlay():HTMLElement|null{
  if(overlay&&document.documentElement.contains(overlay))return overlay;
  if(!document.body)return null;
  overlay=document.createElement('div');overlay.setAttribute('aria-hidden','true');overlay.className='sc-theme-fade-layer';
  var st=overlay.style;st.position='fixed';st.inset='0';st.zIndex='2147483646';st.pointerEvents='none';st.opacity='0';st.backgroundColor='transparent';st.transform='translateZ(0)';st.backfaceVisibility='hidden';st.contain='strict';
  document.body.appendChild(overlay);return overlay;
}

/* Cancela una transición anterior antes de iniciar otra. */
function stopActive():void{var list=active;active=[];list.forEach(function(a:ActiveMotion){try{if(a.kill)a.kill();else if(a.cancel)a.cancel();}catch(_error){}});}
function resetOverlay():void{if(!overlay)return;overlay.style.opacity='0';overlay.style.backgroundColor='transparent';overlay.style.removeProperty('will-change');}
function kill():void{token++;stopActive();resetOverlay();}

/* Usa WAAPI primero y GSAP como respaldo. */
function waapiFade(node:HTMLElement,from:number,to:number,ms:number,easing:string,done:()=>void,id:number):boolean{
  if(!node.animate)return false;
  var a=node.animate([{opacity:from},{opacity:to}],{duration:ms,easing:easing,fill:'forwards'});active.push(a);
  a.finished.then(function(){if(id!==token)return;node.style.opacity=String(to);done();},function(){});return true;
}
function gsapFade(node:HTMLElement,to:number,seconds:number,ease:string,done:()=>void,id:number):boolean{
  var g=deps&&deps.gsap;if(!g)return false;
  var a=g.to(node,{opacity:to,duration:seconds,ease:ease,overwrite:'auto',onComplete:function(){if(id!==token)return;done();}});active.push(a);return true;
}

/* Cubre, aplica el tema y revela la nueva paleta. */
function animate(_before:PaletteSnapshot,commit:()=>void,prepared?:((context:PaletteContext)=>void)):PaletteContext{
  var from=capture(),node=ensureOverlay();kill();var id=token,duration=reduce()?.18:.56,half=duration*.5,context={from:from,to:from,duration:duration,token:id,fade:true};
  if(!node){commit();return context;}
  var layer=node;
  layer.style.backgroundColor=from['--sc-color-surface']||'#000';layer.style.opacity='0';layer.style.willChange='opacity';
  if(typeof prepared==='function')prepared(context);
  function reveal():void{
    if(id!==token)return;requestAnimationFrame(function(){
      if(id!==token)return;
      if(waapiFade(layer,1,0,half*1000,'cubic-bezier(.37,0,.63,1)',finish,id))return;
      if(gsapFade(layer,0,half,'sine.inOut',finish,id))return;
      finish();
    });
  }
  function swap():void{if(id!==token)return;commit();reveal();}
  function finish():void{if(id!==token)return;stopActive();resetOverlay();}
  if(waapiFade(layer,0,1,half*1000,'cubic-bezier(.37,0,.63,1)',swap,id))return context;
  if(gsapFade(layer,1,half,'sine.inOut',swap,id))return context;
  commit();resetOverlay();return context;
}

/* Toma GSAP cuando termina de cargar motion. */
if(SC.motion&&SC.motion.whenLoaded)SC.motion.whenLoaded(function(d:MotionDeps){deps=d;});else if(SC.motion&&SC.motion.whenReady)SC.motion.whenReady(function(d:MotionDeps){deps=d;});
C.themePalette={animate:animate,kill:kill};
})();