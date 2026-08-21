(function(){
'use strict';
/* Coordina las capas de motion del carrito por breakpoint. */
var SC=window.SCOverride,C=SC&&SC.config,parts=SC&&SC.cartParts,PROFILES={mobile:{maxLag:8,velocityScale:.0024},tablet:{maxLag:10,velocityScale:.0028},desktop:{maxLag:14,velocityScale:.0032}};if(!SC||!C||!parts||SC.__cartComponentBooted)return;SC.__cartComponentBooted=true;
if(!SC.motion||typeof SC.motion.whenReady!=='function')return;
var cleanup:(()=>void)|null=null;
function mount(engine:MotionEngine):void{if(cleanup){cleanup();cleanup=null;}var tablet=C.queries.tablet.matches,desktop=C.queries.desktop.matches,reduce=C.queries.reducedMotion.matches,profile=desktop?PROFILES.desktop:tablet?PROFILES.tablet:PROFILES.mobile,cleanList=parts.setupList?parts.setupList(engine,reduce):function(){},cleanScroll=parts.setupScroll?parts.setupScroll(engine,profile,reduce):function(){},cleanBadges=parts.setupBadges?parts.setupBadges(engine,reduce):function(){};cleanup=function(){cleanList();cleanScroll();cleanBadges();};}
SC.motion.whenReady(function(deps:MotionDeps){var engine=deps.engine,remount=function(){mount(engine);};mount(engine);[C.queries.mobile,C.queries.tablet,C.queries.desktop,C.queries.reducedMotion].forEach(function(query){if(query.addEventListener)query.addEventListener('change',remount);else query.addListener(remount);});});
})();
