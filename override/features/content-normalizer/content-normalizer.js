(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.contentNormalizer,D=C&&C.dom,O=C&&C.observer,U=SC&&SC.utils;
if(!SC||!C||!D||!O||!U||window.__scContentNormalizerBooted)return;window.__scContentNormalizerBooted=true;
U.ready(function(){D.normalizeCatalogue();O.observe();});
})();