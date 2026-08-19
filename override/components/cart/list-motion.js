(function(){
'use strict';
/* Las filas del carrito no reciben una entrada decorativa por defecto. */
var SC=window.SCOverride;if(!SC||SC.__cartListMotionBooted)return;SC.__cartListMotionBooted=true;
var parts=SC.cartParts=SC.cartParts||{};
parts.setupList=function(){return function(){};};
})();