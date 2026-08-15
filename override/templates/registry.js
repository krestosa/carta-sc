(function(){
'use strict';
var SC=window.SCOverride=window.SCOverride||{},C=SC.config||{},S=C.selectors||{},A=C.attributes||{};
if(SC.__templateRegistryBooted)return;SC.__templateRegistryBooted=true;
var version=window.__scCatalogAssetVersion||'unversioned';
var base='override/';
var COMPILED_TEMPLATES=null;/*__SC_TEMPLATE_PAYLOAD__*/
/* Keep these source paths literal: the production compiler/validator uses this as the static template manifest. */
var SOURCE_PATHS=[
  'components/product-modal/product-modal.html',
  'components/category-nav/category-nav.html',
  'components/product-card/product-card.html',
  'components/catalog-tools/catalog-tools.html'
];
var store=Object.create(null);
function register(name,markup){if(!name)throw new Error('[SushiClub templates] Template sin nombre');if(store[name])throw new Error('[SushiClub templates] Template duplicado: '+name);var template=document.createElement('template');template.innerHTML=String(markup||'').trim();if(template.content.children.length!==1)throw new Error('[SushiClub templates] '+name+' debe tener un único elemento raíz');store[name]=template;}
function registerDocument(source,path){var doc=new DOMParser().parseFromString(source,'text/html');var templates=doc.querySelectorAll(S.templateNode);if(!templates.length)throw new Error('[SushiClub templates] Sin templates en '+path);Array.prototype.forEach.call(templates,function(template){register((template.getAttribute(A.template)||'').trim(),template.innerHTML);});}
function loadSource(path){return fetch(base+path+'?v='+version,{credentials:'same-origin'}).then(function(response){if(!response.ok)throw new Error('[SushiClub templates] No se pudo cargar '+path+' ('+response.status+')');return response.text();}).then(function(source){registerDocument(source,path);});}
function installCompiled(payload){Object.keys(payload||{}).forEach(function(name){register(name,payload[name]);});}
var readyPromise;if(COMPILED_TEMPLATES){installCompiled(COMPILED_TEMPLATES);readyPromise=Promise.resolve();}else{readyPromise=Promise.all(SOURCE_PATHS.map(loadSource)).then(function(){});}
SC.templates={ready:function(){return readyPromise;},has:function(name){return!!store[name];},clone:function(name){var template=store[name];if(!template)throw new Error('[SushiClub templates] Template no disponible: '+name);return template.content.firstElementChild.cloneNode(true);}};
})();
