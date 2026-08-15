(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils;if(!SC||!U||SC.__catalogToolsSearchBooted)return;SC.__catalogToolsSearchBooted=true;
var C=SC.catalogTools=SC.catalogTools||{},cache=new WeakMap(),raf=0;
function normalize(value){var text=String(value||'').toLowerCase().trim();if(text.normalize)text=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'');return text.replace(/\s+/g,' ');}
function cardText(card){if(cache.has(card))return cache.get(card);var parts=[],title=card.querySelector('.title-shop1'),description=card.querySelector('.descrip');if(title)parts.push(title.textContent||'');if(description)parts.push(description.textContent||'');var value=normalize(parts.join(' '));cache.set(card,value);return value;}
function matchCard(card,tokens){if(!tokens.length)return true;var value=cardText(card);for(var i=0;i<tokens.length;i++)if(value.indexOf(tokens[i])<0)return false;return true;}
function refreshGeometry(){if(SC.categoryNav&&SC.categoryNav.refreshMetrics)SC.categoryNav.refreshMetrics();if(SC.motion&&SC.motion.refresh)SC.motion.refresh(0);}
function apply(root,value){var query=normalize(value),tokens=query?query.split(' '):[],shown=0;document.body.classList.toggle('sc-catalog-searching',!!query);root.classList.toggle('sc-search-has-value',!!query);U.each(document.querySelectorAll('.listadoShop'),function(section){var sectionShown=0;U.each(section.querySelectorAll('.productoShop'),function(card){var visible=matchCard(card,tokens);card.classList.toggle('sc-search-hidden',!visible);if(visible){shown++;sectionShown++;}});section.classList.toggle('sc-search-empty',!!query&&sectionShown===0);});var status=root.querySelector('.sc-catalog-search-status');if(status)status.textContent=query?(shown===1?'1 producto encontrado':shown+' productos encontrados'):'';refreshGeometry();}
function install(root){var input=root&&root.querySelector('.sc-catalog-search-input');if(!input)return;function schedule(){if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(function(){raf=0;apply(root,input.value);});}input.addEventListener('input',schedule);input.addEventListener('keydown',function(event){if(event.key!=='Escape'||!input.value)return;input.value='';schedule();input.focus();});}
C.search={install:install,apply:apply};
})();
