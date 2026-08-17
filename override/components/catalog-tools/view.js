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

var ICONS={
  grid:[[3,3,8,4],[13,3,8,4],[3,10,8,4],[13,10,8,4],[3,17,8,4],[13,17,8,4]],
  list:[[3,3.25,3.5,3.5],[8.5,3.25,12.5,3.5],[3,10.25,3.5,3.5],[8.5,10.25,12.5,3.5],[3,17.25,3.5,3.5],[8.5,17.25,12.5,3.5]]
};

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
function cells(host){return host?Array.prototype.slice.call(host.querySelectorAll('[data-sc-view-cell]')):[];}
function writeGeometry(cell,geometry){
  cell.setAttribute('x',geometry[0]);
  cell.setAttribute('y',geometry[1]);
  cell.setAttribute('width',geometry[2]);
  cell.setAttribute('height',geometry[3]);
}
function setGeometry(host,target){
  var nodes=cells(host);
  if(!host||!target||nodes.length!==target.length)return;
  nodes.forEach(function(cell,index){writeGeometry(cell,target[index]);});
}
function clearViewIconMotion(host){
  var state=host&&host.__scViewIconMotion;
  if(!host)return;
  if(state){
    if(state.timeline)try{state.timeline.kill();}catch(_){}
    if(state.timer)window.clearTimeout(state.timer);
    if(state.timer2)window.clearTimeout(state.timer2);
  }
  if(motionDeps&&motionDeps.gsap){
    motionDeps.gsap.set(host,{clearProps:'transform,opacity,visibility'});
  }
  host.removeAttribute('data-sc-view-icon-animating');
  host.removeAttribute('data-sc-view-icon-fallback');
  host.removeAttribute('data-sc-view-icon-preview');
  host.__scViewIconMotion=null;
}
function finalizeViewIconMotion(host,state){
  if(!host||host.__scViewIconMotion!==state)return;
  if(motionDeps&&motionDeps.gsap)motionDeps.gsap.set(host,{clearProps:'transform,opacity,visibility'});
  host.removeAttribute('data-sc-view-icon-animating');
  host.removeAttribute('data-sc-view-icon-fallback');
  host.removeAttribute('data-sc-view-icon-preview');
  host.__scViewIconMotion=null;
}
function fallbackSwap(host,target){
  var state={timeline:null,timer:0,timer2:0};
  host.__scViewIconMotion=state;
  host.setAttribute('data-sc-view-icon-fallback','out');
  state.timer=window.setTimeout(function(){
    if(host.__scViewIconMotion!==state)return;
    setGeometry(host,target);
    host.setAttribute('data-sc-view-icon-fallback','in');
    state.timer2=window.setTimeout(function(){finalizeViewIconMotion(host,state);},260);
  },145);
}
function animateSwap(host,target){
  if(!host||!target)return;
  clearViewIconMotion(host);
  if(reducedMotion()){setGeometry(host,target);return;}

  var gsap=motionDeps&&motionDeps.gsap;
  if(!gsap){fallbackSwap(host,target);return;}

  var state={timeline:null,timer:0,timer2:0};
  host.__scViewIconMotion=state;
  host.setAttribute('data-sc-view-icon-animating','true');

  state.timeline=gsap.timeline({
    onComplete:function(){finalizeViewIconMotion(host,state);}
  });
  state.timeline
    .to(host,{
      autoAlpha:.16,
      scale:.84,
      rotation:-6,
      duration:.14,
      ease:'power2.in',
      transformOrigin:'50% 50%',
      force3D:false,
      onComplete:function(){if(host.__scViewIconMotion===state)setGeometry(host,target);}
    },0)
    .fromTo(host,{
      autoAlpha:.16,
      scale:.84,
      rotation:6
    },{
      autoAlpha:1,
      scale:1,
      rotation:0,
      duration:.26,
      ease:'power3.out',
      transformOrigin:'50% 50%',
      force3D:false
    },.14);
}
function hoverPreview(host){
  if(!host||reducedMotion())return;
  clearViewIconMotion(host);
  if(SC.motion&&typeof SC.motion.prepare==='function')SC.motion.prepare();

  var gsap=motionDeps&&motionDeps.gsap;
  if(!gsap){
    host.setAttribute('data-sc-view-icon-preview','true');
    var fallback={timeline:null,timer:window.setTimeout(function(){
      if(host.__scViewIconMotion!==fallback)return;
      host.removeAttribute('data-sc-view-icon-preview');
      host.__scViewIconMotion=null;
    },320),timer2:0};
    host.__scViewIconMotion=fallback;
    return;
  }

  var state={timeline:null,timer:0,timer2:0};
  host.__scViewIconMotion=state;
  host.setAttribute('data-sc-view-icon-animating','true');
  state.timeline=gsap.timeline({onComplete:function(){finalizeViewIconMotion(host,state);}});
  state.timeline
    .to(host,{scale:1.06,rotation:2,duration:.12,ease:'power2.out',transformOrigin:'50% 50%',force3D:false},0)
    .to(host,{scale:1,rotation:0,duration:.2,ease:'power2.inOut',transformOrigin:'50% 50%',force3D:false},.12);
}
function hoverRestore(host){
  var state=host&&host.__scViewIconMotion;
  if(!state)return;
  clearViewIconMotion(host);
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

  if(previous===key){
    if(!host.__scViewIconMotion)setGeometry(host,ICONS[key]);
    return;
  }

  if(animate!==false&&previous)animateSwap(host,ICONS[key]);
  else{
    clearViewIconMotion(host);
    setGeometry(host,ICONS[key]);
  }
  host.setAttribute('data-sc-icon-state',key);
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
  if(host)clearViewIconMotion(host);
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

  function prepareMotion(){if(SC.motion&&typeof SC.motion.prepare==='function')SC.motion.prepare();}
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
