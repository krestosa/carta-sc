(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,CFG=SC&&SC.config,S=CFG&&CFG.selectors,T=SC&&SC.templates,C=SC&&SC.catalogTools;if(!SC||!U||!CFG||!T||!C||SC.__catalogToolsBooted)return;SC.__catalogToolsBooted=true;

/* Estado de montaje y limpieza de las herramientas. */
type Cleanup=()=>void;
var observer:MutationObserver|null=null,repairRaf=0,currentRoot:HTMLElement|null=null,cleanSearch:Cleanup|null=null,cleanTheme:Cleanup|null=null,cleanView:Cleanup|null=null,initialized=false;

/* Desmonta listeners antes de reemplazar el root. */
function cleanupRoot(remove:boolean):void{
  if(cleanSearch){cleanSearch();cleanSearch=null;}if(cleanTheme){cleanTheme();cleanTheme=null;}if(cleanView){cleanView();cleanView=null;}
  if(remove&&currentRoot&&currentRoot.parentNode)currentRoot.parentNode.removeChild(currentRoot);currentRoot=null;
}

/* Aplica tema e instala búsqueda/vista sobre el mismo root. */
function seedTheme(root:HTMLElement):HTMLElement{if(root&&C.theme&&C.theme.seed)C.theme.seed(root);return root;}
function install(root:HTMLElement):HTMLElement{
  currentRoot=root;if(SC.productCardContent&&SC.productCardContent.positionTraitReferences)SC.productCardContent.positionTraitReferences();
  cleanSearch=C.search&&C.search.install?C.search.install(root):null;cleanTheme=C.theme&&C.theme.install?C.theme.install(root):null;cleanView=C.view&&C.view.install?C.view.install(root):null;
  document.body.classList.add('sc-catalog-tools-ready');return root;
}

/* Reutiliza el root existente o inserta el template después del riel. */
function mount():HTMLElement|null{
  var container=document.querySelector<HTMLElement>(S.container);if(!container)return null;var existing=container.querySelector<HTMLElement>('.sc-catalog-tools');
  if(existing){if(existing!==currentRoot){cleanupRoot(false);seedTheme(existing);install(existing);}return existing;}if(currentRoot)cleanupRoot(false);
  var root=seedTheme(T.clone('catalog-tools') as HTMLElement),toolbar=container.querySelector<HTMLElement>(S.categoryToolbar);if(toolbar&&toolbar.nextSibling)container.insertBefore(root,toolbar.nextSibling);else if(toolbar)container.appendChild(root);else container.insertBefore(root,container.firstChild);return install(root);
}

/* Repara el montaje si el DOM legacy reemplaza el contenedor. */
function repair():void{repairRaf=0;if(!initialized)return;if(currentRoot&&!document.documentElement.contains(currentRoot))cleanupRoot(false);mount();}
function scheduleRepair():void{if(initialized&&!repairRaf)repairRaf=requestAnimationFrame(repair);}
function structural(node:Node):boolean{if(!node||node.nodeType!==1)return false;var element=node as Element;return element.matches(S.container+', '+S.categoryToolbar+', .sc-catalog-tools')||!!element.querySelector(S.container+', '+S.categoryToolbar+', .sc-catalog-tools');}
function watch():void{if(observer||!window.MutationObserver||!document.body)return;observer=new MutationObserver(function(mutations:MutationRecord[]){for(var i=0;i<mutations.length;i++){var mutation=mutations[i];if(!mutation)continue;var nodes:Node[]=Array.from(mutation.addedNodes).concat(Array.from(mutation.removedNodes));if(nodes.some(structural)){scheduleRepair();return;}}});observer.observe(document.body,{childList:true,subtree:true});}

/* Ciclo público del componente; no persiste scroll ni categoría. */
function init():void{if(initialized)return;initialized=true;mount();watch();}
function destroy():void{
  if(!initialized)return;initialized=false;
  if(observer){observer.disconnect();observer=null;}if(repairRaf){cancelAnimationFrame(repairRaf);repairRaf=0;}cleanupRoot(true);document.body&&document.body.classList.remove('sc-catalog-tools-ready');
}
U.ready(init);C.init=init;C.destroy=destroy;C.mount=mount;C.repair=scheduleRepair;
})();