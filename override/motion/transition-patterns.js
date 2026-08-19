(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors;
if(!SC||!C||SC.__transitionPatternsBooted)return;SC.__transitionPatternsBooted=true;

var LAYOUT=.50,FADE_TOTAL=.45,FADE_THRESHOLD=.35,SCALE=.92;
var MORPH='.title-shop1,.priceRow,.sc-product-flavors',FADE='.descrip',layoutState=null;

function reduced(){return!!(SC.motion&&SC.motion.reduced&&SC.motion.reduced());}
function list(value){if(!value)return[];if(value.nodeType===1)return[value];return[].slice.call(value).filter(Boolean);}
function valid(r){return!!(r&&r.width>.5&&r.height>.5&&isFinite(r.left)&&isFinite(r.top));}
function rect(node){return node&&node.getBoundingClientRect?node.getBoundingClientRect():null;}
function visibleNear(node){var r=rect(node);return valid(r)&&r.bottom>-120&&r.top<innerHeight+120;}
function clamp(value,min,max){return Math.min(max,Math.max(min,value));}
function lerp(a,b,p){return a+(b-a)*p;}
function fit(from,to){return{x:from.left-to.left,y:from.top-to.top,scaleX:from.width/to.width,scaleY:from.height/to.height};}
function restoreStyle(snapshot){if(!snapshot||!snapshot.node)return;var node=snapshot.node;if(snapshot.value)node.style.setProperty(snapshot.prop,snapshot.value,snapshot.priority);else node.style.removeProperty(snapshot.prop);}
function holdStyle(node,prop,value,priority){if(!node)return null;var snapshot={node:node,prop:prop,value:node.style.getPropertyValue(prop),priority:node.style.getPropertyPriority(prop)};node.style.setProperty(prop,value,priority||'');return snapshot;}
function capture(nodes){return list(nodes).map(function(node){return{node:node,rect:rect(node)};}).filter(function(item){return valid(item.rect);});}
function range(progress,start,end){if(progress<=start)return 0;if(progress>=end)return 1;return(progress-start)/(end-start);}

function cubicPoint(a,b,c,d,t){var mt=1-t;return mt*mt*mt*a+3*mt*mt*t*b+3*mt*t*t*c+t*t*t*d;}
function solveSegment(x,x0,x1,x2,x3,y0,y1,y2,y3){
  var lo=0,hi=1,t=.5,i;
  for(i=0;i<12;i++){t=(lo+hi)/2;if(cubicPoint(x0,x1,x2,x3,t)<x)lo=t;else hi=t;}
  return cubicPoint(y0,y1,y2,y3,(lo+hi)/2);
}
/* Curva enfatizada de dos segmentos usada por las transiciones de contenedor. */
function emphasized(p){
  p=clamp(p,0,1);
  if(p<=1/6)return solveSegment(p,0,.05,.133333,1/6,0,0,.06,.4);
  return solveSegment(p,1/6,.208333,.25,1,.4,.82,1,1);
}
function cubicEase(x1,y1,x2,y2){
  return function(p){
    p=clamp(p,0,1);var lo=0,hi=1,t=.5,i;
    for(i=0;i<12;i++){t=(lo+hi)/2;if(cubicPoint(0,x1,x2,1,t)<p)lo=t;else hi=t;}
    return cubicPoint(0,y1,y2,1,(lo+hi)/2);
  };
}
var emphasizedWeb=cubicEase(.3,0,0,1);
var emphasizedAccelerate=cubicEase(.3,0,.8,.15);
var emphasizedDecelerate=cubicEase(.05,.7,.1,1);

function nestedFit(fromChild,toChild,fromParent,toParent){
  if(!valid(fromChild)||!valid(toChild)||!valid(fromParent)||!valid(toParent))return null;
  var sx=fromParent.width/toParent.width,sy=fromParent.height/toParent.height;
  if(!isFinite(sx)||!isFinite(sy)||Math.abs(sx)<.001||Math.abs(sy)<.001)return null;
  var visualLeft=fromParent.left+(toChild.left-toParent.left)*sx;
  var visualTop=fromParent.top+(toChild.top-toParent.top)*sy;
  var visualWidth=toChild.width*sx,visualHeight=toChild.height*sy;
  return{x:(fromChild.left-visualLeft)/sx,y:(fromChild.top-visualTop)/sy,scaleX:visualWidth>.001?fromChild.width/visualWidth:1,scaleY:visualHeight>.001?fromChild.height/visualHeight:1};
}

function imageOverlay(image,sourceRect,zIndex){
  if(!image||!valid(sourceRect))return null;
  var stage=image.parentElement,stageStyle=stage?getComputedStyle(stage):null,imageStyle=getComputedStyle(image);
  var shell=document.createElement('span'),clone=image.cloneNode(false);
  clone.removeAttribute('id');clone.removeAttribute('class');clone.removeAttribute('style');clone.removeAttribute('srcset');clone.removeAttribute('sizes');
  clone.setAttribute('aria-hidden','true');clone.alt='';clone.src=image.currentSrc||image.src;
  shell.setAttribute('aria-hidden','true');
  shell.style.cssText='display:block;position:fixed;pointer-events:none;margin:0;padding:0;border:0;overflow:hidden;transform:none;transform-origin:0 0;will-change:transform;backface-visibility:hidden;z-index:'+(zIndex||80)+';';
  shell.style.left=sourceRect.left+'px';shell.style.top=sourceRect.top+'px';shell.style.width=sourceRect.width+'px';shell.style.height=sourceRect.height+'px';
  shell.style.borderRadius=stageStyle?stageStyle.borderRadius:'0px';
  clone.style.cssText='display:block;position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;border:0;max-width:none;max-height:none;transform:none;transform-origin:50% 50%;';
  clone.style.objectFit=imageStyle.objectFit||'contain';clone.style.objectPosition=imageStyle.objectPosition||'50% 50%';
  shell.appendChild(clone);document.body.appendChild(shell);return shell;
}
function moveOverlay(gsap,node,targetRect,duration,ease){
  if(!node||!valid(targetRect))return;
  var current=rect(node);if(!valid(current))return;
  gsap.killTweensOf(node);
  node.style.left=targetRect.left+'px';node.style.top=targetRect.top+'px';node.style.width=targetRect.width+'px';node.style.height=targetRect.height+'px';
  var inv=fit(current,targetRect);
  gsap.set(node,{x:inv.x,y:inv.y,scaleX:inv.scaleX,scaleY:inv.scaleY,transformOrigin:'0 0',willChange:'transform'});
  gsap.to(node,{x:0,y:0,scaleX:1,scaleY:1,duration:duration,ease:ease||emphasized,overwrite:'auto',force3D:true});
}
function removeOverlay(node){if(node&&node.parentNode)node.parentNode.removeChild(node);}

function killFade(nodes){
  nodes.forEach(function(node){
    var state=node.__scFadeThrough;if(state&&state.tween){try{state.tween.kill();}catch(_){}}
    node.__scFadeThrough=null;
    if(SC.motion&&SC.motion.runLoaded)SC.motion.runLoaded(function(deps){deps.gsap.set(node,{clearProps:'opacity,transform,willChange'});});
  });
}
function fadeThrough(targets,mutate,options){
  var nodes=list(targets),opts=options||{},duration=Number(opts.duration)||FADE_TOTAL,changed=false;
  function change(gsap){
    if(changed)return;changed=true;if(typeof mutate==='function')mutate();
    if(gsap)gsap.set(nodes,{opacity:0,scale:SCALE,transformOrigin:'50% 50%'});
  }
  if(!nodes.length||reduced()||!(SC.motion&&SC.motion.runLoaded)){if(typeof mutate==='function')mutate();if(opts.onComplete)opts.onComplete();return false;}
  var ran=SC.motion.runLoaded(function(deps){
    var gsap=deps.gsap,proxy={p:0},state={tween:null};
    killFade(nodes);gsap.set(nodes,{willChange:'opacity,transform'});
    nodes.forEach(function(node){node.__scFadeThrough=state;});
    state.tween=gsap.to(proxy,{p:1,duration:duration,ease:emphasized,overwrite:'auto',
      onUpdate:function(){
        var p=proxy.p;
        if(p<FADE_THRESHOLD){
          gsap.set(nodes,{opacity:1-p/FADE_THRESHOLD,scale:1});
        }else{
          change(gsap);var q=(p-FADE_THRESHOLD)/(1-FADE_THRESHOLD);
          gsap.set(nodes,{opacity:q,scale:lerp(SCALE,1,q)});
        }
      },
      onComplete:function(){
        if(!changed)change(gsap);
        nodes.forEach(function(node){if(node.__scFadeThrough===state)node.__scFadeThrough=null;});
        gsap.set(nodes,{clearProps:'opacity,transform,willChange'});
        if(opts.onComplete)opts.onComplete();
      }
    });
  });
  if(!ran){if(typeof mutate==='function')mutate();if(opts.onComplete)opts.onComplete();return false;}return true;
}

function finishLayout(){
  if(!layoutState)return;
  var state=layoutState;layoutState=null;
  if(state.timeline)try{state.timeline.kill();}catch(_){}
  state.records.forEach(function(record){
    var g=state.gsap;g.killTweensOf(record.card);g.set(record.card,{clearProps:'transform,willChange'});
    record.morphs.forEach(function(item){g.killTweensOf(item.node);g.set(item.node,{clearProps:'transform,willChange'});});
    record.fades.forEach(function(item){g.killTweensOf(item.node);g.set(item.node,{clearProps:'opacity,transform,willChange'});});
    if(record.overlay)g.killTweensOf(record.overlay);
    restoreStyle(record.contentVisibility);restoreStyle(record.imageVisibility);removeOverlay(record.overlay);
  });
}
function layoutSwap(mutate,options){
  var opts=options||{},changed=false;
  function change(){if(changed)return;changed=true;if(typeof mutate==='function')mutate();}
  finishLayout();
  if(reduced()||!(SC.motion&&SC.motion.runLoaded)){change();if(opts.onComplete)opts.onComplete();return false;}
  var ran=SC.motion.runLoaded(function(deps){
    var gsap=deps.gsap,cards=[].slice.call(document.querySelectorAll(S.productCards)).filter(visibleNear),records=[],anchor=null;
    cards.forEach(function(card){
      var from=rect(card);if(!valid(from))return;
      var image=card.querySelector('.imgShop>img'),imageRect=rect(image&&image.parentElement),overlay=image&&valid(imageRect)?imageOverlay(image,imageRect,80):null;
      var record={card:card,from:from,image:image,overlay:overlay,morphs:capture(card.querySelectorAll(MORPH)),fades:capture(card.querySelectorAll(FADE)),contentVisibility:holdStyle(card,'content-visibility','visible','important'),imageVisibility:null};
      if(image&&overlay)record.imageVisibility=holdStyle(image,'visibility','hidden','important');records.push(record);
    });
    if(!records.length){change();if(opts.onComplete)opts.onComplete();return;}
    anchor=records.find(function(record){return record.from.top>=0;})||records[0];
    change();
    if(anchor&&document.documentElement.contains(anchor.card)){var shifted=rect(anchor.card),dy=valid(shifted)?shifted.top-anchor.from.top:0;if(Math.abs(dy)>.5)window.scrollBy(0,dy);}
    var state={gsap:gsap,records:records,timeline:null};layoutState=state;
    var tl=gsap.timeline({onComplete:function(){if(layoutState!==state)return;state.timeline=null;finishLayout();if(opts.onComplete)opts.onComplete();}});state.timeline=tl;
    records.forEach(function(record){
      var to=rect(record.card);if(!valid(to))return;
      var inv=fit(record.from,to);gsap.set(record.card,{x:inv.x,y:inv.y,scaleX:inv.scaleX,scaleY:inv.scaleY,transformOrigin:'0 0',willChange:'transform'});
      tl.to(record.card,{x:0,y:0,scaleX:1,scaleY:1,duration:LAYOUT,ease:emphasized,overwrite:'auto',force3D:true},0);
      record.morphs.forEach(function(item){
        var target=rect(item.node),inner=nestedFit(item.rect,target,record.from,to);if(!inner)return;
        gsap.set(item.node,{x:inner.x,y:inner.y,scaleX:inner.scaleX,scaleY:inner.scaleY,transformOrigin:'0 0',willChange:'transform'});
        tl.to(item.node,{x:0,y:0,scaleX:1,scaleY:1,duration:LAYOUT,ease:emphasized,overwrite:'auto',force3D:true},0);
      });
      record.fades.forEach(function(item){
        if(!valid(rect(item.node)))return;
        gsap.set(item.node,{willChange:'opacity,transform'});
        var out=LAYOUT*FADE_THRESHOLD,inn=LAYOUT-out;
        tl.to(item.node,{opacity:0,duration:out,ease:emphasizedAccelerate,overwrite:'auto'},0)
          .set(item.node,{opacity:0,scale:SCALE,transformOrigin:'50% 50%'},out)
          .to(item.node,{opacity:1,scale:1,duration:inn,ease:emphasizedDecelerate,overwrite:'auto'},out);
      });
      if(record.overlay&&record.image){var stage=record.image.parentElement,targetImageRect=rect(stage);moveOverlay(gsap,record.overlay,targetImageRect,LAYOUT,emphasized);}
    });
  });
  if(!ran){change();if(opts.onComplete)opts.onComplete();return false;}return true;
}

SC.transitionPatterns={
  duration:{state:FADE_TOTAL,layout:LAYOUT,containerOpen:.50,containerClose:.40},
  fadeThreshold:FADE_THRESHOLD,
  easing:{emphasized:emphasized,webEmphasized:emphasizedWeb,accelerate:emphasizedAccelerate,decelerate:emphasizedDecelerate},
  range:range,lerp:lerp,clamp:clamp,
  fadeThrough:fadeThrough,layoutSwap:layoutSwap,finishLayout:finishLayout,
  rect:rect,validRect:valid,fitRect:fit,imageOverlay:imageOverlay,moveOverlay:moveOverlay,removeOverlay:removeOverlay,
  holdStyle:holdStyle,restoreStyle:restoreStyle
};
})();