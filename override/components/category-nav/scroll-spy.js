(function(){
'use strict';
var SC=window.SCOverride,N=SC&&SC.categoryNav,A=N&&N.categoryActive,I=N&&N.categoryIndicator;
if(!SC||!N||!A||!I||SC.__categoryNavScrollSpyBooted)return;SC.__categoryNavScrollSpyBooted=true;
var metrics=[],spyRaf=0;
function refreshMetrics(){var seen=[];metrics=[];N.links().forEach(function(link){var target=N.anchor(link.getAttribute('href'));if(!target||seen.indexOf(target)>=0)return;seen.push(target);metrics.push({target:target,top:target.getBoundingClientRect().top+(pageYOffset||document.documentElement.scrollTop||0)});});metrics.sort(function(a,b){return a.top-b.top;});I.markDirty();scheduleSpy();}
function current(){if(!metrics.length)return null;var mark=(pageYOffset||document.documentElement.scrollTop||0)+N.offset()+2,target=metrics[0].target;for(var i=0;i<metrics.length;i++){if(metrics[i].top<=mark)target=metrics[i].target;else break;}return target;}
function spy(){spyRaf=0;var target=current(),active=A.current();if(target&&target!==active)A.set(target,true);else if(target&&I.isDirty())I.move(target,false);}
function scheduleSpy(){if(!spyRaf)spyRaf=requestAnimationFrame(spy);}
N.refreshMetrics=refreshMetrics;N.refreshSections=refreshMetrics;N.current=current;N.scheduleSpy=scheduleSpy;
})();