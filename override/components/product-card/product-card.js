(function(){
'use strict';
var SC=window.SCOverride,utils=SC&&SC.utils,config=SC&&SC.config;
if(!SC||!utils||!config||SC.__productCardBooted)return;SC.__productCardBooted=true;
var each=utils.each,ready=utils.ready,text=utils.text,desktopQuery=config.desktopQuery;
var cardSequence=0,descriptionRaf=0;

function imageSource(card){
  var img=card.querySelector('.imgShop img, .imgLiquidNoFillShop img');
  if(img&&img.getAttribute('src'))return img.getAttribute('src');
  var box=card.querySelector('.imgShop, .imgLiquidNoFillShop');if(!box)return'';
  var bg=box.style.backgroundImage||getComputedStyle(box).backgroundImage||'';
  var match=bg.match(/^url\(["']?(.*?)["']?\)$/);return match?match[1]:'';
}
function cleanPriceText(node){
  if(!node)return'';
  var clone=node.cloneNode(true);
  each(clone.querySelectorAll('input,.sumar,button'),function(el){if(el.parentNode)el.parentNode.removeChild(el);});
  return text(clone);
}
function ensureId(node,base){if(!node)return'';if(!node.id)node.id=base;return node.id;}
function traitLabels(source){
  var seen={},labels=[];
  var root=source&&source.matches&&source.matches('.productoShop')?source:source&&source.closest?source.closest('.productoShop'):null;
  var selector=root?'.title-shop1 .sabores img[data-original-title]':'img[data-original-title]';
  each((root||source)?(root||source).querySelectorAll(selector):[],function(img){
    var label=(img.getAttribute('data-original-title')||'').trim();
    if(label&&!seen[label]){seen[label]=true;labels.push(label);}
  });
  return labels;
}
function enhanceCardLink(link){
  var card=link.closest('.productoShop');if(!card)return;
  var hidden=card.querySelector('.producto-id');
  var key=hidden&&hidden.value?hidden.value:String(++cardSequence);key=String(key).replace(/[^a-zA-Z0-9_-]/g,'-');
  var title=card.querySelector('.title-shop1'),desc=card.querySelector('.descrip');
  var current=card.querySelector('.priceRow .priceHijass, .priceRow .price'),previous=card.querySelector('.priceRow .ofertaPrice');
  var titleId=ensureId(title,'sc-product-'+key+'-title'),descId=desc&&text(desc)?ensureId(desc,'sc-product-'+key+'-desc'):'';
  var currentText=cleanPriceText(current),previousText=cleanPriceText(previous),traits=traitLabels(card);
  if(current&&currentText)current.setAttribute('aria-label',(/^\$/.test(currentText)?'Precio actual: ':'Estado del producto: ')+currentText);
  if(previous&&previousText)previous.setAttribute('aria-label','Precio anterior: '+previousText);
  var meta=link.querySelector('.sc-card-a11y-meta');
  if(!meta){meta=document.createElement('span');meta.className='sc-card-a11y-meta sc-sr-only';link.appendChild(meta);}
  meta.id='sc-product-'+key+'-meta';
  var parts=[];
  if(currentText)parts.push((/^\$/.test(currentText)?'Precio actual ':'Estado ')+currentText);
  if(previousText)parts.push('Precio anterior '+previousText);
  if(traits.length)parts.push('Características: '+traits.join(', '));
  meta.textContent=parts.join('. ')+(parts.length?'.':'');
  link.removeAttribute('aria-label');if(titleId)link.setAttribute('aria-labelledby',titleId);
  var described=[];if(descId)described.push(descId);if(meta.textContent)described.push(meta.id);
  described.length?link.setAttribute('aria-describedby',described.join(' ')):link.removeAttribute('aria-describedby');
  link.setAttribute('aria-haspopup','dialog');
}
function enhanceProductLinks(){each(document.querySelectorAll('a.fancyboxModalAddProd'),enhanceCardLink);}
function buildTraitGroup(card,className){
  var labels=traitLabels(card);if(!labels.length)return null;
  var source=card.querySelector('.title-shop1 .sabores');if(!source)return null;
  var group=document.createElement('span');group.className=className||'sabores';
  group.setAttribute('role','img');group.setAttribute('aria-label','Características: '+labels.join(', '));
  each(source.querySelectorAll('img'),function(img){
    var clone=img.cloneNode(true);clone.setAttribute('alt','');clone.setAttribute('aria-hidden','true');
    clone.removeAttribute('data-toggle');clone.removeAttribute('title');group.appendChild(clone);
  });
  return group;
}

function clearFlavorRows(){
  each(document.querySelectorAll('.sc-product-flavors'),function(row){if(row.parentNode)row.parentNode.removeChild(row);});
}
function installFlavorRows(){
  clearFlavorRows();
  each(document.querySelectorAll('.productoShop > a.fancyboxModalAddProd'),function(link){
    var title=link.querySelector('.title-shop1'),source=title&&title.querySelector('.sabores');
    if(source)source.setAttribute('aria-hidden','true');
    var row=document.createElement('span');row.className='sc-product-flavors';
    var labels=traitLabels(source||link);
    if(source){
      each(source.children,function(node){
        var clone=node.cloneNode(true);
        if(clone.tagName==='IMG'){
          clone.setAttribute('alt','');clone.setAttribute('aria-hidden','true');
          clone.removeAttribute('data-toggle');clone.removeAttribute('title');
        }
        row.appendChild(clone);
      });
    }
    if(labels.length){row.setAttribute('role','img');row.setAttribute('aria-label','Características: '+labels.join(', '));}
    else row.setAttribute('aria-hidden','true');
    link.appendChild(row);
  });
}
function measureDescriptions(){
  descriptionRaf=0;
  each(document.querySelectorAll('.listadoShop .productoShop .descrip'),function(desc){
    desc.classList.remove('sc-description-truncated');
    if(desc.scrollHeight>desc.clientHeight+1||desc.scrollWidth>desc.clientWidth+1)desc.classList.add('sc-description-truncated');
  });
}
function scheduleDescriptionMeasure(){
  if(descriptionRaf)return;
  descriptionRaf=requestAnimationFrame(function(){requestAnimationFrame(measureDescriptions);});
}
function refreshCards(){
  enhanceProductLinks();installFlavorRows();scheduleDescriptionMeasure();
}
ready(function(){
  refreshCards();
  window.setTimeout(function(){enhanceProductLinks();scheduleDescriptionMeasure();},180);
  window.addEventListener('resize',scheduleDescriptionMeasure,{passive:true});
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(scheduleDescriptionMeasure).catch(function(){});
});
var breakpoint=function(){installFlavorRows();scheduleDescriptionMeasure();};
if(desktopQuery.addEventListener)desktopQuery.addEventListener('change',breakpoint);else desktopQuery.addListener(breakpoint);

function installCardMotion(){
  if(!SC.motion||typeof SC.motion.whenReady!=='function')return;
  SC.motion.whenReady(function(deps){
    var gsap=deps.gsap,ST=deps.ScrollTrigger;
    var mm=gsap.matchMedia();
    mm.add({
      mobile:'(max-width: 767px)',
      tablet:'(min-width: 768px) and (max-width: 992px)',
      desktop:'(min-width: 993px)',
      reduceMotion:'(prefers-reduced-motion: reduce)'
    },function(ctx){
      var tablet=!!ctx.conditions.tablet,desktop=!!ctx.conditions.desktop,reduce=!!ctx.conditions.reduceMotion;
      var profile=desktop?{batchMax:8,start:'clamp(top 91%)'}:tablet?{batchMax:6,start:'clamp(top 92%)'}:{batchMax:4,start:'clamp(top 93%)'};
      return setupProductReveal(gsap,ST,profile,reduce);
    });
    installImageParallax(gsap,ST);
  });
}
function setupProductReveal(gsap,ST,profile,reduce){
  var cards=gsap.utils.toArray('.listadoShop .productoShop'),triggers=[],timer=0,rafA=0,rafB=0;
  function noop(){}
  if(!cards.length)return noop;
  if(reduce){gsap.set(cards,{clearProps:'opacity,visibility'});return noop;}
  var initial=[],deferred=[];
  cards.forEach(function(card){
    var rect=card.getBoundingClientRect();
    if(rect.bottom<-20)gsap.set(card,{autoAlpha:1,clearProps:'opacity,visibility'});
    else if(rect.top<=window.innerHeight*.96)initial.push(card);
    else deferred.push(card);
  });
  if(initial.length){
    gsap.set(initial,{autoAlpha:0});
    rafA=requestAnimationFrame(function(){rafA=0;rafB=requestAnimationFrame(function(){
      rafB=0;gsap.to(initial,{autoAlpha:1,duration:.34,stagger:.032,ease:'power2.out',overwrite:'auto',onComplete:function(){gsap.set(initial,{clearProps:'opacity,visibility'});}});
    });});
  }
  function reveal(batch){
    gsap.to(batch,{autoAlpha:1,duration:.34,stagger:.03,ease:'power2.out',overwrite:'auto',onComplete:function(){gsap.set(batch,{clearProps:'opacity,visibility'});}});
  }
  if(deferred.length){
    gsap.set(deferred,{autoAlpha:0});
    triggers=ST.batch(deferred,{start:profile.start,once:true,interval:.06,batchMax:profile.batchMax,onEnter:reveal,onEnterBack:reveal})||[];
    timer=window.setTimeout(function(){
      deferred.forEach(function(card){
        var rect=card.getBoundingClientRect(),style=getComputedStyle(card);
        if(rect.top<=innerHeight*1.03&&rect.bottom>=-30&&(style.visibility==='hidden'||parseFloat(style.opacity)<.05)){
          gsap.killTweensOf(card);gsap.to(card,{autoAlpha:1,duration:.20,ease:'power2.out',overwrite:true,clearProps:'opacity,visibility'});
        }
      });
      ST.refresh();
    },900);
  }
  return function(){
    if(rafA)cancelAnimationFrame(rafA);if(rafB)cancelAnimationFrame(rafB);if(timer)clearTimeout(timer);
    triggers.forEach(function(trigger){if(trigger&&trigger.kill)trigger.kill();});
    gsap.killTweensOf(cards);gsap.set(cards,{clearProps:'opacity,visibility'});
  };
}
function installImageParallax(gsap,ST){
  var mm=gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)',function(){
    var desktop=window.matchMedia('(min-width: 993px)').matches,distance=desktop?8:6;
    var images=gsap.utils.toArray('.listadoShop .productoShop .imgShop > img'),tweens=[];
    images.forEach(function(img){
      var frame=img.closest('.imgShop');if(!frame)return;
      frame.style.setProperty('overflow','hidden','important');
      img.style.setProperty('transform','translate3d(0,var(--sc-image-parallax-y,0px),0) scale(1.04)','important');
      img.style.setProperty('transform-origin','50% 50%','important');
      img.style.setProperty('backface-visibility','hidden');
      var tween=gsap.fromTo(img,{'--sc-image-parallax-y':(-distance)+'px'},{
        '--sc-image-parallax-y':distance+'px',ease:'none',overwrite:'auto',
        scrollTrigger:{trigger:frame,start:'top bottom',end:'bottom top',scrub:.75,invalidateOnRefresh:true}
      });
      tweens.push(tween);
    });
    var refreshTimer=window.setTimeout(function(){ST.refresh();},80);
    return function(){
      window.clearTimeout(refreshTimer);
      tweens.forEach(function(tween){if(tween&&tween.scrollTrigger)tween.scrollTrigger.kill();if(tween)tween.kill();});
      images.forEach(function(img){
        img.style.removeProperty('--sc-image-parallax-y');img.style.removeProperty('transform');
        img.style.removeProperty('transform-origin');img.style.removeProperty('backface-visibility');
      });
    };
  });
}
installCardMotion();

SC.productCard={
  imageSource:imageSource,
  traitLabels:traitLabels,
  buildTraitGroup:buildTraitGroup,
  enhanceProductLinks:enhanceProductLinks,
  refresh:refreshCards
};
})();