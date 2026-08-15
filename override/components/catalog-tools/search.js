(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils;if(!SC||!U||SC.__catalogToolsSearchBooted)return;SC.__catalogToolsSearchBooted=true;
var C=SC.catalogTools=SC.catalogTools||{},inventory=[],raf=0,active=false;
function normalize(value){var text=String(value||'').toLowerCase().trim();if(text.normalize)text=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'');return text.replace(/\s+/g,' ');}
function capture(){inventory=[];U.each(document.querySelectorAll('.listadoShop:not(.sc-catalog-search-results) .productoShop'),function(card,index){var title=card.querySelector('.title-shop1'),description=card.querySelector('.descrip');inventory.push({card:card,parent:card.parentNode,next:card.nextSibling,order:index,title:normalize(title&&title.textContent),description:normalize(description&&description.textContent)});card.classList.remove('sc-search-hidden');});}
function restore(){for(var i=inventory.length-1;i>=0;i--){var item=inventory[i];if(!item.parent)continue;if(item.next&&item.next.parentNode===item.parent)item.parent.insertBefore(item.card,item.next);else item.parent.appendChild(item.card);item.card.classList.remove('sc-search-result','sc-search-hidden');}}
function score(item,query,tokens){var joined=(item.title+' '+item.description).trim();for(var i=0;i<tokens.length;i++)if(joined.indexOf(tokens[i])<0)return-1;if(item.title===query)return 0;if(item.title.indexOf(query)===0)return 1;if(item.title.indexOf(query)>=0)return 2;for(var j=0;j<tokens.length;j++)if(item.title.indexOf(tokens[j])<0){j=-1;break;}if(j!==-1)return 3;if(item.description.indexOf(query)>=0)return 4;return 5;}
function refreshGeometry(searching){if(!searching&&SC.categoryNav&&SC.categoryNav.refreshMetrics)SC.categoryNav.refreshMetrics();if(SC.motion&&SC.motion.refresh)SC.motion.refresh(0);}
function apply(root,value){var query=normalize(value),tokens=query?query.split(' '):[],results=root.querySelector('.sc-catalog-search-results'),empty=root.querySelector('.sc-catalog-search-empty-message'),status=root.querySelector('.sc-catalog-search-status');if(!results)return;
  if(!query){if(active)restore();active=false;document.body.classList.remove('sc-catalog-searching');root.classList.remove('sc-search-has-value');results.hidden=true;if(empty)empty.hidden=true;if(status)status.textContent='';refreshGeometry(false);return;}
  if(!active)capture();else restore();active=true;document.body.classList.add('sc-catalog-searching');root.classList.add('sc-search-has-value');
  var ranked=[];inventory.forEach(function(item){var rank=score(item,query,tokens);if(rank>=0)ranked.push({item:item,rank:rank});});ranked.sort(function(a,b){return a.rank-b.rank||a.item.order-b.item.order;});
  ranked.forEach(function(entry){entry.item.card.classList.add('sc-search-result');results.appendChild(entry.item.card);});results.hidden=false;if(empty)empty.hidden=ranked.length!==0;if(status)status.textContent=ranked.length===1?'1 producto encontrado':ranked.length+' productos encontrados';refreshGeometry(true);
}
function install(root){var input=root&&root.querySelector('.sc-catalog-search-input');if(!input)return;function schedule(){if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(function(){raf=0;apply(root,input.value);});}input.addEventListener('input',schedule);input.addEventListener('keydown',function(event){if(event.key!=='Escape'||!input.value)return;input.value='';schedule();input.focus();});}
C.search={install:install,apply:apply};
})();
