/* Orquesta el reveal individual de tarjetas por breakpoint. Cada card conserva su propio
   punto de entrada; las de una misma fila se separan físicamente para que no disparen juntas. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,parts=SC&&SC.productCardMotionParts;
if(!SC||!C||!parts||SC.__productCardMotionBooted)return;SC.__productCardMotionBooted=true;
var installed=false,reflowRaf=0,PROFILES={
  mobile:{startPct:97.5,phaseStep:2.4,initialY:4,revealY:6},
  tablet:{startPct:97,phaseStep:2.2,initialY:4,revealY:7},
  desktop:{startPct:96.5,phaseStep:2,initialY:5,revealY:8}
};
function ensureGate(){
  if(SC.catalogRevealGate)return SC.catalogRevealGate;
  var root=document.documentElement,gate={headings:false,cards:false,released:false};
  gate.release=function(){if(gate.released)return;gate.released=true;if(root){root.setAttribute('data-sc-catalog-reveal-ready','true');root.classList.remove('sc-catalog-reveal-prepaint');}};
  gate.mark=function(part){if(part==='headings')gate.headings=true;if(part==='cards')gate.cards=true;if(gate.headings&&gate.cards)gate.release();};
  return SC.catalogRevealGate=gate;
}
function reflow(){
  if(reflowRaf)cancelAnimationFrame(reflowRaf);reflowRaf=requestAnimationFrame(function(){reflowRaf=requestAnimationFrame(function(){reflowRaf=0;if(parts.revealViewport)parts.revealViewport();if(SC.motion&&SC.motion.refresh)SC.motion.refresh(0);});});
}
function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}
function install(){
  if(installed||!SC.motion||typeof SC.motion.whenLoaded!=='function')return;installed=true;
  SC.motion.whenLoaded(function(deps){ready(function(){var gsap=deps.gsap,ST=deps.ScrollTrigger,mm=gsap.matchMedia(),profiles=PROFILES;mm.add({mobile:C.media.phone,tablet:C.media.compactWide,desktop:C.media.desktop,reduceMotion:C.media.reducedMotion},function(ctx){var tablet=!!ctx.conditions.tablet,desktop=!!ctx.conditions.desktop,reduce=!!ctx.conditions.reduceMotion,profile=desktop?profiles.desktop:tablet?profiles.tablet:profiles.mobile;return parts.setupReveal?parts.setupReveal(gsap,ST,profile,reduce):function(){};});ensureGate().mark('cards');});});
}
install();SC.productCardMotion={install:install,reflow:reflow};
})();
