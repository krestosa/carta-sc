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

/* The SVG keeps one canonical grid geometry. List mode is represented entirely
   by transforms, avoiding x/y/width/height writes during animation. */
var ICON_TRANSFORMS={
  grid:[
    [0,0,1,1],[0,0,1,1],
    [0,0,1,1],[0,0,1,1],
    [0,0,1,1],[0,0,1,1]
  ],
  list:[
    [0,.25,.4375,.875],[-4.5,.25,1.5625,.875],
    [0,.25,.4375,.875],[-4.5,.25,1.5625,.875],
    [0,.25,.4375,.875],[-4.5,.25,1.5625,.875]
  ]
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
function oppositeKey(key){return key==='list'?'grid':'list';}
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
function mix(a,b,t){return a+(b-a)*t;}
function mixTransforms(from,to,amount){
  return from.map(function(item,index){
    var target=to[index];
    return[
      mix(item[0],target[0],amount),
      mix(item[1],target[1],amount),
      mix(item[2],target[2],amount),
      mix(item[3],target[3],amount)
    ];
  });
}
function transformString(value){
  return'translate('+value[0]+'px,'+value[1]+'px) scale('+value[2]+','+value[3]+')';
}
function setTransformState(host,target,instant){
  var nodes=cells(host);
  if(!host||!target||nodes.length!==target.length)return;
  if(instant)host.setAttribute('data-sc-view-icon-static','true');
  nodes.forEach(function(cell,index){
    cell.style.transform=transformString(target[index]);
  });
  if(instant){
    host.getBoundingClientRect();
    host.removeAttribute('data-sc-view-icon-static');
  }
}
function clearViewIconMotion(host){
  var state=host&&host.__scViewIconMotion;
  if(!state)return;
  if(state.animation){try{state.animation.kill();}catch(_){} }
  if(state.timer)window.clearTimeout(state.timer);
  host.removeAttribute('data-sc-view-icon-animating');
  host.style.removeProperty('--sc-view-icon-duration');
  host.__scViewIconMotion=null;
}
function finalizeViewIconMotion(host,state){
  if(!host||host.__scViewIconMotion!==state)return;
  host.removeAttribute('data-sc-view-icon-animating');
  host.style.removeProperty('--sc-view-icon-duration');
  host.__scViewIconMotion=null;
}
function gsapVars(value){
  return{
    x:value[0],
    y:value[1],
    scaleX:value[2],
    scaleY:value[3],
    transformOrigin:'0% 0%',
    force3D:false
  };
}
function animateTransforms(host,target,duration,ease){
  var nodes=cells(host);
  if(!host||!target||nodes.length!==target.length)return;
  clearViewIconMotion(host);

  if(reducedMotion()){
    setTransformState(host,target,true);
    return;
  }

  var gsap=motionDeps&&motionDeps.gsap;
  if(!gsap){
    /* GSAP is loaded lazily. CSS handles the first transform-only transition
       without introducing a second per-frame JavaScript animation loop. */
    var fallback={animation:null,timer:0};
    host.__scViewIconMotion=fallback;
    host.style.setProperty('--sc-view-icon-duration',Math.round(duration*1000)+'ms');
    setTransformState(host,target,false);
    fallback.timer=window.setTimeout(function(){finalizeViewIconMotion(host,fallback);},Math.round(duration*1000)+40);
    return;
  }

  var state={animation:null,timer:0};
  host.__scViewIconMotion=state;
  host.setAttribute('data-sc-view-icon-animating','true');

  var timeline=gsap.timeline({
    defaults:{duration:duration,ease:ease||'power3.out',overwrite:'auto'},
    onComplete:function(){finalizeViewIconMotion(host,state);}
  });
  nodes.forEach(function(cell,index){
    timeline.to(cell,gsapVars(target[index]),0);
  });
  state.animation=timeline;
}
function setViewIcon(host,key){
  clearViewIconMotion(host);
  setTransformState(host,ICON_TRANSFORMS[key],true);
}
function animateViewIcon(host,key){
  animateTransforms(host,ICON_TRANSFORMS[key],.28,(CFG.motion&&CFG.motion.easings&&CFG.motion.easings.strongOut)||'power3.out');
}
function hoverPreview(host){
  if(!host||reducedMotion())return;
  var gsap=motionDeps&&motionDeps.gsap,nodes=cells(host);
  if(!nodes.length)return;

  clearViewIconMotion(host);

  var key=iconKey(selectedMode()),
      base=ICON_TRANSFORMS[key],
      preview=mixTransforms(base,ICON_TRANSFORMS[oppositeKey(key)],.22),
      state={animation:null,timer:0};

  if(!gsap){
    host.__scViewIconMotion=state;
    host.style.setProperty('--sc-view-icon-duration','120ms');
    setTransformState(host,preview,false);
    state.timer=window.setTimeout(function(){
      if(host.__scViewIconMotion!==state)return;
      host.__scViewIconMotion=null;
      host.style.removeProperty('--sc-view-icon-duration');
      animateTransforms(host,base,.18,'power2.inOut');
    },120);
    return;
  }

  host.__scViewIconMotion=state;
  host.setAttribute('data-sc-view-icon-animating','true');

  var timeline=gsap.timeline({
    onComplete:function(){finalizeViewIconMotion(host,state);}
  });
  nodes.forEach(function(cell,index){
    timeline.to(cell,Object.assign(gsapVars(preview[index]),{duration:.12,ease:'power2.out',overwrite:'auto'}),0);
  });
  nodes.forEach(function(cell,index){
    timeline.to(cell,Object.assign(gsapVars(base[index]),{duration:.18,ease:'power2.inOut',overwrite:'auto'}),.12);
  });
  state.animation=timeline;
}
function hoverRestore(host){
  animateTransforms(host,ICON_TRANSFORMS[iconKey(selectedMode())],.16,'power2.out');
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
    if(!host.__scViewIconMotion)setTransformState(host,ICON_TRANSFORMS[key],true);
    return;
  }

  if(animate!==false&&previous)animateViewIcon(host,key);
  else setViewIcon(host,key);

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
    SC.motion.run(function(deps){
      if(deps&&deps.ScrollTrigger)deps.ScrollTrigger.refresh();
    });
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

  function click(){
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
  function breakpoint(){refreshLayout(null);}

  button.addEventListener('click',click);
  button.addEventListener('pointerenter',enter);
  button.addEventListener('pointerleave',leave);

  if(phone.addEventListener)phone.addEventListener('change',breakpoint);
  else phone.addListener(breakpoint);
  if(tablet.addEventListener)tablet.addEventListener('change',breakpoint);
  else tablet.addListener(breakpoint);

  cleanup=function(){
    button.removeEventListener('click',click);
    button.removeEventListener('pointerenter',enter);
    button.removeEventListener('pointerleave',leave);
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
