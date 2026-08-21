/* Orquesta el motion propio de las cards por breakpoint. */
(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,parts=SC&&SC.productCardMotionParts;if(!SC||!C||!parts||SC.__productCardMotionBooted)return;SC.__productCardMotionBooted=true;
if(!SC.motion||typeof SC.motion.whenReady!=='function')return;
var cleanup:(()=>void)|null=null;
function mount(engine:MotionEngine):void{if(cleanup){cleanup();cleanup=null;}var tablet=C.queries.tablet.matches,desktop=C.queries.desktop.matches,reduce=C.queries.reducedMotion.matches,profile=desktop?{initialY:12,revealY:16,threshold:.04}:tablet?{initialY:10,revealY:14,threshold:.035}:{initialY:8,revealY:12,threshold:.025};cleanup=parts.setupReveal?parts.setupReveal(engine,profile,reduce):function(){};}
SC.motion.whenReady(function(deps:MotionDeps){var engine=deps.engine,remount=function(){mount(engine);};mount(engine);[C.queries.phone,C.queries.tablet,C.queries.desktop,C.queries.reducedMotion].forEach(function(query){if(query.addEventListener)query.addEventListener('change',remount);else query.addListener(remount);});});
})();
