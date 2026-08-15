(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,CFG=SC&&SC.config,S=CFG&&CFG.selectors,K=CFG&&CFG.classes,A=CFG&&CFG.attributes,L=CFG&&CFG.labels;if(!SC||!U||!CFG||SC.__catalogToolsSearchBooted)return;SC.__catalogToolsSearchBooted=true;
var C=SC.catalogTools=SC.catalogTools||{},inventory=[],groups=[],raf=0,active=false,lastQuery=null;
function normalize(value){var text=String(value||'').toLowerCase().trim();if(text.normalize)text=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'');return text.replace(/\s+/g,' ');}
function categoryLabel(value){return String(value||'').replace(/\s+/g,' ').replace(/\s*-\s*\d+\s*%\s*OFF\b.*$/i,'').trim()||L.catalogFallbackCategory;}
function capture(root){
  inventory=[];groups=[];var results=root.querySelector(S.catalogSearchResults),prototype=results&&results.querySelector(S.catalogSearchGroupPrototype);if(!results||!prototype)return;
  U.each(document.querySelectorAll(S.container+' '+S.productList),function(section){
    if(section.closest(S.catalogSearchResults)||!section.querySelector(S.productCard))return;
    var heading=section.querySelector(S.sectionTitle),node=prototype.cloneNode(true),titleNode=node.querySelector(S.catalogSearchGroupTitle),grid=node.querySelector(S.catalogSearchGrid);
    node.removeAttribute(A.searchGroupPrototype);node.hidden=true;if(titleNode)titleNode.textContent=categoryLabel(heading&&heading.textContent);results.insertBefore(node,prototype);
    var group={node:node,grid:grid,items:[],order:groups.length,count:0,best:99,lastOrder:null};groups.push(group);section.classList.add(K.searchSource);
    U.each(section.querySelectorAll(S.productCard),function(card){
      var title=card.querySelector(S.productTitle),description=card.querySelector(S.productDescription),titleText=normalize(title&&title.textContent),descriptionText=normalize(description&&description.textContent);
      var item={card:card,parent:card.parentNode,next:card.nextSibling,order:inventory.length,title:titleText,description:descriptionText,text:(titleText+' '+descriptionText).trim(),group:group,wasHidden:card.hidden,visible:null,lastOrder:null};inventory.push(item);group.items.push(item);
    });
  });
}
function score(item,query,tokens){
  for(var i=0;i<tokens.length;i++)if(item.text.indexOf(tokens[i])<0)return-1;
  if(item.title===query)return 0;if(item.title.indexOf(query)===0)return 1;if(item.title.indexOf(query)>=0)return 2;
  var allTitle=true;for(var j=0;j<tokens.length;j++)if(item.title.indexOf(tokens[j])<0){allTitle=false;break;}if(allTitle)return 3;
  if(item.description.indexOf(query)>=0)return 4;return 5;
}
function enter(root){
  if(active)return;active=true;document.body.classList.add(K.catalogSearching);root.classList.add(K.searchHasValue);
  groups.forEach(function(group){group.items.forEach(function(item){group.grid.appendChild(item.card);});});
}
function restore(root){
  var results=root.querySelector(S.catalogSearchResults);if(results)results.hidden=true;
  for(var i=inventory.length-1;i>=0;i--){var item=inventory[i];item.card.hidden=item.wasHidden;item.card.style.removeProperty('order');item.visible=null;item.lastOrder=null;if(!item.parent)continue;if(item.next&&item.next.parentNode===item.parent)item.parent.insertBefore(item.card,item.next);else item.parent.appendChild(item.card);}
  groups.forEach(function(group){group.node.hidden=true;group.node.style.removeProperty('order');group.lastOrder=null;});
  active=false;lastQuery=null;document.body.classList.remove(K.catalogSearching);root.classList.remove(K.searchHasValue);
  requestAnimationFrame(function(){if(SC.categoryNav&&SC.categoryNav.refreshMetrics)SC.categoryNav.refreshMetrics();if(SC.motion&&SC.motion.refresh)SC.motion.refresh(0);});
}
function apply(root,value){
  var query=normalize(value),status=root.querySelector(S.catalogSearchStatus),results=root.querySelector(S.catalogSearchResults),empty=root.querySelector(S.catalogSearchEmpty);if(!results)return;
  if(!query){if(active)restore(root);else root.classList.remove(K.searchHasValue);if(empty)empty.hidden=true;if(status)status.textContent='';return;}
  if(query===lastQuery)return;enter(root);lastQuery=query;var tokens=query.split(' '),total=0;
  groups.forEach(function(group){group.count=0;group.best=99;});
  inventory.forEach(function(item){
    var rank=score(item,query,tokens),visible=rank>=0;if(item.visible!==visible){item.card.hidden=!visible;item.visible=visible;}if(!visible)return;
    total++;item.group.count++;if(rank<item.group.best)item.group.best=rank;var order=rank*100000+item.order;if(item.lastOrder!==order){item.card.style.order=order;item.lastOrder=order;}
  });
  groups.forEach(function(group){var visible=group.count>0;group.node.hidden=!visible;if(!visible)return;var order=group.best*1000+group.order;if(group.lastOrder!==order){group.node.style.order=order;group.lastOrder=order;}});
  results.hidden=false;if(empty)empty.hidden=total!==0;if(status)status.textContent=total===1?L.searchSingleResult:total+L.searchResultSuffix;
}
function install(root){
  var input=root&&root.querySelector(S.catalogSearchInput);if(!input)return;capture(root);
  function schedule(){if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(function(){raf=0;apply(root,input.value);});}
  input.addEventListener('input',schedule);input.addEventListener('keydown',function(event){if(event.key!=='Escape'||!input.value)return;input.value='';schedule();input.focus();});
}
C.search={install:install,apply:apply};
})();
