(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,CFG=SC&&SC.config,S=CFG&&CFG.selectors,T=SC&&SC.templates,C=SC&&SC.catalogTools;if(!SC||!U||!CFG||!T||!C||SC.__catalogToolsBooted)return;SC.__catalogToolsBooted=true;
var observer=null,repairRaf=0,currentRoot=null,cleanSearch=null,cleanTheme=null,cleanView=null,initialized=false,sessionTimer=0,restoreRaf=0,sessionRestored=false;
var SESSION_KEY='scCatalogSession:v1:'+(location.pathname||'/')+(location.search||'');
function currentCategory(){var link=document.querySelector('.sc-catalog-toolbar a[aria-current="location"],.wtopShopMenuMobile a[aria-current="location"],.sc-catalog-toolbar a.sc-motion-current,.wtopShopMenuMobile a.sc-motion-current');return link&&link.getAttribute('href')||'';}
function saveSession(){
  sessionTimer=0;if(!initialized)return;try{sessionStorage.setItem(SESSION_KEY,JSON.stringify({y:Math.max(0,window.scrollY||window.pageYOffset||0),category:currentCategory(),path:(location.pathname||'/')+(location.search||''),time:Date.now()}));}catch(_){}
}
function scheduleSessionSave(){if(sessionTimer)return;sessionTimer=window.setTimeout(saveSession,140);}
function readSession(){try{var raw=sessionStorage.getItem(SESSION_KEY),data=raw&&JSON.parse(raw);if(!data||data.path!==(location.pathname||'/')+(location.search||''))return null;return data;}catch(_){return null;}}
function restoreSession(){
  if(sessionRestored)return;sessionRestored=true;var data=readSession();if(!data)return;
  var restore=function(){
    restoreRaf=0;if(!initialized)return;var y=Number(data.y);if(Number.isFinite(y)){window.scrollTo(0,Math.max(0,y));requestAnimationFrame(function(){if(initialized)window.scrollTo(0,Math.max(0,y));});return;}
    if(!data.category||!SC.categoryNav||!SC.categoryNav.resolveAnchor)return;var target=SC.categoryNav.resolveAnchor(data.category);if(!target)return;var top=target.getBoundingClientRect().top+(window.scrollY||window.pageYOffset||0)-(SC.categoryNav.offset?SC.categoryNav.offset():0);window.scrollTo(0,Math.max(0,top));
  };
  restoreRaf=requestAnimationFrame(function(){restoreRaf=requestAnimationFrame(restore);});
}
function cleanupRoot(remove){
  if(cleanSearch){cleanSearch();cleanSearch=null;}if(cleanTheme){cleanTheme();cleanTheme=null;}if(cleanView){cleanView();cleanView=null;}
  if(remove&&currentRoot&&currentRoot.parentNode)currentRoot.parentNode.removeChild(currentRoot);currentRoot=null;
}
function seedTheme(root){if(root&&C.theme&&C.theme.seed)C.theme.seed(root);return root;}
function install(root){
  currentRoot=root;if(SC.productCardContent&&SC.productCardContent.positionTraitReferences)SC.productCardContent.positionTraitReferences();
  cleanSearch=C.search&&C.search.install?C.search.install(root):null;cleanTheme=C.theme&&C.theme.install?C.theme.install(root):null;cleanView=C.view&&C.view.install?C.view.install(root):null;
  document.body.classList.add('sc-catalog-tools-ready');restoreSession();return root;
}
function mount(){
  var container=document.querySelector(S.container);if(!container)return null;var existing=container.querySelector('.sc-catalog-tools');
  if(existing){if(existing!==currentRoot){cleanupRoot(false);seedTheme(existing);install(existing);}return existing;}if(currentRoot)cleanupRoot(false);
  var root=seedTheme(T.clone('catalog-tools')),toolbar=container.querySelector(S.categoryToolbar);if(toolbar&&toolbar.nextSibling)container.insertBefore(root,toolbar.nextSibling);else if(toolbar)container.appendChild(root);else container.insertBefore(root,container.firstChild);return install(root);
}
function repair(){repairRaf=0;if(!initialized)return;if(currentRoot&&!document.documentElement.contains(currentRoot))cleanupRoot(false);mount();}
function scheduleRepair(){if(initialized&&!repairRaf)repairRaf=requestAnimationFrame(repair);}
function structural(node){if(!node||node.nodeType!==1)return false;return node.matches(S.container+', '+S.categoryToolbar+', .sc-catalog-tools')||!!(node.querySelector&&node.querySelector(S.container+', '+S.categoryToolbar+', .sc-catalog-tools'));}
function watch(){if(observer||!window.MutationObserver||!document.body)return;observer=new MutationObserver(function(mutations){for(var i=0;i<mutations.length;i++){var mutation=mutations[i],nodes=Array.prototype.concat.call([],Array.from(mutation.addedNodes||[]),Array.from(mutation.removedNodes||[]));if(nodes.some(structural)){scheduleRepair();return;}}});observer.observe(document.body,{childList:true,subtree:true});}
function init(){if(initialized)return;initialized=true;window.addEventListener('scroll',scheduleSessionSave,{passive:true});window.addEventListener('pagehide',saveSession);mount();watch();}
function destroy(){
  if(!initialized)return;saveSession();initialized=false;window.removeEventListener('scroll',scheduleSessionSave);window.removeEventListener('pagehide',saveSession);
  if(observer){observer.disconnect();observer=null;}if(repairRaf){cancelAnimationFrame(repairRaf);repairRaf=0;}if(restoreRaf){cancelAnimationFrame(restoreRaf);restoreRaf=0;}if(sessionTimer){clearTimeout(sessionTimer);sessionTimer=0;}cleanupRoot(true);document.body&&document.body.classList.remove('sc-catalog-tools-ready');
}
U.ready(init);C.init=init;C.destroy=destroy;C.mount=mount;C.repair=scheduleRepair;
})();