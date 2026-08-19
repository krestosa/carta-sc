(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors;
if(!SC||!C||SC.__transitionPatternsBooted)return;SC.__transitionPatternsBooted=true;

var TOTAL=.30,OUT_RATIO=.30,OUT=TOTAL*OUT_RATIO,IN=TOTAL-OUT,SCALE=.92,CONTENT='.title-shop1,.priceRow,.descrip,.sc-product-flavors',layoutState=null;

function reduced(){return!!(SC.motion&&SC.motion.reduced&&SC.motion.reduced());}
function list(value){if(!value)return[];if(value.nodeType===1)return[value];return[].slice.call(value).filter(Boolean);}
function valid(rect){return!!(rect&&rect.width>.5&&rect.height>.5&&isFinite(rect.left)&&isFinite(rect.top));}
function rect(node){return node&&node.getBoundingClientRect?node.getBoundingClientRect():null;}
function visibleNear(node){var r=rect(node);return valid(r)&&r.bottom>-120&&r.top<innerHeight+120;}
function fit(from,to){return{x:from.left-to.left,y:from.top-to.top,scaleX:from.width/to.width,scaleY:from.height/to.height};}
function curve(name,fallback){return SC.motion&&SC.motion.curve?SC.motion.curve(name):fallback;}
function restoreStyle(snapshot){if(!snapshot||!snapshot.node)return;var node=snapshot.node;if(snapshot.value)node.style.setProperty(snapshot.prop,snapshot.value,snapshot.priority);else node.style.removeProperty(snapshot.prop);}
function holdStyle(node,prop,value,priority){if(!node)return null;var snapshot={node:node,prop:prop,value:node.style.getPropertyValue(prop),priority:node.style.getPropertyPriority(prop)};node.style.setProperty(prop,value,priority||'');return snapshot;}

function imageOverlay(image,sourceRect,zIndex){
  if(!image||!valid(sourceRect))return null;
  var clone=image.cloneNode(false),style=getComputedStyle(image);
  clone.removeAttribute('id');clone.removeAttribute('class');clone.removeAttribute('style');clone.removeAttribute('srcset');clone.removeAttribute('sizes');clone.setAttribute('aria-hidden','true');clone.alt='';
  clone.src=image.currentSrc||image.src;
  clone.style.cssText='display:block;position:fixed;pointer-events:none;margin:0;padding:0;border:0;max-width:none;max-height:none;transform:none;transform-origin:0 0;will-change:left,top,width,height;z-index:'+(zIndex||80)+';';
  clone.style.left=sourceRect.left+'px';clone.style.top=sourceRect.top+'px';clone.style.width=sourceRect.width+'px';clone.style.height=sourceRect.height+'px';
  clone.style.objectFit=style.objectFit||'contain';clone.style.objectPosition=style.objectPosition||'50% 50%';
  document.body.appendChild(clone);return clone;
}
function moveOverlay(gsap,node,targetRect,duration,ease){
  if(!node||!valid(targetRect))return;
  gsap.to(node,{left:targetRect.left,top:targetRect.top,width:targetRect.width,height:targetRect.height,duration:duration,ease:ease,overwrite:'auto'});
}
function removeOverlay(node){if(node&&node.parentNode)node.parentNode.removeChild(node);}

function killFade(nodes){
  nodes.forEach(function(node){var tl=node.__scFadeThrough;if(tl){try{tl.kill();}catch(_){}node.__scFadeThrough=null;}if(SC.motion&&SC.motion.runLoaded)SC.motion.runLoaded(function(deps){deps.gsap.set(node,{clearProps:'opacity,transform,willChange'});});});
}
function fadeThrough(targets,mutate,options){
  var nodes=list(targets),opts=options||{},duration=Number(opts.duration)||TOTAL,out=duration*OUT_RATIO,inTime=duration-out,changed=false;
  function change(){if(changed)return;changed=true;if(typeof mutate==='function')mutate();}
  if(!nodes.length||reduced()||!(SC.motion&&SC.motion.runLoaded)){change();if(opts.onComplete)opts.onComplete();return false;}
  var ran=SC.motion.runLoaded(function(deps){
    var gsap=deps.gsap,accelerate=curve('accelerate','power2.in'),decelerate=curve('decelerate','power2.out'),tl;
    killFade(nodes);gsap.set(nodes,{willChange:'opacity,transform'});
    tl=gsap.timeline({onComplete:function(){nodes.forEach(function(node){if(node.__scFadeThrough===tl)node.__scFadeThrough=null;});gsap.set(nodes,{clearProps:'opacity,transform,willChange'});if(opts.onComplete)opts.onComplete();}});
    nodes.forEach(function(node){node.__scFadeThrough=tl;});
    tl.to(nodes,{opacity:0,duration:out,ease:accelerate,overwrite:'auto'},0)
      .call(change,null,out)
      .set(nodes,{opacity:0,scale:SCALE,transformOrigin:'50% 50%'},out)
      .to(nodes,{opacity:1,scale:1,duration:inTime,ease:decelerate,overwrite:'auto'},out);
  });
  if(!ran){change();if(opts.onComplete)opts.onComplete();return false;}return true;
}

function finishLayout(){
  if(!layoutState)return;
  var state=layoutState;layoutState=null;
  if(state.timeline)try{state.timeline.kill();}catch(_){}
  state.records.forEach(function(record){
    var g=state.gsap;g.killTweensOf(record.card);g.set(record.card,{clearProps:'transform,willChange'});
    if(record.contents.length){g.killTweensOf(record.contents);g.set(record.contents,{clearProps:'opacity,willChange'});}
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
      var contents=[].slice.call(card.querySelectorAll(CONTENT));
      var record={card:card,from:from,image:image,imageFrom:imageRect,overlay:overlay,contents:contents,contentVisibility:holdStyle(card,'content-visibility','visible','important'),imageVisibility:null};
      if(image&&overlay)record.imageVisibility=holdStyle(image,'visibility','hidden','important');
      records.push(record);
    });
    if(!records.length){change();if(opts.onComplete)opts.onComplete();return;}
    anchor=records.find(function(record){return record.from.top>=0;})||records[0];
    change();
    if(anchor&&document.documentElement.contains(anchor.card)){
      var shifted=rect(anchor.card),dy=valid(shifted)?shifted.top-anchor.from.top:0;
      if(Math.abs(dy)>.5)window.scrollBy(0,dy);
    }
    var standard=curve('standard','power2.out'),accelerate=curve('accelerate','power2.in'),decelerate=curve('decelerate','power2.out');
    var state={gsap:gsap,records:records,timeline:null};layoutState=state;
    var tl=gsap.timeline({onComplete:function(){if(layoutState!==state)return;state.timeline=null;finishLayout();if(opts.onComplete)opts.onComplete();}});state.timeline=tl;
    records.forEach(function(record){
      var to=rect(record.card);if(!valid(to))return;
      var inv=fit(record.from,to);gsap.set(record.card,{x:inv.x,y:inv.y,scaleX:inv.scaleX,scaleY:inv.scaleY,transformOrigin:'0 0',willChange:'transform'});
      tl.to(record.card,{x:0,y:0,scaleX:1,scaleY:1,duration:TOTAL,ease:standard,overwrite:'auto',force3D:true},0);
      if(record.contents.length){
        gsap.set(record.contents,{willChange:'opacity'});
        tl.to(record.contents,{opacity:0,duration:OUT,ease:accelerate,overwrite:'auto'},0)
          .to(record.contents,{opacity:1,duration:IN,ease:decelerate,overwrite:'auto'},OUT);
      }
      if(record.overlay&&record.image){
        var stage=record.image.parentElement,targetImageRect=rect(stage);moveOverlay(gsap,record.overlay,targetImageRect,TOTAL,standard);
      }
    });
  });
  if(!ran){change();if(opts.onComplete)opts.onComplete();return false;}return true;
}

SC.transitionPatterns={
  duration:{state:TOTAL,layout:TOTAL,containerOpen:.30,containerClose:.25},
  outRatio:OUT_RATIO,
  fadeThrough:fadeThrough,
  layoutSwap:layoutSwap,
  finishLayout:finishLayout,
  rect:rect,
  validRect:valid,
  fitRect:fit,
  imageOverlay:imageOverlay,
  moveOverlay:moveOverlay,
  removeOverlay:removeOverlay,
  holdStyle:holdStyle,
  restoreStyle:restoreStyle
};
})();