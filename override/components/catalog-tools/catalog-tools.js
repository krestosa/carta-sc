(function(){
'use strict';
var SC=window.SCOverride,U=SC&&SC.utils,T=SC&&SC.templates,C=SC&&SC.catalogTools;if(!SC||!U||!T||!C||SC.__catalogToolsBooted)return;SC.__catalogToolsBooted=true;
function mount(){var container=document.querySelector('.containerShop');if(!container||container.querySelector('.sc-catalog-tools'))return;var root=T.clone('catalog-tools'),toolbar=container.querySelector('.sc-catalog-toolbar');if(toolbar&&toolbar.nextSibling)container.insertBefore(root,toolbar.nextSibling);else if(toolbar)container.appendChild(root);else container.insertBefore(root,container.firstChild);if(C.search&&C.search.install)C.search.install(root);if(C.view&&C.view.install)C.view.install(root);document.body.classList.add('sc-catalog-tools-ready');}
U.ready(mount);C.mount=mount;
})();
