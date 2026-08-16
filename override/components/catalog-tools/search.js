(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,CFG=SC&&SC.config,S=CFG&&CFG.selectors,K=CFG&&CFG.classes;if(!SC||!U||!CFG||SC.__catalogToolsSearchBooted)return;SC.__catalogToolsSearchBooted=true;
var C=SC.catalogTools=SC.catalogTools||{},inventory=[],groups=[],raf=0,active=false,lastState='',installedRoot=null,installedInput=null,onInput=null,onKeyDown=null,onRootClick=null,onRootKeyDown=null,onDocPointer=null,sortControl=null,sortMenu=null,sortMode='original',activeFilters=new Set();
var SEARCH_SESSION_KEY='scCatalogSearch:v1:'+(location.pathname||'/')+(location.search||'');
var SORT_LABELS={original:'Orden de carta','price-asc':'Menor precio','price-desc':'Mayor precio',discount:'Mayor descuento',az:'A–Z'};
var SPICE_FILTERS=['algo picante','picante','muy picante'];
function normalize(value){var text=String(value||'').toLowerCase().trim();if(text.normalize)text=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'');return text.replace(/\s+/g,' ');}
function words(value){return normalize(value).match(/[a-z0-9]+/g)||[];}
function categoryLabel(value){return String(value||'').replace(/\s+/g,' ').replace(/\s*-\s*\d+\s*%\s*OFF\b.*$/i,'').trim()||'OTROS';}
function money(node){var raw=node&&node.textContent||'',digits=raw.replace(/[^0-9]/g,'');return digits?parseInt(digits,10):NaN;}
function traitFromLegacy(label){var key=normalize(label);if(key==='poco picante')return'algo picante';if(key==='algo picante')return'picante';if(key==='muy picante')return'muy picante';if(key==='vegetariano')return'vegetariano';return key;}
function cardTraits(card){
  var found=[];U.each(card.querySelectorAll('[data-sc-trait]'),function(node){var key=normalize(node.getAttribute('data-sc-trait'));if(key&&found.indexOf(key)<0)found.push(key);});
  if(found.length)return found;
  var api=SC.productCard,labels=api&&api.traitLabels?api.traitLabels(card):[];U.each(labels,function(label){var key=traitFromLegacy(label);if(key&&found.indexOf(key)<0)found.push(key);});return found;
}
function capture(root){
  inventory=[];groups=[];var results=root.querySelector('.sc-catalog-search-results'),prototype=results&&results.querySelector('[data-sc-search-group-prototype]');if(!results||!prototype)return;
  U.each(results.querySelectorAll('.sc-catalog-search-group:not([data-sc-search-group-prototype])'),function(node){if(node.parentNode)node.parentNode.removeChild(node);});
  U.each(document.querySelectorAll(S.container+' '+S.productList),function(section){
    if(section.closest('.sc-catalog-search-results')||!section.querySelector(S.productCard))return;
    var heading=section.querySelector(S.sectionTitle),node=prototype.cloneNode(true),titleNode=node.querySelector('.sc-catalog-search-group-title'),grid=node.querySelector('.sc-catalog-search-grid');
    node.removeAttribute('data-sc-search-group-prototype');node.hidden=true;if(titleNode)titleNode.textContent=categoryLabel(heading&&heading.textContent);results.insertBefore(node,prototype);
    var group={node:node,grid:grid,items:[],order:groups.length,count:0,best:99,visibleItems:[]};groups.push(group);section.classList.add('sc-search-source');
    U.each(section.querySelectorAll(S.productCard),function(card){
      var title=card.querySelector(S.productTitle),description=card.querySelector(S.productDescription),titleText=normalize(title&&title.textContent),descriptionText=normalize(description&&description.textContent),current=money(card.querySelector('.price,.priceHijass')),original=money(card.querySelector('.ofertaPrice'));
      var discount=Number.isFinite(current)&&Number.isFinite(original)&&original>current?Math.round((1-current/original)*100):0;
      var item={card:card,parent:card.parentNode,next:card.nextSibling,order:inventory.length,title:titleText,description:descriptionText,titleWords:words(titleText),descriptionWords:words(descriptionText),group:group,wasHidden:card.hidden,visible:null,rank:99,price:current,discount:discount,traits:cardTraits(card)};inventory.push(item);group.items.push(item);
    });
  });
}
function distance(a,b,limit){
  if(a===b)return 0;if(Math.abs(a.length-b.length)>limit)return limit+1;var prev=new Array(b.length+1),curr=new Array(b.length+1),i,j,min;for(j=0;j<=b.length;j++)prev[j]=j;
  for(i=1;i<=a.length;i++){curr[0]=i;min=curr[0];for(j=1;j<=b.length;j++){curr[j]=Math.min(curr[j-1]+1,prev[j]+1,prev[j-1]+(a.charAt(i-1)===b.charAt(j-1)?0:1));if(curr[j]<min)min=curr[j];}if(min>limit)return limit+1;var swap=prev;prev=curr;curr=swap;}return prev[b.length];
}
function tokenScore(token,list){
  var best=99;for(var i=0;i<list.length;i++){var word=list[i],score=99;if(word===token)score=0;else if(word.indexOf(token)===0)score=1;else if(word.indexOf(token)>=0)score=2;else if(token.length>=4){var limit=token.length<=5?1:2,d=distance(token,word,limit);if(d<=limit)score=3+d;}if(score<best)best=score;if(best===0)break;}return best;
}
function score(item,query,tokens){
  if(item.title===query)return 0;if(item.title.indexOf(query)===0)return 1;if(item.title.indexOf(query)>=0)return 2;var total=4;
  for(var i=0;i<tokens.length;i++){var titleScore=tokenScore(tokens[i],item.titleWords),descriptionScore=tokenScore(tokens[i],item.descriptionWords);if(titleScore===99&&descriptionScore===99)return-1;total+=Math.min(titleScore,descriptionScore===99?99:descriptionScore+6);}return total;
}
function matchesToken(word,token){return tokenScore(token,[normalize(word)])<99;}
function clearHighlights(){U.each(document.querySelectorAll('mark.sc-search-hit'),function(mark){var parent=mark.parentNode;if(!parent)return;parent.replaceChild(document.createTextNode(mark.textContent||''),mark);parent.normalize();});}
function highlightElement(element,tokens){
  if(!element||!tokens.length||!document.createTreeWalker)return;var walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT,null),nodes=[],node;while((node=walker.nextNode())){if(!node.nodeValue||!node.nodeValue.trim())continue;var parent=node.parentElement;if(parent&&(parent.closest('.sabores')||parent.closest('mark.sc-search-hit')))continue;nodes.push(node);}
  nodes.forEach(function(textNode){var parts=textNode.nodeValue.match(/[A-Za-zÀ-ÿ0-9]+|[^A-Za-zÀ-ÿ0-9]+/g)||[],hit=false,fragment=document.createDocumentFragment();parts.forEach(function(part){var isWord=/^[A-Za-zÀ-ÿ0-9]+$/.test(part),matched=isWord&&tokens.some(function(token){return matchesToken(part,token);});if(matched){var mark=document.createElement('mark');mark.className='sc-search-hit';mark.textContent=part;fragment.appendChild(mark);hit=true;}else fragment.appendChild(document.createTextNode(part));});if(hit&&textNode.parentNode)textNode.parentNode.replaceChild(fragment,textNode);});
}
function highlightItem(item,tokens){highlightElement(item.card.querySelector(S.productTitle),tokens);highlightElement(item.card.querySelector(S.productDescription),tokens);}
function filtersPass(item){
  var selectedSpice=SPICE_FILTERS.filter(function(key){return activeFilters.has(key);});if(selectedSpice.length&&!selectedSpice.some(function(key){return item.traits.indexOf(key)>=0;}))return false;
  if(activeFilters.has('vegetariano')&&item.traits.indexOf('vegetariano')<0)return false;if(activeFilters.has('discount')&&item.discount<=0)return false;return true;
}
function compareItems(a,b){
  if(sortMode==='az'){var alpha=a.title.localeCompare(b.title,'es',{sensitivity:'base'});return alpha||a.order-b.order;}
  if(sortMode==='discount')return(b.discount-a.discount)||(a.order-b.order);
  if(sortMode==='price-asc'){var af=Number.isFinite(a.price),bf=Number.isFinite(b.price);if(af!==bf)return af?-1:1;if(!af)return a.order-b.order;return(a.price-b.price)||(a.order-b.order);}
  if(sortMode==='price-desc'){var ad=Number.isFinite(a.price),bd=Number.isFinite(b.price);if(ad!==bd)return ad?-1:1;if(!ad)return a.order-b.order;return(b.price-a.price)||(a.order-b.order);}
  return a.order-b.order;
}
function applySourceSort(){
  groups.forEach(function(group){var list=group.items.slice();if(sortMode!=='original')list.sort(compareItems);list.forEach(function(item,index){item.card.hidden=item.wasHidden;if(sortMode==='original')item.card.style.removeProperty('order');else item.card.style.order=String(100+index);});});
}
function enter(root){if(active)return;active=true;document.body.classList.add(K.catalogSearching);root.classList.add('sc-search-has-value');groups.forEach(function(group){group.items.forEach(function(item){group.grid.appendChild(item.card);});});}
function refreshLayout(){requestAnimationFrame(function(){if(SC.categoryNav&&SC.categoryNav.refreshMetrics)SC.categoryNav.refreshMetrics();if(C.view&&C.view.refreshLayout)C.view.refreshLayout();else if(SC.productCardMotion&&SC.productCardMotion.reflow)SC.productCardMotion.reflow();else if(SC.motion&&SC.motion.refresh)SC.motion.refresh(0);});}
function restore(root,refresh){
  clearHighlights();var results=root&&root.querySelector('.sc-catalog-search-results');if(results)results.hidden=true;
  for(var i=inventory.length-1;i>=0;i--){var item=inventory[i];item.card.hidden=item.wasHidden;item.card.style.removeProperty('order');item.visible=null;item.rank=99;if(!item.parent)continue;if(item.next&&item.next.parentNode===item.parent)item.parent.insertBefore(item.card,item.next);else item.parent.appendChild(item.card);}
  groups.forEach(function(group){group.node.hidden=true;group.node.style.removeProperty('order');group.visibleItems=[];});active=false;lastState='';document.body.classList.remove(K.catalogSearching);if(root)root.classList.remove('sc-search-has-value');applySourceSort();if(refresh!==false)refreshLayout();
}
function stateKey(query){return query+'|'+Array.from(activeFilters).sort().join(',')+'|'+sortMode;}
function apply(root,value){
  var query=normalize(value),status=root.querySelector('.sc-catalog-search-status'),results=root.querySelector('.sc-catalog-search-results'),empty=root.querySelector('.sc-catalog-search-empty-message');if(!results)return;
  var hasResultMode=!!query||activeFilters.size>0,key=stateKey(query);if(key===lastState)return;lastState=key;clearHighlights();
  if(!hasResultMode){if(active)restore(root,false);else{root.classList.remove('sc-search-has-value');applySourceSort();}if(empty)empty.hidden=true;if(status)status.textContent='';refreshLayout();return;}
  enter(root);root.classList.toggle('sc-search-has-value',!!query);var tokens=query?query.split(' '):[],total=0;
  groups.forEach(function(group){group.count=0;group.best=99;group.visibleItems=[];});
  inventory.forEach(function(item){var rank=query?score(item,query,tokens):0,visible=rank>=0&&filtersPass(item);item.rank=rank;if(item.visible!==visible){item.card.hidden=!visible;item.visible=visible;}if(!visible)return;total++;item.group.count++;item.group.visibleItems.push(item);if(rank<item.group.best)item.group.best=rank;});
  groups.forEach(function(group){
    var visible=group.count>0;group.node.hidden=!visible;if(!visible)return;var list=group.visibleItems.slice();if(sortMode==='original'){if(query)list.sort(function(a,b){return(a.rank-b.rank)||(a.order-b.order);});else list.sort(function(a,b){return a.order-b.order;});}else list.sort(compareItems);list.forEach(function(item,index){item.card.style.order=String(index);if(query)highlightItem(item,tokens);});group.node.style.order=String(query&&sortMode==='original'?group.best*1000+group.order:group.order);
  });
  results.hidden=false;if(empty)empty.hidden=total!==0;if(status)status.textContent=total===1?'1 producto encontrado':total+' productos encontrados';if(C.view&&C.view.refreshLayout)C.view.refreshLayout();
}
function saveSearch(value){try{if(value)sessionStorage.setItem(SEARCH_SESSION_KEY,value);else sessionStorage.removeItem(SEARCH_SESSION_KEY);}catch(_){} }
function loadSearch(){try{return sessionStorage.getItem(SEARCH_SESSION_KEY)||'';}catch(_){return'';}}
function filterKey(box){var icon=box.querySelector('[data-sc-trait]'),key=icon&&normalize(icon.getAttribute('data-sc-trait'));if(key)return key;return normalize(box.querySelector('.ref_label')&&box.querySelector('.ref_label').textContent);}
function syncFilterButtons(root){U.each(root.querySelectorAll('[data-sc-filter]'),function(button){var key=button.getAttribute('data-sc-filter'),on=activeFilters.has(key);button.setAttribute('aria-pressed',on?'true':'false');button.classList.toggle('is-active',on);});}
function ensureFilters(root){
  var strip=root.querySelector('.referencias_picor.sc-trait-reference-strip');if(!strip)return;
  U.each(strip.querySelectorAll('.refBox'),function(box){var key=filterKey(box);if(SPICE_FILTERS.indexOf(key)<0&&key!=='vegetariano')return;box.classList.add('sc-filter-chip');box.setAttribute('data-sc-filter',key);box.setAttribute('role','button');box.setAttribute('tabindex','0');box.setAttribute('aria-pressed','false');box.setAttribute('aria-label','Filtrar por '+((box.querySelector('.ref_label')&&box.querySelector('.ref_label').textContent)||key));});
  if(!strip.querySelector('[data-sc-filter="discount"]')){var discount=document.createElement('button');discount.type='button';discount.className='sc-filter-chip sc-filter-chip--discount';discount.setAttribute('data-sc-filter','discount');discount.setAttribute('aria-pressed','false');discount.innerHTML='<span class="sc-filter-discount-symbol" aria-hidden="true">%</span><span>Con descuento</span>';strip.appendChild(discount);}syncFilterButtons(root);
}
function closeSortMenu(){if(!sortMenu)return;sortMenu.setAttribute('aria-hidden','true');var toggle=sortControl&&sortControl.querySelector('.sc-catalog-sort-toggle');if(toggle)toggle.setAttribute('aria-expanded','false');}
function openSortMenu(){if(!sortMenu)return;sortMenu.setAttribute('aria-hidden','false');var toggle=sortControl.querySelector('.sc-catalog-sort-toggle');toggle.setAttribute('aria-expanded','true');var checked=sortMenu.querySelector('[aria-checked="true"]');if(checked)checked.focus();}
function syncSortControl(){if(!sortControl)return;var toggle=sortControl.querySelector('.sc-catalog-sort-toggle'),label=SORT_LABELS[sortMode]||SORT_LABELS.original;if(toggle){toggle.setAttribute('aria-label','Ordenar productos. '+label);toggle.setAttribute('title','Ordenar: '+label);}U.each(sortControl.querySelectorAll('[data-sc-sort]'),function(option){var on=option.getAttribute('data-sc-sort')===sortMode;option.setAttribute('aria-checked',on?'true':'false');option.classList.toggle('is-active',on);});}
function ensureSortControl(root){
  var actions=root.querySelector('.sc-catalog-actions');if(!actions)return;sortControl=actions.querySelector('.sc-sort-control');if(!sortControl){sortControl=document.createElement('div');sortControl.className='sc-sort-control';sortControl.innerHTML='<button class="sc-catalog-sort-toggle" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="sc-catalog-sort-menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18h6v-2H3v2zm0-5h12v-2H3v2zm0-7v2h18V6H3z"></path></svg></button><div class="sc-catalog-sort-menu" id="sc-catalog-sort-menu" role="menu" aria-label="Ordenar productos" aria-hidden="true"><button type="button" role="menuitemradio" data-sc-sort="original" aria-checked="true">Orden de carta</button><button type="button" role="menuitemradio" data-sc-sort="price-asc" aria-checked="false">Menor precio</button><button type="button" role="menuitemradio" data-sc-sort="price-desc" aria-checked="false">Mayor precio</button><button type="button" role="menuitemradio" data-sc-sort="discount" aria-checked="false">Mayor descuento</button><button type="button" role="menuitemradio" data-sc-sort="az" aria-checked="false">A–Z</button></div>';actions.appendChild(sortControl);}sortMenu=sortControl.querySelector('.sc-catalog-sort-menu');syncSortControl();
}
function handleFilter(root,target){var chip=target.closest&&target.closest('[data-sc-filter]');if(!chip||!root.contains(chip))return false;var key=chip.getAttribute('data-sc-filter');if(!key)return false;if(activeFilters.has(key))activeFilters.delete(key);else activeFilters.add(key);syncFilterButtons(root);lastState='';apply(root,installedInput&&installedInput.value||'');return true;}
function handleSort(root,target){
  var toggle=target.closest&&target.closest('.sc-catalog-sort-toggle');if(toggle&&sortControl&&sortControl.contains(toggle)){if(sortMenu.getAttribute('aria-hidden')==='true')openSortMenu();else closeSortMenu();return true;}
  var option=target.closest&&target.closest('[data-sc-sort]');if(option&&sortControl&&sortControl.contains(option)){sortMode=option.getAttribute('data-sc-sort')||'original';syncSortControl();closeSortMenu();lastState='';apply(root,installedInput&&installedInput.value||'');return true;}return false;
}
function destroy(){
  if(raf){cancelAnimationFrame(raf);raf=0;}if(installedInput&&onInput)installedInput.removeEventListener('input',onInput);if(installedInput&&onKeyDown)installedInput.removeEventListener('keydown',onKeyDown);if(installedRoot&&onRootClick)installedRoot.removeEventListener('click',onRootClick);if(installedRoot&&onRootKeyDown)installedRoot.removeEventListener('keydown',onRootKeyDown);if(onDocPointer)document.removeEventListener('pointerdown',onDocPointer,true);if(active)restore(installedRoot,false);else{clearHighlights();applySourceSort();}
  if(sortControl&&sortControl.parentNode)sortControl.parentNode.removeChild(sortControl);installedRoot=null;installedInput=null;onInput=null;onKeyDown=null;onRootClick=null;onRootKeyDown=null;onDocPointer=null;sortControl=null;sortMenu=null;inventory=[];groups=[];lastState='';activeFilters.clear();sortMode='original';
}
function install(root){
  destroy();var input=root&&root.querySelector('.sc-catalog-search-input');if(!input)return function(){};installedRoot=root;installedInput=input;capture(root);ensureSortControl(root);
  onInput=function(){saveSearch(input.value);if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(function(){raf=0;if(installedRoot===root){lastState='';apply(root,input.value);}});};
  onKeyDown=function(event){if(event.key!=='Escape'||!input.value)return;input.value='';saveSearch('');lastState='';apply(root,'');input.focus();};
  onRootClick=function(event){if(handleFilter(root,event.target)){event.preventDefault();return;}if(handleSort(root,event.target)){event.preventDefault();return;}};
  onRootKeyDown=function(event){var chip=event.target&&event.target.closest&&event.target.closest('[data-sc-filter]');if(chip&&(event.key==='Enter'||event.key===' ')){event.preventDefault();handleFilter(root,chip);return;}if(event.key==='Escape'&&sortMenu&&sortMenu.getAttribute('aria-hidden')==='false'){event.preventDefault();closeSortMenu();var toggle=sortControl.querySelector('.sc-catalog-sort-toggle');if(toggle)toggle.focus();}};
  onDocPointer=function(event){if(sortControl&&sortMenu&&sortMenu.getAttribute('aria-hidden')==='false'&&!sortControl.contains(event.target))closeSortMenu();};
  input.addEventListener('input',onInput);input.addEventListener('keydown',onKeyDown);root.addEventListener('click',onRootClick);root.addEventListener('keydown',onRootKeyDown);document.addEventListener('pointerdown',onDocPointer,true);
  requestAnimationFrame(function(){if(installedRoot!==root)return;ensureFilters(root);var saved=loadSearch();if(saved){input.value=saved;lastState='';apply(root,saved);}});
  return function(){if(installedRoot===root)destroy();};
}
C.search={install:install,apply:apply,destroy:destroy,getSort:function(){return sortMode;},getFilters:function(){return Array.from(activeFilters);}};
})();
