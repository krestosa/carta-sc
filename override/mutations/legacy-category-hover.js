(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors;if(!SC||!C||SC.__legacyCategoryHoverBooted)return;SC.__legacyCategoryHoverBooted=true;
SC.mutations=SC.mutations||{};
var timers=[],initialized=false,readyHandler=null,REPAIR_DELAYS=[0,120];
function closeLegacyCategoryMenus(){
  Array.prototype.forEach.call(document.querySelectorAll(S.legacyPullDownOpen),function(node){node.classList.remove('open');});
  Array.prototype.forEach.call(document.querySelectorAll(S.legacyMobileOpen),function(node){node.classList.remove('_open');});
}
function stripLegacyHoverHandlers(){closeLegacyCategoryMenus();if(!window.jQuery)return;window.jQuery(".nav-tabsTopShop .anchorLink").off('mouseenter');window.jQuery(".nav-top-li").off('mouseleave');}
function clearTimers(){timers.forEach(function(timer){clearTimeout(timer);});timers=[];}
function init(){
  if(initialized)return;initialized=true;stripLegacyHoverHandlers();
  REPAIR_DELAYS.forEach(function(delay){timers.push(window.setTimeout(function(){if(initialized)stripLegacyHoverHandlers();},delay));});
}
function destroy(){
  initialized=false;clearTimers();if(readyHandler){document.removeEventListener('DOMContentLoaded',readyHandler);readyHandler=null;}
  /* Removed host hover handlers cannot be restored safely; teardown only owns pending override work. */
}
function boot(){readyHandler=null;init();}
SC.mutations.closeLegacyCategoryMenus=closeLegacyCategoryMenus;SC.mutations.stripLegacyHoverHandlers=stripLegacyHoverHandlers;
SC.mutations.legacyCategoryHover={init:init,destroy:destroy};
if(document.readyState==='loading'){readyHandler=boot;document.addEventListener('DOMContentLoaded',readyHandler,{once:true});}else init();
})();