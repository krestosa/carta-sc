(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,CFG=SC&&SC.config,S=CFG&&CFG.selectors,T=SC&&SC.templates,C=SC&&SC.catalogTools;if(!SC||!U||!CFG||!T||!C||SC.__catalogToolsBooted)return;SC.__catalogToolsBooted=true;
var observer=null,repairRaf=0,currentRoot=null,cleanSearch=null,cleanTheme=null,cleanView=null,initialized=false;
function cleanupRoot(remove){
  if(cleanSearch){cleanSearch();cleanSearch=null;}if(cleanTheme){cleanTheme();cleanTheme=null;}if(cleanView){cleanView();cleanView=null;}
  if(remove&&currentRoot&&currentRoot.parentNode)currentRoot.parentNode.removeChild(currentRoot);
  currentRoot=null;
}
function install(root){currentRoot=root;cleanSearch=C.search&&C.search.install?C.search.install(root):null;cleanTheme=C.theme&&C.theme.install?C.theme.install(root):null;cleanView=C.view&&C.view.install?C.view.install(root):null;if(SC.productCardContent&&SC.productCardContent.positionTraitReferences)SC.productCardContent.positionTraitReferences();document.body.classList.add('sc-catalog-tools-ready');return root;}
function mount(){
  var container=document.querySelector(S.container);if(!container)return null;
  var existing=container.querySelector('.sc-catalog-tools');
  if(existing){if(existing!==currentRoot){cleanupRoot(false);install(existing);}return existing;}
  if(currentRoot)cleanupRoot(false);
  var root=T.clone('catalog-tools'),toolbar=container.querySelector(S.categoryToolbar);if(toolbar&&toolbar.nextSibling)container.insertBefore(root,toolbar.nextSibling);else if(toolbar)container.appendChild(root);else container.insertBefore(root,container.firstChild);return install(root);
}
function repair(){repairRaf=0;if(!initialized)return;if(currentRoot&&!document.documentElement.contains(currentRoot))cleanupRoot(false);mount();}
function scheduleRepair(){if(initialized&&!repairRaf)repairRaf=requestAnimationFrame(repair);}
function structural(node){if(!node||node.nodeType!==1)return false;return node.matches(S.container+', '+S.categoryToolbar+', .sc-catalog-tools')||!!(node.querySelector&&node.querySelector(S.container+', '+S.categoryToolbar+', .sc-catalog-tools'));}
function watch(){if(observer||!window.MutationObserver||!document.body)return;observer=new MutationObserver(function(mutations){for(var i=0;i<mutations.length;i++){var mutation=mutations[i],nodes=Array.prototype.concat.call([],Array.from(mutation.addedNodes||[]),Array.from(mutation.removedNodes||[]));if(nodes.some(structural)){scheduleRepair();return;}}});observer.observe(document.body,{childList:true,subtree:true});}
function init(){if(initialized)return;initialized=true;mount();watch();}
function destroy(){if(!initialized)return;initialized=false;if(observer){observer.disconnect();observer=null;}if(repairRaf){cancelAnimationFrame(repairRaf);repairRaf=0;}cleanupRoot(true);document.body&&document.body.classList.remove('sc-catalog-tools-ready');}
U.ready(init);C.init=init;C.destroy=destroy;C.mount=mount;C.repair=scheduleRepair;
})();
