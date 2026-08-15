(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.config,S=C&&C.selectors,M=C&&C.motion;if(!SC||!C||SC.__legacyCategoryHoverBooted)return;SC.__legacyCategoryHoverBooted=true;
SC.mutations=SC.mutations||{};
function closeLegacyCategoryMenus(){
  Array.prototype.forEach.call(document.querySelectorAll(S.legacyPullDownOpen),function(node){node.classList.remove('open');});
  Array.prototype.forEach.call(document.querySelectorAll(S.legacyMobileOpen),function(node){node.classList.remove('_open');});
}
function stripLegacyHoverHandlers(){closeLegacyCategoryMenus();if(!window.jQuery)return;window.jQuery(S.legacyCategoryHoverLinks).off('mouseenter');window.jQuery(S.categoryListItem).off('mouseleave');}
SC.mutations.closeLegacyCategoryMenus=closeLegacyCategoryMenus;SC.mutations.stripLegacyHoverHandlers=stripLegacyHoverHandlers;
var finish=function(){stripLegacyHoverHandlers();window.setTimeout(stripLegacyHoverHandlers,0);window.setTimeout(stripLegacyHoverHandlers,M.legacyHoverRebindDelay);};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',finish,{once:true});else finish();
})();