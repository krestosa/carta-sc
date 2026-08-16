(function(){
'use strict';
var SC=window.SCOverride,C=SC&&SC.contentNormalizer,D=C&&C.dom,O=C&&C.observer,U=SC&&SC.utils;
if(!SC||!C||!D||!O||!U||window.__scContentNormalizerBooted)return;window.__scContentNormalizerBooted=true;
var initialized=false;
function init(){if(initialized)return;initialized=true;D.normalizeCatalogue();O.observe();}
function destroy(){if(!initialized)return;initialized=false;O.disconnect();}
C.init=init;C.destroy=destroy;
U.ready(init);
})();
