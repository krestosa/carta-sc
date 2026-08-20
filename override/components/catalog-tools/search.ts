(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,CFG=SC&&SC.config,S=CFG&&CFG.selectors,K=CFG&&CFG.classes;if(!SC||!U||!CFG||SC.__catalogToolsSearchBooted)return;SC.__catalogToolsSearchBooted=true;

/* Estado en memoria de búsqueda, grupos y filtros. */
var C=SC.catalogTools=SC.catalogTools||{};
interface SearchSegment{heading:HTMLElement|null;headingWasHidden:boolean;headingVisible:boolean;items:SearchItem[];count:number;bestRank:number;index:number;}
interface SearchHost{parent:Node;groups:SearchGroup[];after:ChildNode|null;signature:string;}
interface SearchGroup{node:HTMLElement;host:SearchHost;index:number;titleNode:HTMLElement|null;titleWasHidden:boolean;titleVisible:boolean;segments:SearchSegment[];items:SearchItem[];count:number;bestRank:number;wasHidden:boolean;visible:boolean;}
interface SearchItem{card:HTMLElement;title:string;description:string;text:string;traitMask:number;group:SearchGroup;segment:SearchSegment;index:number;wasHidden:boolean;visible:boolean;matchEpoch:number;rank:number;}
var inventory:SearchItem[]=[],searchable:SearchItem[]=[],groups:SearchGroup[]=[],hosts:SearchHost[]=[],visibleItems:SearchItem[]=[],queryCandidates:SearchItem[]=[],lastQuery='',lastState='',active=false,installedRoot:HTMLElement|null=null,installedInput:HTMLInputElement|null=null,clearNode:HTMLElement|null=null,statusNode:HTMLElement|null=null,resultsNode:HTMLElement|null=null,emptyNode:HTMLElement|null=null,onInput:(()=>void)|null=null,onKeyDown:((event:KeyboardEvent)=>void)|null=null,onRootClick:((event:MouseEvent)=>void)|null=null,onRootKeyDown:((event:KeyboardEvent)=>void)|null=null,epoch=0,captured=false,activeFilters=new Set<string>();
var SPICE_FILTERS:string[]=['poco picante','picante','muy picante'];
var FILTER_LABELS:Record<string,string>={'poco picante':'Poco Picante','picante':'Picante','muy picante':'Muy Picante','vegetariano':'Vegetariano'};
var TRAIT_BITS:Record<string,number>={'poco picante':1,'picante':2,'muy picante':4,'vegetariano':8};

/* Normaliza texto y rasgos para comparar sin acentos. */
function normalize(value:unknown):string{var text=String(value||'').toLowerCase().trim();if(text.normalize)text=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'');return text.replace(/\s+/g,' ');}
function traitFromLegacy(label:unknown):string{var key=normalize(label);if(key==='poco picante')return'poco picante';if(key==='algo picante')return'picante';if(key==='picante')return'picante';if(key==='muy picante')return'muy picante';if(key==='vegetariano')return'vegetariano';return key;}
function cardTraits(card:HTMLElement):string[]{var found:string[]=[];U.each(card.querySelectorAll<HTMLElement>('[data-sc-trait]'),function(node:HTMLElement){var key=normalize(node.getAttribute('data-sc-trait'));if(key&&found.indexOf(key)<0)found.push(key);});if(found.length)return found;var api=SC.productCard,labels=api&&api.traitLabels?api.traitLabels(card):[];U.each(labels,function(label:string){var key=traitFromLegacy(label);if(key&&found.indexOf(key)<0)found.push(key);});return found;}
function traitsMask(list:string[]):number{var mask=0;for(var i=0;i<list.length;i++){var trait=list[i];if(trait)mask|=TRAIT_BITS[trait]||0;}return mask;}

/* Captura la estructura original para filtrar y luego restaurar. */
function makeSegment(heading:HTMLElement|null,index:number):SearchSegment{return{heading:heading,headingWasHidden:heading?heading.hidden:false,headingVisible:heading?!heading.hidden:false,items:[],count:0,bestRank:99,index:index};}
function hostFor(parent:Node):SearchHost{for(var i=0;i<hosts.length;i++){var existing=hosts[i];if(existing&&existing.parent===parent)return existing;}var host:SearchHost={parent:parent,groups:[],after:null,signature:''};hosts.push(host);return host;}
function capture(root:HTMLElement):void{
  inventory=[];searchable=[];groups=[];hosts=[];visibleItems=[];queryCandidates=[];lastQuery='';
  if(resultsNode)U.each(resultsNode.querySelectorAll<HTMLElement>('.sc-catalog-search-group:not([data-sc-search-group-prototype])'),function(node:HTMLElement){if(node.parentNode)node.parentNode.removeChild(node);});
  U.each(document.querySelectorAll<HTMLElement>(S.container+' '+S.productList),function(section:HTMLElement){
    if(section.closest('.sc-catalog-search-results'))return;section.classList.add('sc-search-source');
    var sectionParent=section.parentNode;if(!sectionParent)return;var host=hostFor(sectionParent),group:SearchGroup={node:section,host:host,index:groups.length,titleNode:null,titleWasHidden:false,titleVisible:false,segments:[],items:[],count:0,bestRank:99,wasHidden:section.hidden,visible:!section.hidden},segment=makeSegment(null,0),children=section.children;
    group.segments.push(segment);groups.push(group);host.groups.push(group);
    for(var i=0;i<children.length;i++){
      var child=children[i] as HTMLElement|undefined;if(!child)continue;
      if(child.matches&&child.matches(S.sectionTitle)){group.titleNode=child;group.titleWasHidden=child.hidden;group.titleVisible=!child.hidden;continue;}
      if(child.matches&&child.matches(S.sectionSubtitle)){segment=makeSegment(child,group.segments.length);group.segments.push(segment);continue;}
      if(!(child.matches&&child.matches(S.productCard)))continue;
      var title=child.querySelector<HTMLElement>(S.productTitle),description=child.querySelector<HTMLElement>(S.productDescription),titleText=normalize(title&&title.textContent),descriptionText=normalize(description&&description.textContent),item={card:child,title:titleText,description:descriptionText,text:(titleText+' '+descriptionText).trim(),traitMask:traitsMask(cardTraits(child)),group:group,segment:segment,index:inventory.length,wasHidden:child.hidden,visible:!child.hidden,matchEpoch:0,rank:99};
      inventory.push(item);group.items.push(item);segment.items.push(item);if(!item.wasHidden){searchable.push(item);visibleItems.push(item);}
    }
  });
  for(var h=0;h<hosts.length;h++){var hostEntry=hosts[h];if(!hostEntry)continue;var list=hostEntry.groups;hostEntry.after=list.length?list[list.length-1]!.node.nextSibling:null;hostEntry.signature='o:'+list.map(function(group:SearchGroup){return group.index;}).join(',');}
  queryCandidates=searchable;captured=true;
}
function ensureCaptured(root:HTMLElement):void{if(!captured)capture(root);}

/* Evalúa filtros con máscara de bits. */
function filterMask():number{var mask=0;if(activeFilters.has('poco picante'))mask|=1;if(activeFilters.has('picante'))mask|=2;if(activeFilters.has('muy picante'))mask|=4;if(activeFilters.has('vegetariano'))mask|=8;return mask;}
function filtersPass(item:SearchItem,mask:number):boolean{var spice=mask&7;if(spice&&(item.traitMask&spice)===0)return false;if((mask&8)&&(item.traitMask&8)===0)return false;return true;}

/* Busca por texto y prioriza coincidencias en el título. */
function fieldPass(text:string,query:string,tokens:string[]):boolean{if(text.indexOf(query)>=0)return true;for(var i=0;i<tokens.length;i++)if(text.indexOf(tokens[i]||'')<0)return false;return true;}
function queryPass(text:string,query:string,tokens:string[]):boolean{if(!query)return true;return fieldPass(text,query,tokens);}
function rankOf(item:SearchItem,query:string,tokens:string[]):number{
  if(!query)return 0;
  if(item.title===query)return 0;if(item.title.indexOf(query)===0)return 1;if(item.title.indexOf(query)>=0)return 2;if(fieldPass(item.title,query,tokens))return 3;
  if(item.description===query)return 4;if(item.description.indexOf(query)===0)return 5;if(item.description.indexOf(query)>=0)return 6;if(fieldPass(item.description,query,tokens))return 7;
  return queryPass(item.text,query,tokens)?8:-1;
}
function candidatesFor(query:string):SearchItem[]{
  if(!query){lastQuery='';queryCandidates=searchable;return queryCandidates;}if(query===lastQuery)return queryCandidates;
  var source=lastQuery&&query.length>lastQuery.length&&query.indexOf(lastQuery)===0?queryCandidates:searchable,tokens=query.split(' '),next:SearchItem[]=[];
  for(var i=0;i<source.length;i++)if(queryPass(source[i]!.text,query,tokens))next.push(source[i]!);lastQuery=query;queryCandidates=next;return next;
}

/* Actualiza visibilidad y orden sin recrear cards. */
function setEmpty(total:number):void{if(!resultsNode||!emptyNode)return;if(total===0){resultsNode.hidden=false;emptyNode.hidden=false;}else{emptyNode.hidden=true;resultsNode.hidden=true;}}
function setHidden(node:HTMLElement|null,hidden:boolean,stateOwner:SearchGroup|SearchSegment,stateKey:'titleVisible'|'headingVisible'):void{if(!node)return;if(stateKey==='titleVisible'&&'titleVisible' in stateOwner){if(stateOwner.titleVisible===!hidden)return;node.hidden=hidden;stateOwner.titleVisible=!hidden;return;}if(stateKey==='headingVisible'&&'headingVisible' in stateOwner){if(stateOwner.headingVisible===!hidden)return;node.hidden=hidden;stateOwner.headingVisible=!hidden;}}
function orderGroupContent(group:SearchGroup,query:string):void{
  if(!query){for(var i=0;i<group.items.length;i++)group.items[i]!.card.style.removeProperty('order');for(var s=0;s<group.segments.length;s++){var originalSegment=group.segments[s];if(originalSegment&&originalSegment.heading)originalSegment.heading.style.removeProperty('order');}return;}
  var segments=group.segments.filter(function(segment:SearchSegment){return segment.count>0;}).sort(function(a:SearchSegment,b:SearchSegment){return a.bestRank-b.bestRank||a.index-b.index;});
  for(var p=0;p<segments.length;p++){
    var segment=segments[p];if(!segment)continue;var base=1000+(p*1000),items=segment.items.filter(function(item:SearchItem){return item.matchEpoch===epoch;}).sort(function(a:SearchItem,b:SearchItem){return a.rank-b.rank||a.index-b.index;});
    if(segment.heading)segment.heading.style.order=String(base);for(var j=0;j<items.length;j++)items[j]!.card.style.order=String(base+j+1);
  }
}
function reorderHosts(query:string):void{
  for(var h=0;h<hosts.length;h++){
    var host=hosts[h];if(!host)continue;var ordered=query?host.groups.filter(function(group:SearchGroup){return group.count>0;}).sort(function(a:SearchGroup,b:SearchGroup){return a.bestRank-b.bestRank||a.index-b.index;}):host.groups.slice().sort(function(a:SearchGroup,b:SearchGroup){return a.index-b.index;}),signature=(query?'q:':'o:')+ordered.map(function(group:SearchGroup){return group.index;}).join(',');if(signature===host.signature)continue;var fragment=document.createDocumentFragment();for(var i=0;i<ordered.length;i++){var orderedGroup=ordered[i];if(orderedGroup)fragment.appendChild(orderedGroup.node);}if(host.after&&host.after.parentNode===host.parent)host.parent.insertBefore(fragment,host.after);else host.parent.appendChild(fragment);host.signature=signature;
  }
}
function enter(root:HTMLElement):void{if(active)return;active=true;document.body.classList.add(K.catalogSearching);for(var i=0;i<inventory.length;i++){var entry=inventory[i];if(entry)entry.visible=!entry.wasHidden;}for(var g=0;g<groups.length;g++){var group=groups[g];if(group)group.visible=!group.wasHidden;}visibleItems=searchable.slice();}
function apply(root:HTMLElement,value:unknown):void{
  var query=normalize(value),mask=filterMask(),hasMode=!!query||mask!==0,key=query+'|'+mask;if(key===lastState)return;
  if(!hasMode){lastState=key;if(active)restore(root,true);else{root.classList.remove('sc-search-has-value');setEmpty(1);if(statusNode)statusNode.textContent='';}return;}
  ensureCaptured(root);enter(root);lastState=key;root.classList.toggle('sc-search-has-value',!!query);
  var candidates=candidatesFor(query),tokens=query?query.split(' '):[],nextVisible:SearchItem[]=[],cardChanges:Array<[SearchItem,boolean]>=[],currentEpoch=++epoch,total=0;
  for(var g=0;g<groups.length;g++){var resetGroup=groups[g];if(!resetGroup)continue;resetGroup.count=0;resetGroup.bestRank=99;for(var sg=0;sg<resetGroup.segments.length;sg++){var resetSegment=resetGroup.segments[sg];if(!resetSegment)continue;resetSegment.count=0;resetSegment.bestRank=99;}}
  for(var i=0;i<candidates.length;i++){
    var item=candidates[i];if(!item)continue;if(!filtersPass(item,mask))continue;var rank=rankOf(item,query,tokens);if(rank<0)continue;item.rank=rank;item.matchEpoch=currentEpoch;nextVisible.push(item);item.group.count++;item.group.bestRank=Math.min(item.group.bestRank,rank);item.segment.count++;item.segment.bestRank=Math.min(item.segment.bestRank,rank);total++;
  }
  for(var p=0;p<visibleItems.length;p++){var previous=visibleItems[p];if(!previous)continue;if(previous.matchEpoch!==currentEpoch&&previous.visible)cardChanges.push([previous,false]);}
  for(var n=0;n<nextVisible.length;n++){var next=nextVisible[n];if(!next)continue;if(!next.visible)cardChanges.push([next,true]);}
  for(var c=0;c<cardChanges.length;c++){var change=cardChanges[c];if(!change)continue;change[0].card.hidden=!change[1];change[0].visible=change[1];}
  for(var gi=0;gi<groups.length;gi++){
    var group=groups[gi];if(!group)continue;var show=!group.wasHidden&&group.count>0;if(group.visible!==show){group.node.hidden=!show;group.visible=show;}if(!show)continue;
    if(group.titleNode)setHidden(group.titleNode,false,group,'titleVisible');
    for(var si=0;si<group.segments.length;si++){var segment=group.segments[si];if(!segment)continue;if(segment.heading)setHidden(segment.heading,segment.count===0,segment,'headingVisible');}
    orderGroupContent(group,query);
  }
  reorderHosts(query);visibleItems=nextVisible;setEmpty(total);if(statusNode)statusNode.textContent=total===1?'1 producto encontrado':total+' productos encontrados';
}

/* Restaura el catálogo exactamente a su estado capturado. */
function scheduleRestoreRefresh():void{requestAnimationFrame(function(){if(SC.categoryNav&&SC.categoryNav.refreshMetrics)SC.categoryNav.refreshMetrics();if(C.view&&C.view.refreshLayout)C.view.refreshLayout(null);});}
function restore(root:HTMLElement|null,refresh:boolean):void{
  for(var i=0;i<inventory.length;i++){var item=inventory[i];if(!item)continue;var show=!item.wasHidden;if(item.visible!==show)item.card.hidden=item.wasHidden;item.visible=show;item.matchEpoch=0;item.rank=99;item.card.style.removeProperty('order');}
  for(var g=0;g<groups.length;g++){
    var group=groups[g];if(!group)continue;var groupShow=!group.wasHidden;if(group.visible!==groupShow)group.node.hidden=group.wasHidden;group.visible=groupShow;group.count=0;group.bestRank=99;if(group.titleNode){group.titleNode.hidden=group.titleWasHidden;group.titleVisible=!group.titleWasHidden;group.titleNode.style.removeProperty('order');}
    for(var s=0;s<group.segments.length;s++){var segment=group.segments[s];if(!segment)continue;segment.count=0;segment.bestRank=99;if(segment.heading){segment.heading.hidden=segment.headingWasHidden;segment.headingVisible=!segment.headingWasHidden;segment.heading.style.removeProperty('order');}}
  }
  reorderHosts('');active=false;lastState='';lastQuery='';queryCandidates=searchable;visibleItems=searchable.slice();document.body.classList.remove(K.catalogSearching);if(root)root.classList.remove('sc-search-has-value');setEmpty(1);if(statusNode)statusNode.textContent='';if(refresh)scheduleRestoreRefresh();
}

/* Control de limpiar y filtros de rasgos. */
function syncClear():void{if(clearNode)clearNode.hidden=!(installedInput&&installedInput.value);}
function clearSearch(root:HTMLElement,focusInput:boolean):void{if(!installedInput)return;installedInput.value='';lastState='';apply(root,'');syncClear();if(focusInput)installedInput.focus();}
function filterKey(box:HTMLElement):string{var icon=box.querySelector<HTMLElement>('[data-sc-trait]'),key=icon&&normalize(icon.getAttribute('data-sc-trait'));if(key)return key;var label=box.querySelector<HTMLElement>('.ref_label');return traitFromLegacy(label&&label.textContent);}
function syncFilterButtons(root:HTMLElement):void{U.each(root.querySelectorAll<HTMLElement>('[data-sc-filter]'),function(button:HTMLElement){var key=button.getAttribute('data-sc-filter')||'',on=activeFilters.has(key);button.setAttribute('aria-pressed',on?'true':'false');button.classList.toggle('is-active',on);});}
function ensureFilters(root:HTMLElement):void{var strip=root.querySelector<HTMLElement>('.referencias_picor.sc-trait-reference-strip');if(!strip)return;U.each(strip.querySelectorAll<HTMLElement>('[data-sc-filter="discount"],.sc-filter-chip--discount'),function(node:HTMLElement){if(node.parentNode)node.parentNode.removeChild(node);});U.each(strip.querySelectorAll<HTMLElement>('.refBox'),function(box:HTMLElement){var key=filterKey(box),labelNode=box.querySelector<HTMLElement>('.ref_label');if(SPICE_FILTERS.indexOf(key)<0&&key!=='vegetariano')return;var filterLabel=FILTER_LABELS[key];if(labelNode&&filterLabel)labelNode.textContent=filterLabel;box.classList.add('sc-filter-chip');box.setAttribute('data-sc-filter',key);box.setAttribute('role','button');box.setAttribute('tabindex','0');box.setAttribute('aria-pressed','false');box.setAttribute('aria-label','Filtrar por '+(FILTER_LABELS[key]||key));});syncFilterButtons(root);}
function handleFilter(root:HTMLElement,target:EventTarget|null):boolean{var element=target instanceof Element?target:null,chip=element?element.closest<HTMLElement>('[data-sc-filter]'):null;if(!chip||!root.contains(chip))return false;var key=chip.getAttribute('data-sc-filter');if(!key)return false;if(activeFilters.has(key))activeFilters.delete(key);else activeFilters.add(key);syncFilterButtons(root);lastState='';apply(root,installedInput&&installedInput.value||'');return true;}

/* Instala listeners; la búsqueda vive solo en memoria. */
function destroy():void{
  if(installedInput&&onInput)installedInput.removeEventListener('input',onInput);if(installedInput&&onKeyDown)installedInput.removeEventListener('keydown',onKeyDown);if(installedRoot&&onRootClick)installedRoot.removeEventListener('click',onRootClick);if(installedRoot&&onRootKeyDown)installedRoot.removeEventListener('keydown',onRootKeyDown);if(active)restore(installedRoot,false);else document.body&&document.body.classList.remove(K.catalogSearching);
  installedRoot=null;installedInput=null;clearNode=null;statusNode=null;resultsNode=null;emptyNode=null;onInput=null;onKeyDown=null;onRootClick=null;onRootKeyDown=null;inventory=[];searchable=[];groups=[];hosts=[];visibleItems=[];queryCandidates=[];lastQuery='';lastState='';captured=false;activeFilters.clear();
}
function install(root:HTMLElement):()=>void{
  destroy();var input=root.querySelector<HTMLInputElement>('.sc-catalog-search-input');if(!input)return function(){};var inputNode=input;installedRoot=root;installedInput=inputNode;clearNode=root.querySelector<HTMLElement>('.sc-catalog-search-clear');statusNode=root.querySelector<HTMLElement>('.sc-catalog-search-status');resultsNode=root.querySelector<HTMLElement>('.sc-catalog-search-results');emptyNode=root.querySelector<HTMLElement>('.sc-catalog-search-empty-message');U.each(root.querySelectorAll<HTMLElement>('.sc-sort-control'),function(node:HTMLElement){if(node.parentNode)node.parentNode.removeChild(node);});
  onInput=function(){lastState='';apply(root,inputNode.value);syncClear();};
  onKeyDown=function(event:KeyboardEvent){if(event.key!=='Escape'||!inputNode.value)return;event.preventDefault();clearSearch(root,true);};
  onRootClick=function(event:MouseEvent){var target=event.target instanceof Element?event.target:null,clear=target?target.closest<HTMLElement>('.sc-catalog-search-clear'):null;if(clear&&root.contains(clear)){event.preventDefault();event.stopPropagation();clearSearch(root,true);return;}if(handleFilter(root,event.target))event.preventDefault();};
  onRootKeyDown=function(event:KeyboardEvent){var target=event.target instanceof Element?event.target:null,chip=target?target.closest<HTMLElement>('[data-sc-filter]'):null;if(chip&&(event.key==='Enter'||event.key===' ')){event.preventDefault();handleFilter(root,chip);}};
  inputNode.addEventListener('input',onInput);inputNode.addEventListener('keydown',onKeyDown);root.addEventListener('click',onRootClick);root.addEventListener('keydown',onRootKeyDown);
  syncClear();requestAnimationFrame(function(){if(installedRoot!==root)return;ensureFilters(root);syncClear();});return function(){if(installedRoot===root)destroy();};
}
C.search={install:install,apply:apply,destroy:destroy,getFilters:function():string[]{return Array.from(activeFilters);}};
})();