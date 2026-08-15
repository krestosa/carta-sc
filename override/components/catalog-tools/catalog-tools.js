(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,CFG=SC&&SC.config,S=CFG&&CFG.selectors,K=CFG&&CFG.classes,T=SC&&SC.templates,C=SC&&SC.catalogTools;if(!SC||!U||!CFG||!T||!C||SC.__catalogToolsBooted)return;SC.__catalogToolsBooted=true;
function mount(){var container=document.querySelector(S.container);if(!container||container.querySelector(S.catalogTools))return;var root=T.clone('catalog-tools'),toolbar=container.querySelector(S.categoryToolbar);if(toolbar&&toolbar.nextSibling)container.insertBefore(root,toolbar.nextSibling);else if(toolbar)container.appendChild(root);else container.insertBefore(root,container.firstChild);if(C.search&&C.search.install)C.search.install(root);if(C.view&&C.view.install)C.view.install(root);document.body.classList.add(K.catalogToolsReady);}
U.ready(mount);C.mount=mount;
})();
