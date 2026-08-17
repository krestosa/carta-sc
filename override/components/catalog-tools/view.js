(function(){
'use strict';

var SC=window.SCOverride,CFG=SC&&SC.config,C=SC&&SC.catalogTools;
if(!SC||!CFG||SC.__catalogToolsViewBooted)return;
SC.__catalogToolsViewBooted=true;

var MODES=['compact','list'],
    STORE_KEY='scCatalogView:v3',
    doc=document.documentElement,
    phone=CFG.queries.phone,
    tablet=CFG.queries.compactWide,
    raf=0,
    settleTimer=0,
    cleanup=null,
    motionDeps=null;

function context(){return phone.matches?'phone':tablet.matches?'tablet':'desktop';}
function normalize(mode){if(mode==='normal')return'compact';return MODES.indexOf(mode)>=0?mode:'';}
function selectedMode(){return normalize(doc.getAttribute('data-sc-catalog-view')||'')||'compact';}
function legacyMode(mode){return mode==='list'?'list':mode?'compact':'';}
function columns(){var ctx=context();return ctx==='phone'?2:ctx==='tablet'?3:4;}
function effectiveMode(mode){return document.body.classList.contains(CFG.classes.catalogSearching)?'list':normalize(mode)||'compact';}
function label(mode){
  var effective=effectiveMode(mode),count;
  if(effective==='list')return'Vista lista. Cambiar a grilla de alta densidad';
  count=columns();
  return'Vista grilla de alta densidad: '+count+' '+(count===1?'columna':'columnas')+'. Cambiar a vista lista';
}
function iconKey(mode){return effectiveMode(mode)==='list'?'list':'grid';}
function load(){
  var mode=normalize(doc.getAttribute('data-sc-catalog-view')||''),ctx=context(),legacy='';
  if(mode)return mode;
  try{
    mode=normalize(localStorage.getItem(STORE_KEY)||'');
    if(!mode){
      legacy=localStorage.getItem('scCatalogView:v2:'+ctx)||localStorage.getItem(ctx==='desktop'?'scCatalogView:desktop':'scCatalogView:mobile')||'';
      mode=legacyMode(legacy);
      if(mode){try{localStorage.setItem(STORE_KEY,mode);}catch(_){}}
    }
  }catch(_){mode='';}
  return mode||'compact';
}
function save(mode){try{localStorage.setItem(STORE_KEY,mode);}catch(_){} }
function reducedMotion(){return!!(CFG.queries&&CFG.queries.reducedMotion&&CFG.queries.reducedMotion.matches);}
function prepareMotion(){if(SC.motion&&typeof SC.motion.prepare==='function')SC.motion.prepare();}

function iconLayers(host){
  if(!host)return null;
  var grid=host.querySelector('[data-sc-view-layer="grid"]'),
      list=host.querySelector('[data-sc-view-layer="list"]');
  return grid&&list?{grid:grid,list:list}:null;
}
function clearLayerStyles(gsap,layers){
  if(!gsap||!layers)return;
  gsap.set([layers.grid,layers.list],{clearProps:'transform,opacity,visibility'});
}
function clearViewIconMotion(host,clearInline){
  var state=host&&host.__scViewIconMotion,
      layers=iconLayers(host),
      gsap=motionDeps&&motionDeps.gsap;
  if(!host)return;
  if(state&&state.timeline)try{state.timeline.kill();}catch(_){}
  if(state&&state.timer)window.clearTimeout(state.timer);
  host.__scViewIconMotion=null;
  host.removeAttribute('data-sc-view-icon-animating');
  host.removeAttribute('data-sc-view-icon-preview');
  if(clearInline&&gsap)clearLayerStyles(gsap,layers);
}
function finalizeViewIconMotion(host,state){
  if(!host||host.__scViewIconMotion!==state)return;
  var gsap=motionDeps&&motionDeps.gsap,layers=iconLayers(host);
  if(gsap)clearLayerStyles(gsap,layers);
  host.__scViewIconMotion=null;
  host.removeAttribute('data-sc-view-icon-animating');
  host.removeAttribute('data-sc-view-icon-preview');
}
function animateSwap(host,from,to){
  var layers=iconLayers(host);
  if(!host||!layers||from===to){
    if(host)host.setAttribute('data-sc-icon-state',to);
    return;
  }

  clearViewIconMotion(host,true);
  host.setAttribute('data-sc-icon-state',to);

  if(reducedMotion())return;

  var gsap=motionDeps&&motionDeps.gsap,
      outgoing=layers[from],
      incoming=layers[to];

  if(!gsap){
    host.setAttribute('data-sc-view-icon-fallback',from+'-'+to);
    window.setTimeout(function(){
      if(host.getAttribute('data-sc-view-icon-fallback')===from+'-'+to){
        host.removeAttribute('data-sc-view-icon-fallback');
      }
    },360);
    return;
  }

  var direction=to==='list'?1:-1,
      state={timeline:null,timer:0};
  host.__scViewIconMotion=state;
  host.setAttribute('data-sc-view-icon-animating','true');

  gsap.set(outgoing,{autoAlpha:1,scale:1,rotation:0,x:0,y:0,transformOrigin:'50% 50%',force3D:false});
  gsap.set(incoming,{autoAlpha:0,scale:.82,rotation:7*direction,x:2*direction,y:0,transformOrigin:'50% 50%',force3D:false});

  state.timeline=gsap.timeline({onComplete:function(){finalizeViewIconMotion(host,state);}});
  state.timeline
    .to(outgoing,{
      autoAlpha:0,
      scale:.82,
      rotation:-7*direction,
      x:-2*direction,
      duration:.18,
      ease:'power2.in',
      transformOrigin:'50% 50%',
      force3D:false
    },0)
    .to(incoming,{
      autoAlpha:1,
      scale:1,
      rotation:0,
      x:0,
      duration:.28,
      ease:'power3.out',
      transformOrigin:'50% 50%',
      force3D:false
    },.08);
}
function hoverPreview(host){
  if(!host||reducedMotion())return;
  prepareMotion();
  clearViewIconMotion(host,true);

  var layers=iconLayers(host),
      key=host.getAttribute('data-sc-icon-state')||'grid',
      active=layers&&layers[key],
      gsap=motionDeps&&motionDeps.gsap;
  if(!active)return;

  if(!gsap){
    host.setAttribute('data-sc-view-icon-preview','true');
    return;
  }

  var state={timeline:null,timer:0};
  host.__scViewIconMotion=state;
  host.setAttribute('data-sc-view-icon-animating','true');
  state.timeline=gsap.timeline({onComplete:function(){finalizeViewIconMotion(host,state);}});
  state.timeline
    .to(active,{scale:1.055,rotation:key==='grid'?2:-2,duration:.12,ease:'power2.out',transformOrigin:'50% 50%',force3D:false},0)
    .to(active,{scale:1,rotation:0,duration:.2,ease:'power2.inOut',transformOrigin:'50% 50%',force3D:false},.12);
}
function hoverRestore(host){
  if(!host)return;
  host.removeAttribute('data-sc-view-icon-preview');
  clearViewIconMotion(host,true);
}
function sync(root,mode,animate){
  var button=root&&root.querySelector('.sc-catalog-view-toggle'),
      host=button&&button.querySelector('[data-sc-view-icon]'),
      key=iconKey(mode),
      text=label(mode),
      previous=host&&host.getAttribute('data-sc-icon-state');

  if(button){
    button.setAttribute('aria-label',text);
    button.setAttribute('title',text);
  }
  if(!host)return;

  if(previous===key)return;
  if(animate!==false&&previous)animateSwap(host,previous,key);
  else{
    clearViewIconMotion(host,true);
    host.setAttribute('data-sc-icon-state',key);
  }
}

function viewportAnchor(){
  var nodes=document.querySelectorAll('.listadoShop .titleShopSeccion,.listadoShop .subTitleShopSeccion,.listadoShop .productoShop'),
      height=window.innerHeight||doc.clientHeight||0,
      probe=Math.min(Math.max(height*.28,110),240),
      best=null,
      bestDistance=Infinity;
  for(var i=0;i<nodes.length;i++){
    var node=nodes[i],rect=node.getBoundingClientRect();
    if(rect.bottom<=0||rect.top>=height)continue;
    var distance=rect.top<=probe&&rect.bottom>=probe?0:Math.abs(rect.top-probe);
    if(distance<bestDistance){
      best=node;
      bestDistance=distance;
      if(distance===0&&node.matches('.titleShopSeccion,.subTitleShopSeccion'))break;
    }
  }
  return best;
}
function captureViewport(){
  var x=window.scrollX||window.pageXOffset||0,
      y=window.scrollY||window.pageYOffset||0,
      height=window.innerHeight||doc.clientHeight||0,
      tools=document.querySelector('.sc-catalog-tools'),
      toolsRect=tools&&tools.getBoundingClientRect();

  if(y<=1||(toolsRect&&toolsRect.bottom>0&&toolsRect.top<height)){
    return{x:x,y:y,anchor:null,anchorTop:null};
  }
  var anchor=viewportAnchor(),rect=anchor&&anchor.getBoundingClientRect();
  return{x:x,y:y,anchor:anchor,anchorTop:rect?rect.top:null};
}
function restoreViewport(viewport){
  if(!viewport)return;
  var currentX=window.scrollX||window.pageXOffset||0,
      currentY=window.scrollY||window.pageYOffset||0,
      anchor=viewport.anchor;

  if(anchor&&doc.contains(anchor)&&viewport.anchorTop!==null){
    var delta=anchor.getBoundingClientRect().top-viewport.anchorTop;
    if(Math.abs(delta)>.5)window.scrollBy(0,delta);
    currentX=window.scrollX||window.pageXOffset||0;
    if(Math.abs(currentX-viewport.x)>.5)window.scrollTo(viewport.x,window.scrollY||window.pageYOffset||0);
    return;
  }
  if(Math.abs(currentX-viewport.x)>.5||Math.abs(currentY-viewport.y)>.5){
    window.scrollTo(viewport.x,viewport.y);
  }
}
function refreshMotionNow(){
  if(SC.motion&&SC.motion.run){
    SC.motion.run(function(deps){if(deps&&deps.ScrollTrigger)deps.ScrollTrigger.refresh();});
  }
}
function syncMounted(){
  var root=document.querySelector('.sc-catalog-tools');
  if(root)sync(root,selectedMode(),false);
}
function refreshLayout(viewport){
  syncMounted();
  if(raf)cancelAnimationFrame(raf);
  if(settleTimer){clearTimeout(settleTimer);settleTimer=0;}
  restoreViewport(viewport);

  raf=requestAnimationFrame(function(){
    restoreViewport(viewport);
    raf=requestAnimationFrame(function(){
      raf=0;
      if(SC.productCardContent&&SC.productCardContent.scheduleDescriptionMeasure){
        SC.productCardContent.scheduleDescriptionMeasure();
      }
      refreshMotionNow();
      restoreViewport(viewport);
      if(viewport){
        settleTimer=window.setTimeout(function(){
          settleTimer=0;
          restoreViewport(viewport);
          doc.classList.remove('sc-catalog-view-switching');
        },80);
      }
    });
  });
}
function apply(root,mode,persist){
  mode=normalize(mode)||'compact';
  var viewport=persist?captureViewport():null;
  if(viewport)doc.classList.add('sc-catalog-view-switching');
  doc.setAttribute('data-sc-catalog-view',mode);
  document.body.setAttribute('data-sc-catalog-view',mode);
  root.setAttribute('data-sc-view',mode);
  sync(root,mode,persist);
  if(persist)save(mode);
  refreshLayout(viewport);
}
function destroy(){
  var host=document.querySelector('.sc-catalog-view-toggle [data-sc-view-icon]');
  if(host)clearViewIconMotion(host,true);
  if(raf){cancelAnimationFrame(raf);raf=0;}
  if(settleTimer){clearTimeout(settleTimer);settleTimer=0;}
  doc.classList.remove('sc-catalog-view-switching');
  if(cleanup){
    var fn=cleanup;
    cleanup=null;
    fn();
  }
}
function install(root){
  destroy();
  var button=root&&root.querySelector('.sc-catalog-view-toggle'),
      host=button&&button.querySelector('[data-sc-view-icon]');
  if(!button||!host)return function(){};

  apply(root,load(),false);

  function click(){
    prepareMotion();
    var current=selectedMode();
    apply(root,current==='compact'?'list':'compact',true);
  }
  function enter(event){
    if(event.pointerType==='touch')return;
    hoverPreview(host);
  }
  function leave(event){
    if(event.pointerType==='touch')return;
    hoverRestore(host);
  }
  function focus(){prepareMotion();}
  function breakpoint(){refreshLayout(null);}

  button.addEventListener('click',click);
  button.addEventListener('pointerenter',enter);
  button.addEventListener('pointerleave',leave);
  button.addEventListener('focus',focus);

  if(phone.addEventListener)phone.addEventListener('change',breakpoint);
  else phone.addListener(breakpoint);
  if(tablet.addEventListener)tablet.addEventListener('change',breakpoint);
  else tablet.addListener(breakpoint);

  cleanup=function(){
    button.removeEventListener('click',click);
    button.removeEventListener('pointerenter',enter);
    button.removeEventListener('pointerleave',leave);
    button.removeEventListener('focus',focus);
    if(phone.removeEventListener)phone.removeEventListener('change',breakpoint);
    else phone.removeListener(breakpoint);
    if(tablet.removeEventListener)tablet.removeEventListener('change',breakpoint);
    else tablet.removeListener(breakpoint);
  };

  var ownCleanup=cleanup;
  return function(){if(cleanup===ownCleanup)destroy();};
}

if(SC.motion&&typeof SC.motion.whenReady==='function'){
  SC.motion.whenReady(function(deps){motionDeps=deps;});
}

C.view={
  install:install,
  apply:apply,
  refreshLayout:refreshLayout,
  sync:syncMounted,
  destroy:destroy
};
})();
