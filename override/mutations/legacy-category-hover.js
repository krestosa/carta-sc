(function(){
'use strict';
var SC=window.SCOverride;if(!SC||SC.__legacyCategoryHoverBooted)return;SC.__legacyCategoryHoverBooted=true;
SC.mutations=SC.mutations||{};

function closeLegacyCategoryMenus(){
  Array.prototype.forEach.call(document.querySelectorAll('.topPullDown.open'),function(node){node.classList.remove('open');});
  Array.prototype.forEach.call(document.querySelectorAll('.topShopMenuMobile._open'),function(node){node.classList.remove('_open');});
}
function stripLegacyHoverHandlers(){
  closeLegacyCategoryMenus();
  if(!window.jQuery)return;
  window.jQuery('.nav-tabsTopShop .anchorLink').off('mouseenter');
  window.jQuery('.nav-top-li').off('mouseleave');
}
SC.mutations.closeLegacyCategoryMenus=closeLegacyCategoryMenus;
SC.mutations.stripLegacyHoverHandlers=stripLegacyHoverHandlers;
var finish=function(){
  stripLegacyHoverHandlers();
  window.setTimeout(stripLegacyHoverHandlers,0);
  window.setTimeout(stripLegacyHoverHandlers,120);
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',finish,{once:true});else finish();
})();