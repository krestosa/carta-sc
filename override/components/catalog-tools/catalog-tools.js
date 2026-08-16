(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,CFG=SC&&SC.config,S=CFG&&CFG.selectors,T=SC&&SC.templates,C=SC&&SC.catalogTools;if(!SC||!U||!CFG||!T||!C||SC.__catalogToolsBooted)return;SC.__catalogToolsBooted=true;
var observer=null,repairRaf=0;
function mount(){var container=document.querySelector(S.container);if(!container)return null;var existing=container.querySelector('.sc-catalog-tools');if(existing)return existing;var root=T.clone('catalog-tools'),toolbar=container.querySelector(S.categoryToolbar);if(toolbar&&toolbar.nextSibling)container.insertBefore(root,toolbar.nextSibling);else if(toolbar)container.appendChild(root);else container.insertBefore(root,container.firstChild);if(C.search&&C.search.install)C.search.install(root);if(C.view&&C.view.install)C.view.install(root);document.body.classList.add('sc-catalog-tools-ready');return root;}
function repair(){repairRaf=0;mount();}
function scheduleRepair(){if(!repairRaf)repairRaf=requestAnimationFrame(repair);}
function structural(node){if(!node||node.nodeType!==1)return false;return node.matches(S.container+', '+S.categoryToolbar+', .sc-catalog-tools')||!!(node.querySelector&&node.querySelector(S.container+', '+S.categoryToolbar+', .sc-catalog-tools'));}
function watch(){if(observer||!window.MutationObserver||!document.body)return;observer=new MutationObserver(function(mutations){for(var i=0;i<mutations.length;i++){var mutation=mutations[i],nodes=Array.prototype.concat.call([],Array.from(mutation.addedNodes||[]),Array.from(mutation.removedNodes||[]));if(nodes.some(structural)){scheduleRepair();return;}}});observer.observe(document.body,{childList:true,subtree:true});}
U.ready(function(){mount();watch();});C.mount=mount;C.repair=scheduleRepair;
})();
