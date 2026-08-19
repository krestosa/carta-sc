(function(){
'use strict';
var SC=window.SCOverride;
if(!SC||SC.__transitionPatternsBooted)return;SC.__transitionPatternsBooted=true;

function valid(r){return!!(r&&r.width>.5&&r.height>.5&&isFinite(r.left)&&isFinite(r.top));}
function rect(node){return node&&node.getBoundingClientRect?node.getBoundingClientRect():null;}
function clamp(value,min,max){return Math.min(max,Math.max(min,value));}
function lerp(a,b,p){return a+(b-a)*p;}
function range(progress,start,end){if(progress<=start)return 0;if(progress>=end)return 1;return(progress-start)/(end-start);}
function cubicPoint(a,b,c,d,t){var mt=1-t;return mt*mt*mt*a+3*mt*mt*t*b+3*mt*t*t*c+t*t*t*d;}
function solveSegment(x,x0,x1,x2,x3,y0,y1,y2,y3){var lo=0,hi=1,t=.5,i;for(i=0;i<12;i++){t=(lo+hi)/2;if(cubicPoint(x0,x1,x2,x3,t)<x)lo=t;else hi=t;}return cubicPoint(y0,y1,y2,y3,(lo+hi)/2);}
/* Curva emphasized espacial del transform de contenedor. */
function emphasized(p){p=clamp(p,0,1);if(p<=1/6)return solveSegment(p,0,.05,.133333,1/6,0,0,.06,.4);return solveSegment(p,1/6,.208333,.25,1,.4,.82,1,1);}
function cubicEase(x1,y1,x2,y2){return function(p){p=clamp(p,0,1);var lo=0,hi=1,t=.5,i;for(i=0;i<12;i++){t=(lo+hi)/2;if(cubicPoint(0,x1,x2,1,t)<p)lo=t;else hi=t;}return cubicPoint(0,y1,y2,1,(lo+hi)/2);};}
var emphasizedWeb=cubicEase(.3,0,0,1),emphasizedAccelerate=cubicEase(.3,0,.8,.15);

SC.transitionPatterns={
  easing:{emphasized:emphasized,webEmphasized:emphasizedWeb,accelerate:emphasizedAccelerate},
  range:range,
  lerp:lerp,
  clamp:clamp,
  rect:rect,
  validRect:valid
};
})();