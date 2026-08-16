(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,CFG=SC&&SC.config,S=CFG&&CFG.selectors,K=CFG&&CFG.classes;if(!SC||!U||!CFG||SC.__catalogToolsSearchBooted)return;SC.__catalogToolsSearchBooted=true;
var C=SC.catalogTools=SC.catalogTools||{},inventory=[],searchable=[],groups=[],visibleItems=[],queryCandidates=[],lastQuery='',lastState='',active=false,installedRoot=null,installedInput=null,statusNode=null,resultsNode=null,emptyNode=null,onInput=null,onKeyDown=null,onRootClick=null,onRootKeyDown=null,onFocus=null,onPointerDown=null,saveTimer=0,pendingSave='',epoch=0,activeFilters=new Set();
var SEARCH_SESSION_KEY='scCatalogSearch:v1:'+(location.pathname||'/')+(location.search||''),VIEW_STORE_KEY='scCatalogView:v3';
var SPICE_FILTERS=['poco picante','picante','muy picante'];
var FILTER_LABELS={'poco picante':'Poco Picante','picante':'Picante','muy picante':'Muy Picante','vegetariano':'Vegetariano'};
var TRAIT_BITS={'poco picante':1,'picante':2,'muy picante':4,'vegetariano':8};
function normalize(value){var text=String(value||'').toLowerCase().trim();if(text.normalize)text=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'');return text.replace(/\s+/g,' ');}
function traitFromLegacy(label){var key=normalize(label);if(key==='poco picante')return'poco picante';if(key==='algo picante')return'picante';if(key==='picante')return'picante';if(key==='muy picante')return'muy picante';if(key==='vegetariano')return'vegetariano';return key;}
function cardTraits(card){var found=[];U.each(card.querySelectorAll('[data-sc-trait]'),function(node){var key=normalize(node.getAttribute('data-sc-trait'));if(key&&found.indexOf(key)<0)found.push(key);});if(found.length)return found;var api=SC.productCard,labels=api&&api.traitLabels?api.traitLabels(card):[];U.each(labels,function(label){var key=traitFromLegacy(label);if(key&&found.indexOf(key)<0)found.push(key);});return found;}
function traitsMask(list){var mask=0;for(var i=0;i<list.length;i++)mask|=TRAIT_BITS[list[i]]||0;return mask;}
function capture(root){
  inventory=[];searchable=[];groups=[];visibleItems=[];queryCandidates=[];lastQuery='';
  if(resultsNode)U.each(resultsNode.querySelectorAll('.sc-catalog-search-group:not([data-sc-search-group-prototype])'),function(node){if(node.parentNode)node.parentNode.removeChild(node);});
  U.each(document.querySelectorAll(S.container+' '+S.productList),function(section){
    if(section.closest('.sc-catalog-search-results')||!section.querySelector(S.productCard))return;section.classList.add('sc-search-source');
    var group={node:section,items:[],count:0,wasHidden:section.hidden,visible:!section.hidden};groups.push(group);
    U.each(section.querySelectorAll(S.productCard),function(card){
      var title=card.querySelector(S.productTitle),description=card.querySelector(S.productDescription),titleText=normalize(title&&title.textContent),descriptionText=normalize(description&&description.textContent),item={card:card,text:(titleText+' '+descriptionText).trim(),traitMask:traitsMask(cardTraits(card)),group:group,wasHidden:card.hidden,visible:!card.hidden,matchEpoch:0};
      inventory.push(item);group.items.push(item);if(!item.wasHidden){searchable.push(item);visibleItems.push(item);}
    });
  });
  queryCandidates=searchable;
}
function ensureList(root){
  var doc=document.documentElement;if(doc.getAttribute('data-sc-catalog-view')==='list')return false;
  doc.setAttribute('data-sc-catalog-view','list');document.body.setAttribute('data-sc-catalog-view','list');if(root)root.setAttribute('data-sc-view','list');try{localStorage.setItem(VIEW_STORE_KEY,'list');}catch(_){}if(C.view&&C.view.sync)C.view.sync();return true;
}
function filterMask(){var mask=0;if(activeFilters.has('poco picante'))mask|=1;if(activeFilters.has('picante'))mask|=2;if(activeFilters.has('muy picante'))mask|=4;if(activeFilters.has('vegetariano'))mask|=8;return mask;}
function filtersPass(item,mask){var spice=mask&7;if(spice&&(item.traitMask&spice)===0)return false;if((mask&8)&&(item.traitMask&8)===0)return false;return true;}
function queryPass(text,query,tokens){if(!query)return true;if(text.indexOf(query)>=0)return true;for(var i=0;i<tokens.length;i++)if(text.indexOf(tokens[i])<0)return false;return true;}
function candidatesFor(query){
  if(!query){lastQuery='';queryCandidates=searchable;return queryCandidates;}if(query===lastQuery)return queryCandidates;
  var source=lastQuery&&query.length>lastQuery.length&&query.indexOf(lastQuery)===0?queryCandidates:searchable,tokens=query.split(' '),next=[];
  for(var i=0;i<source.length;i++)if(queryPass(source[i].text,query,tokens))next.push(source[i]);lastQuery=query;queryCandidates=next;return next;
}
function setEmpty(total){if(!resultsNode||!emptyNode)return;if(total===0){resultsNode.hidden=false;emptyNode.hidden=false;}else{emptyNode.hidden=true;resultsNode.hidden=true;}}
function enter(root){if(active)return;ensureList(root);active=true;document.body.classList.add(K.catalogSearching);for(var i=0;i<inventory.length;i++)inventory[i].visible=!inventory[i].wasHidden;for(var g=0;g<groups.length;g++)groups[g].visible=!groups[g].wasHidden;visibleItems=searchable.slice();}
function apply(root,value){
  var query=normalize(value),mask=filterMask(),hasMode=!!query||mask!==0,key=query+'|'+mask;if(key===lastState)return;
  if(!hasMode){lastState=key;if(active)restore(root,true);else{root.classList.remove('sc-search-has-value');setEmpty(1);if(statusNode)statusNode.textContent='';}return;}
  enter(root);lastState=key;root.classList.toggle('sc-search-has-value',!!query);
  var candidates=candidatesFor(query),nextVisible=[],groupChanges=[],cardChanges=[],currentEpoch=++epoch,total=0;
  for(var g=0;g<groups.length;g++)groups[g].count=0;
  for(var i=0;i<candidates.length;i++){var item=candidates[i];if(!filtersPass(item,mask))continue;item.matchEpoch=currentEpoch;nextVisible.push(item);item.group.count++;total++;}
  for(var p=0;p<visibleItems.length;p++){var previous=visibleItems[p];if(previous.matchEpoch!==currentEpoch&&previous.visible)cardChanges.push([previous,false]);}
  for(var n=0;n<nextVisible.length;n++){var next=nextVisible[n];if(!next.visible)cardChanges.push([next,true]);}
  for(var j=0;j<groups.length;j++){var group=groups[j],show=!group.wasHidden&&group.count>0;if(group.visible!==show)groupChanges.push([group,show]);}
  for(var c=0;c<cardChanges.length;c++){var change=cardChanges[c];change[0].card.hidden=!change[1];change[0].visible=change[1];}
  for(var s=0;s<groupChanges.length;s++){var groupChange=groupChanges[s];groupChange[0].node.hidden=!groupChange[1];groupChange[0].visible=groupChange[1];}
  visibleItems=nextVisible;setEmpty(total);if(statusNode)statusNode.textContent=total===1?'1 producto encontrado':total+' productos encontrados';
}
function scheduleRestoreRefresh(){requestAnimationFrame(function(){if(SC.categoryNav&&SC.categoryNav.refreshMetrics)SC.categoryNav.refreshMetrics();if(C.view&&C.view.refreshLayout)C.view.refreshLayout(null);});}
function restore(root,refresh){
  for(var i=0;i<inventory.length;i++){var item=inventory[i],show=!item.wasHidden;if(item.visible!==show)item.card.hidden=item.wasHidden;item.visible=show;item.matchEpoch=0;}
  for(var g=0;g<groups.length;g++){var group=groups[g],groupShow=!group.wasHidden;if(group.visible!==groupShow)group.node.hidden=group.wasHidden;group.visible=groupShow;group.count=0;}
  active=false;lastState='';lastQuery='';queryCandidates=searchable;visibleItems=searchable.slice();document.body.classList.remove(K.catalogSearching);if(root)root.classList.remove('sc-search-has-value');setEmpty(1);if(statusNode)statusNode.textContent='';if(refresh)scheduleRestoreRefresh();
}
function saveSearchNow(value){try{if(value)sessionStorage.setItem(SEARCH_SESSION_KEY,value);else sessionStorage.removeItem(SEARCH_SESSION_KEY);}catch(_){} }
function queueSearchSave(value){pendingSave=value;if(saveTimer)clearTimeout(saveTimer);saveTimer=setTimeout(function(){saveTimer=0;saveSearchNow(pendingSave);},180);}
function loadSearch(){try{return sessionStorage.getItem(SEARCH_SESSION_KEY)||'';}catch(_){return'';}}
function filterKey(box){var icon=box.querySelector('[data-sc-trait]'),key=icon&&normalize(icon.getAttribute('data-sc-trait'));if(key)return key;return traitFromLegacy(box.querySelector('.ref_label')&&box.querySelector('.ref_label').textContent);}
function syncFilterButtons(root){U.each(root.querySelectorAll('[data-sc-filter]'),function(button){var key=button.getAttribute('data-sc-filter'),on=activeFilters.has(key);button.setAttribute('aria-pressed',on?'true':'false');button.classList.toggle('is-active',on);});}
function ensureFilters(root){var strip=root.querySelector('.referencias_picor.sc-trait-reference-strip');if(!strip)return;U.each(strip.querySelectorAll('[data-sc-filter="discount"],.sc-filter-chip--discount'),function(node){if(node.parentNode)node.parentNode.removeChild(node);});U.each(strip.querySelectorAll('.refBox'),function(box){var key=filterKey(box),labelNode=box.querySelector('.ref_label');if(SPICE_FILTERS.indexOf(key)<0&&key!=='vegetariano')return;if(labelNode&&FILTER_LABELS[key])labelNode.textContent=FILTER_LABELS[key];box.classList.add('sc-filter-chip');box.setAttribute('data-sc-filter',key);box.setAttribute('role','button');box.setAttribute('tabindex','0');box.setAttribute('aria-pressed','false');box.setAttribute('aria-label','Filtrar por '+(FILTER_LABELS[key]||key));});syncFilterButtons(root);}
function handleFilter(root,target){var chip=target.closest&&target.closest('[data-sc-filter]');if(!chip||!root.contains(chip))return false;var key=chip.getAttribute('data-sc-filter');if(!key)return false;if(activeFilters.has(key))activeFilters.delete(key);else activeFilters.add(key);syncFilterButtons(root);ensureList(root);lastState='';apply(root,installedInput&&installedInput.value||'');return true;}
function destroy(){
  if(saveTimer){clearTimeout(saveTimer);saveTimer=0;saveSearchNow(pendingSave);}if(installedInput&&onInput)installedInput.removeEventListener('input',onInput);if(installedInput&&onKeyDown)installedInput.removeEventListener('keydown',onKeyDown);if(installedInput&&onFocus)installedInput.removeEventListener('focus',onFocus);if(installedInput&&onPointerDown)installedInput.removeEventListener('pointerdown',onPointerDown);if(installedRoot&&onRootClick)installedRoot.removeEventListener('click',onRootClick);if(installedRoot&&onRootKeyDown)installedRoot.removeEventListener('keydown',onRootKeyDown);if(active)restore(installedRoot,false);else document.body&&document.body.classList.remove(K.catalogSearching);
  installedRoot=null;installedInput=null;statusNode=null;resultsNode=null;emptyNode=null;onInput=null;onKeyDown=null;onRootClick=null;onRootKeyDown=null;onFocus=null;onPointerDown=null;inventory=[];searchable=[];groups=[];visibleItems=[];queryCandidates=[];lastQuery='';lastState='';pendingSave='';activeFilters.clear();
}
function install(root){
  destroy();var input=root&&root.querySelector('.sc-catalog-search-input');if(!input)return function(){};installedRoot=root;installedInput=input;statusNode=root.querySelector('.sc-catalog-search-status');resultsNode=root.querySelector('.sc-catalog-search-results');emptyNode=root.querySelector('.sc-catalog-search-empty-message');capture(root);U.each(root.querySelectorAll('.sc-sort-control'),function(node){if(node.parentNode)node.parentNode.removeChild(node);});
  onPointerDown=function(){ensureList(root);};onFocus=function(){ensureList(root);};
  onInput=function(){queueSearchSave(input.value);lastState='';apply(root,input.value);};
  onKeyDown=function(event){if(event.key!=='Escape'||!input.value)return;input.value='';queueSearchSave('');lastState='';apply(root,'');input.focus();};
  onRootClick=function(event){if(handleFilter(root,event.target))event.preventDefault();};
  onRootKeyDown=function(event){var chip=event.target&&event.target.closest&&event.target.closest('[data-sc-filter]');if(chip&&(event.key==='Enter'||event.key===' ')){event.preventDefault();handleFilter(root,chip);}};
  input.addEventListener('pointerdown',onPointerDown,{passive:true});input.addEventListener('focus',onFocus);input.addEventListener('input',onInput);input.addEventListener('keydown',onKeyDown);root.addEventListener('click',onRootClick);root.addEventListener('keydown',onRootKeyDown);
  requestAnimationFrame(function(){if(installedRoot!==root)return;ensureFilters(root);var saved=loadSearch();if(saved){ensureList(root);input.value=saved;lastState='';apply(root,saved);}});
  return function(){if(installedRoot===root)destroy();};
}
C.search={install:install,apply:apply,destroy:destroy,getFilters:function(){return Array.from(activeFilters);}};
})();
