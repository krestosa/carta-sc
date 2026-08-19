(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,C=SC&&SC.config,D=SC&&SC.productCardData,A=SC&&SC.productCardA11y,P=SC&&SC.productCardContent;
if(!SC||!U||!C||!D||!A||!P||SC.__productCardBooted)return;SC.__productCardBooted=true;

/* Estado de observers y trabajo incremental. */
var ready=U.ready,S=C.selectors,desktopQuery=C.queries.desktop,resizeObserver=null,cardObserver=null,cardRaf=0,lastWidth=-1,resizeFallback=false,initialized=false,initialQueue=[],initialIdle=0,initialTimer=0,initialDone=false,RESIZE_WIDTH_TOLERANCE=.5,INITIAL_BATCH=1,INITIAL_BUDGET_MS=4,INITIAL_IDLE_TIMEOUT=1500;

/* Detecta cards nuevas o incompletas. */
function needsEnhancement(card){return!!(card&&(!card.querySelector('.sc-product-flavors')||!card.querySelector('.sc-product-price-traits')||!card.querySelector('.sc-product-secondary-meta')||!card.querySelector('.sc-card-a11y-meta')));}
function addedNeedsEnhancement(node){if(!node||node.nodeType!==1)return false;if(node.matches&&node.matches(S.productCard))return needsEnhancement(node);if(!node.querySelectorAll)return false;var cards=node.querySelectorAll(S.productCard);for(var i=0;i<cards.length;i++)if(needsEnhancement(cards[i]))return true;return false;}

/* Observa mutaciones solo después de completar el primer lote. */
function observeCards(){var root=document.querySelector(S.container)||document.body;if(!initialized||!initialDone||!root||!window.MutationObserver)return;if(!cardObserver)cardObserver=new MutationObserver(function(mutations){for(var i=0;i<mutations.length;i++){var mutation=mutations[i],target=mutation.target&&mutation.target.nodeType===1?mutation.target:mutation.target&&mutation.target.parentElement,card=target&&target.closest?target.closest(S.productCard):null;if(needsEnhancement(card)){scheduleCardRefresh();return;}for(var j=0;j<(mutation.addedNodes||[]).length;j++){if(addedNeedsEnhancement(mutation.addedNodes[j])){scheduleCardRefresh();return;}}}});cardObserver.disconnect();cardObserver.observe(root,{childList:true,subtree:true});}

/* Reaplica accesibilidad, rasgos y medición sin duplicar observers ni refresh pendientes. */
function refreshCards(){if(cardRaf){cancelAnimationFrame(cardRaf);cardRaf=0;}if(cardObserver)cardObserver.disconnect();cancelInitialWork();A.enhanceAll();P.installFlavorRows();P.scheduleDescriptionMeasure();initialDone=true;observeCards();installResizeTracking();}
function runCardRefresh(){cardRaf=0;if(initialized)refreshCards();}
function scheduleCardRefresh(){if(initialized&&!cardRaf)cardRaf=requestAnimationFrame(runCardRefresh);}

/* Solo vuelve a medir descripciones cuando cambia el ancho real. */
function installResizeTracking(){var root=document.querySelector(S.container)||document.body;if(!root||resizeObserver||resizeFallback)return;if(!window.ResizeObserver){window.addEventListener('resize',P.scheduleDescriptionMeasure,{passive:true});resizeFallback=true;return;}lastWidth=-1;resizeObserver=new ResizeObserver(function(entries){var entry=entries[0],width=entry&&entry.contentRect?entry.contentRect.width:root.clientWidth;if(lastWidth<0){lastWidth=width;return;}if(Math.abs(width-lastWidth)<RESIZE_WIDTH_TOLERANCE)return;lastWidth=width;P.scheduleDescriptionMeasure();});resizeObserver.observe(root);}
function enhanceCard(card){var link=card&&card.querySelector?card.querySelector(S.productLink):null;if(!link)return;A.enhanceLink(link);P.installFlavorRow(link);}

/* Divide la mejora inicial para no bloquear el hilo principal. */
function cancelInitialWork(){if(initialIdle&&window.cancelIdleCallback)window.cancelIdleCallback(initialIdle);if(initialTimer)clearTimeout(initialTimer);initialIdle=0;initialTimer=0;initialQueue=[];}
function finishInitialWork(){initialIdle=0;initialTimer=0;initialQueue=[];initialDone=true;if(!initialized)return;P.scheduleDescriptionMeasure();installResizeTracking();observeCards();if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){if(initialized)P.scheduleDescriptionMeasure();}).catch(function(){});}
function runInitialBatch(deadline){
  initialIdle=0;initialTimer=0;if(!initialized)return;var start=performance.now(),count=0;
  while(initialQueue.length&&count<INITIAL_BATCH&&performance.now()-start<INITIAL_BUDGET_MS&&(!deadline||deadline.didTimeout||deadline.timeRemaining()>2)){enhanceCard(initialQueue.shift());count++;}
  if(!initialQueue.length){finishInitialWork();return;}scheduleInitialBatch();
}
function scheduleInitialBatch(){if(!initialized||initialIdle||initialTimer)return;if(typeof window.requestIdleCallback==='function'){initialIdle=window.requestIdleCallback(runInitialBatch,{timeout:INITIAL_IDLE_TIMEOUT});return;}initialTimer=window.setTimeout(function(){runInitialBatch(null);},32);}
function startIncrementalEnhancement(){
  initialDone=false;A.enhanceHeadings();P.installTraitReferences();initialQueue=Array.prototype.slice.call(document.querySelectorAll(S.productCard));
  var critical=desktopQuery.matches?8:4;while(initialQueue.length&&critical-->0)enhanceCard(initialQueue.shift());
  if(initialQueue.length)scheduleInitialBatch();else finishInitialWork();
}

/* Ciclo del componente y respuesta a breakpoint. */
function breakpoint(){if(initialized)refreshCards();}
function init(){if(initialized)return;initialized=true;startIncrementalEnhancement();if(desktopQuery.addEventListener)desktopQuery.addEventListener('change',breakpoint);else desktopQuery.addListener(breakpoint);}
function destroy(){if(!initialized)return;initialized=false;if(cardObserver)cardObserver.disconnect();if(resizeObserver){resizeObserver.disconnect();resizeObserver=null;}if(resizeFallback){window.removeEventListener('resize',P.scheduleDescriptionMeasure);resizeFallback=false;}if(cardRaf){cancelAnimationFrame(cardRaf);cardRaf=0;}cancelInitialWork();if(P.cancelDescriptionMeasure)P.cancelDescriptionMeasure();if(desktopQuery.removeEventListener)desktopQuery.removeEventListener('change',breakpoint);else desktopQuery.removeListener(breakpoint);}
ready(init);
SC.productCard={imageSource:D.imageSource,traitLabels:D.traitLabels,buildTraitGroup:D.buildTraitGroup,enhanceProductLinks:A.enhanceAll,refresh:refreshCards,repair:scheduleCardRefresh,init:init,destroy:destroy};
})();
