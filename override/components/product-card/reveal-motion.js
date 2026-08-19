/* Las tarjetas estáticas no se ocultan ni reciben una entrada decorativa. */
(function(){
'use strict';
var SC=window.SCOverride;if(!SC||SC.__productCardRevealMotionBooted)return;SC.__productCardRevealMotionBooted=true;
var parts=SC.productCardMotionParts=SC.productCardMotionParts||{};
parts.setupReveal=function(){parts.revealViewport=null;return function(){};};
})();