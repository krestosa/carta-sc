(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,CFG=SC&&SC.config,S=CFG&&CFG.selectors,K=CFG&&CFG.classes;if(!SC||!U||!CFG||SC.__catalogToolsSearchBooted)return;SC.__catalogToolsSearchBooted=true;
var C=SC.catalogTools=SC.catalogTools||{},inventory=[],groups=[],active=false,lastState='',installedRoot=null,installedInput=null,onInput=null,onKeyDown=null,onRootClick=null,onRootKeyDown=null,saveTimer=0,pendingSave='',activeFilters=new Set();
var SEARCH_SESSION_KEY='scCatalogSearch:v1:'+(location.pathname||'/')+(location.search||'');
var SPICE_FILTERS=['poco picante','picante','muy picante'];
var FILTER_LABELS={'poco picante':'Poco Picante','picante':'Picante','muy picante':'Muy Picante','vegetariano':'Vegetariano'};
var TRAIT_BITS={'poco picante':1,'picante':2,'muy picante':4,'vegetariano':8};
function normalize(value){var text=String(value||'').toLowerCase().trim();if(text.normalize)text=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'');return text.replace(/\s+/g,' ');}
function words(value){return normalize(value).match(/[a-z0-9]+/g)||[];}
function categoryLabel(value){return String(value||'').replace(/\s+/g,' ').replace(/\s*-\s*\d+\s*%\s*OFF\b.*$/i,'').trim()||'OTROS';}
function traitFromLegacy(label){var key=normalize(label);if(key==='poco picante')return'poco picante';if(key==='algo picante')return'picante';if(key==='picante')return'picante';if(key==='muy picante')return'muy picante';if(key==='vegetariano')return'vegetariano';return key;}
function cardTraits(card){
  var found=[];U.each(card.querySelectorAll('[data-sc-trait]'),function(node){var key=normalize(node.getAttribute('data-sc-trait'));if(key&&found.indexOf(key)<0)found.push(key);});
  if(found.length)return found;
  var api=SC.productCard,labels=api&&api.traitLabels?api.traitLabels(card):[];U.each(labels,function(label){var key=traitFromLegacy(label);if(key&&found.indexOf(key)<0)found.push(key);});return found;
}
function traitsMask(list){var mask=0;for(var i=0;i<list.length;i++)mask|=TRAIT_BITS[list[i]]||0;return mask;}
function capture(root){
  inventory=[];groups=[];var results=root.querySelector('.sc-catalog-search-results'),prototype=results&&results.querySelector('[data-sc-search-group-prototype]');if(!results||!prototype)return;
  U.each(results.querySelectorAll('.sc-catalog-search-group:not([data-sc-search-group-prototype])'),function(node){if(node.parentNode)node.parentNode.removeChild(node);});
  U.each(document.querySelectorAll(S.container+' '+S.productList),function(section){
    if(section.closest('.sc-catalog-search-results')||!section.querySelector(S.productCard))return;
    var heading=section.querySelector(S.sectionTitle),node=prototype.cloneNode(true),titleNode=node.querySelector('.sc-catalog-search-group-title'),grid=node.querySelector('.sc-catalog-search-grid');
    node.removeAttribute('data-sc-search-group-prototype');node.hidden=true;if(titleNode)titleNode.textContent=categoryLabel(heading&&heading.textContent);results.insertBefore(node,prototype);
    var group={node:node,grid:grid,items:[],count:0,shown:false};groups.push(group);section.classList.add('sc-search-source');
    U.each(section.querySelectorAll(S.productCard),function(card){
      var title=card.querySelector(S.productTitle),description=card.querySelector(S.productDescription),titleText=normalize(title&&title.textContent),descriptionText=normalize(description&&description.textContent),searchText=(titleText+' '+descriptionText).trim(),traits=cardTraits(card);
      var item={card:card,parent:card.parentNode,next:card.nextSibling,searchText:searchText,searchWords:words(searchText),group:group,wasHidden:card.hidden,visible:null,traitMask:traitsMask(traits)};inventory.push(item);group.items.push(item);
    });
  });
}
function oneEditOrSwap(a,b){
  if(a===b)return true;var al=a.length,bl=b.length,diff=al-bl;if(diff>1||diff<-1)return false;
  if(al===bl){var first=-1,second=-1;for(var i=0;i<al;i++){if(a.charCodeAt(i)===b.charCodeAt(i))continue;if(first<0)first=i;else if(second<0)second=i;else return false;}if(first<0)return true;if(second<0)return true;return second===first+1&&a.charCodeAt(first)===b.charCodeAt(second)&&a.charCodeAt(second)===b.charCodeAt(first);}
  var longer=al>bl?a:b,shorter=al>bl?b:a,li=0,si=0,skipped=false;while(li<longer.length&&si<shorter.length){if(longer.charCodeAt(li)===shorter.charCodeAt(si)){li++;si++;continue;}if(skipped)return false;skipped=true;li++;}return true;
}
function fuzzyToken(token,list){
  if(token.length<4)return false;for(var i=0;i<list.length;i++){var word=list[i];if(Math.abs(word.length-token.length)>1)continue;if(oneEditOrSwap(token,word))return true;}return false;
}
function queryPass(item,query,tokens){
  if(!query)return true;if(item.searchText.indexOf(query)>=0)return true;
  for(var i=0;i<tokens.length;i++){var token=tokens[i];if(item.searchText.indexOf(token)>=0)continue;if(!fuzzyToken(token,item.searchWords))return false;}return true;
}
function filterMask(){var mask=0;if(activeFilters.has('poco picante'))mask|=1;if(activeFilters.has('picante'))mask|=2;if(activeFilters.has('muy picante'))mask|=4;return mask;}
function filtersPass(item,spiceMask,vegetarian){if(spiceMask&&(item.traitMask&spiceMask)===0)return false;if(vegetarian&&(item.traitMask&8)===0)return false;return true;}
function enter(root){
  if(active)return;active=true;document.body.classList.add(K.catalogSearching);root.classList.add('sc-search-has-value');
  groups.forEach(function(group){var fragment=document.createDocumentFragment();group.items.forEach(function(item){item.card.style.removeProperty('order');fragment.appendChild(item.card);});group.grid.appendChild(fragment);});
}
function refreshLayout(){requestAnimationFrame(function(){if(SC.categoryNav&&SC.categoryNav.refreshMetrics)SC.categoryNav.refreshMetrics();if(C.view&&C.view.refreshLayout)C.view.refreshLayout();else if(SC.productCardMotion&&SC.productCardMotion.reflow)SC.productCardMotion.reflow();else if(SC.motion&&SC.motion.refresh)SC.motion.refresh(0);});}
function restore(root,refresh){
  var results=root&&root.querySelector('.sc-catalog-search-results');if(results)results.hidden=true;
  for(var i=inventory.length-1;i>=0;i--){var item=inventory[i];item.card.hidden=item.wasHidden;item.card.style.removeProperty('order');item.visible=null;if(!item.parent)continue;if(item.next&&item.next.parentNode===item.parent)item.parent.insertBefore(item.card,item.next);else item.parent.appendChild(item.card);}
  groups.forEach(function(group){group.node.hidden=true;group.count=0;group.shown=false;});active=false;lastState='';document.body.classList.remove(K.catalogSearching);if(root)root.classList.remove('sc-search-has-value');if(refresh!==false)refreshLayout();
}
function stateKey(query){return query+'|'+Array.from(activeFilters).sort().join(',');}
function apply(root,value){
  var query=normalize(value),status=root.querySelector('.sc-catalog-search-status'),results=root.querySelector('.sc-catalog-search-results'),empty=root.querySelector('.sc-catalog-search-empty-message');if(!results)return;
  var hasResultMode=!!query||activeFilters.size>0,key=stateKey(query);if(key===lastState)return;lastState=key;
  if(!hasResultMode){if(active)restore(root,false);else root.classList.remove('sc-search-has-value');if(empty)empty.hidden=true;if(status)status.textContent='';refreshLayout();return;}
  enter(root);root.classList.toggle('sc-search-has-value',!!query);var tokens=query?query.split(' '):[],spiceMask=filterMask(),vegetarian=activeFilters.has('vegetariano'),total=0;
  for(var g=0;g<groups.length;g++)groups[g].count=0;
  for(var i=0;i<inventory.length;i++){
    var item=inventory[i],visible=filtersPass(item,spiceMask,vegetarian)&&queryPass(item,query,tokens);if(item.visible!==visible){item.card.hidden=!visible;item.visible=visible;}if(!visible)continue;total++;item.group.count++;
  }
  for(var j=0;j<groups.length;j++){var group=groups[j],shown=group.count>0;if(group.shown!==shown){group.node.hidden=!shown;group.shown=shown;}}
  if(results.hidden)results.hidden=false;if(empty)empty.hidden=total!==0;if(status)status.textContent=total===1?'1 producto encontrado':total+' productos encontrados';
}
function saveSearchNow(value){try{if(value)sessionStorage.setItem(SEARCH_SESSION_KEY,value);else sessionStorage.removeItem(SEARCH_SESSION_KEY);}catch(_){} }
function queueSearchSave(value){pendingSave=value;if(saveTimer)clearTimeout(saveTimer);saveTimer=setTimeout(function(){saveTimer=0;saveSearchNow(pendingSave);},180);}
function loadSearch(){try{return sessionStorage.getItem(SEARCH_SESSION_KEY)||'';}catch(_){return'';}}
function filterKey(box){var icon=box.querySelector('[data-sc-trait]'),key=icon&&normalize(icon.getAttribute('data-sc-trait'));if(key)return key;return traitFromLegacy(box.querySelector('.ref_label')&&box.querySelector('.ref_label').textContent);}
function syncFilterButtons(root){U.each(root.querySelectorAll('[data-sc-filter]'),function(button){var key=button.getAttribute('data-sc-filter'),on=activeFilters.has(key);button.setAttribute('aria-pressed',on?'true':'false');button.classList.toggle('is-active',on);});}
function ensureFilters(root){
  var strip=root.querySelector('.referencias_picor.sc-trait-reference-strip');if(!strip)return;
  U.each(strip.querySelectorAll('[data-sc-filter="discount"],.sc-filter-chip--discount'),function(node){if(node.parentNode)node.parentNode.removeChild(node);});
  U.each(strip.querySelectorAll('.refBox'),function(box){var key=filterKey(box),labelNode=box.querySelector('.ref_label');if(SPICE_FILTERS.indexOf(key)<0&&key!=='vegetariano')return;if(labelNode&&FILTER_LABELS[key])labelNode.textContent=FILTER_LABELS[key];box.classList.add('sc-filter-chip');box.setAttribute('data-sc-filter',key);box.setAttribute('role','button');box.setAttribute('tabindex','0');box.setAttribute('aria-pressed','false');box.setAttribute('aria-label','Filtrar por '+(FILTER_LABELS[key]||key));});
  syncFilterButtons(root);
}
function handleFilter(root,target){var chip=target.closest&&target.closest('[data-sc-filter]');if(!chip||!root.contains(chip))return false;var key=chip.getAttribute('data-sc-filter');if(!key)return false;if(activeFilters.has(key))activeFilters.delete(key);else activeFilters.add(key);syncFilterButtons(root);lastState='';apply(root,installedInput&&installedInput.value||'');return true;}
function destroy(){
  if(saveTimer){clearTimeout(saveTimer);saveTimer=0;saveSearchNow(pendingSave);}if(installedInput&&onInput)installedInput.removeEventListener('input',onInput);if(installedInput&&onKeyDown)installedInput.removeEventListener('keydown',onKeyDown);if(installedRoot&&onRootClick)installedRoot.removeEventListener('click',onRootClick);if(installedRoot&&onRootKeyDown)installedRoot.removeEventListener('keydown',onRootKeyDown);if(active)restore(installedRoot,false);
  if(installedRoot)U.each(installedRoot.querySelectorAll('.sc-sort-control,[data-sc-filter="discount"],.sc-filter-chip--discount'),function(node){if(node.parentNode)node.parentNode.removeChild(node);});installedRoot=null;installedInput=null;onInput=null;onKeyDown=null;onRootClick=null;onRootKeyDown=null;inventory=[];groups=[];lastState='';pendingSave='';activeFilters.clear();
}
function install(root){
  destroy();var input=root&&root.querySelector('.sc-catalog-search-input');if(!input)return function(){};installedRoot=root;installedInput=input;capture(root);U.each(root.querySelectorAll('.sc-sort-control'),function(node){if(node.parentNode)node.parentNode.removeChild(node);});
  onInput=function(){queueSearchSave(input.value);lastState='';apply(root,input.value);};
  onKeyDown=function(event){if(event.key!=='Escape'||!input.value)return;input.value='';queueSearchSave('');lastState='';apply(root,'');input.focus();};
  onRootClick=function(event){if(handleFilter(root,event.target))event.preventDefault();};
  onRootKeyDown=function(event){var chip=event.target&&event.target.closest&&event.target.closest('[data-sc-filter]');if(chip&&(event.key==='Enter'||event.key===' ')){event.preventDefault();handleFilter(root,chip);}};
  input.addEventListener('input',onInput);input.addEventListener('keydown',onKeyDown);root.addEventListener('click',onRootClick);root.addEventListener('keydown',onRootKeyDown);
  requestAnimationFrame(function(){if(installedRoot!==root)return;ensureFilters(root);var saved=loadSearch();if(saved){input.value=saved;lastState='';apply(root,saved);}});
  return function(){if(installedRoot===root)destroy();};
}
C.search={install:install,apply:apply,destroy:destroy,getFilters:function(){return Array.from(activeFilters);}};
})();
