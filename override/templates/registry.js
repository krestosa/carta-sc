(function(){
'use strict';
/* Registro único de templates del override. En desarrollo carga fragmentos HTML y en
   producción acepta el payload compilado para clonar nodos sin duplicar markup en JS. */
var SC=window.SCOverride=window.SCOverride||{};
if(SC.__templateRegistryBooted)return;SC.__templateRegistryBooted=true;
var version=window.__scCatalogAssetVersion||'20260817-icons-v3';
var base='override/';
var TEMPLATE_SELECTOR='template[data-sc-template]',TEMPLATE_ATTRIBUTE='data-sc-template';
var COMPILED_TEMPLATES=null;/*__SC_TEMPLATE_PAYLOAD__*/

/* Estas rutas deben permanecer literales porque el compilador las usa como manifiesto estático de templates. */
var SOURCE_PATHS=[
  'components/product-modal/product-modal.html',
  'components/category-nav/category-nav.html',
  'components/product-card/product-card.html',
  'components/catalog-tools/catalog-tools.html'
];
var store=Object.create(null);

/* Valida cada fragmento al registrarlo y exige una única raíz clonable. */
function register(name,markup){if(!name)throw new Error('[SushiClub templates] Template sin nombre');if(store[name])throw new Error('[SushiClub templates] Template duplicado: '+name);var template=document.createElement('template');template.innerHTML=String(markup||'').trim();if(template.content.children.length!==1)throw new Error('[SushiClub templates] '+name+' debe tener un único elemento raíz');store[name]=template;}
function registerDocument(source,path){var doc=new DOMParser().parseFromString(source,'text/html');var templates=doc.querySelectorAll(TEMPLATE_SELECTOR);if(!templates.length)throw new Error('[SushiClub templates] Sin templates en '+path);Array.prototype.forEach.call(templates,function(template){register((template.getAttribute(TEMPLATE_ATTRIBUTE)||'').trim(),template.innerHTML);});}
function loadSource(path){return fetch(base+path+'?v='+version,{credentials:'same-origin'}).then(function(response){if(!response.ok)throw new Error('[SushiClub templates] No se pudo cargar '+path+' ('+response.status+')');return response.text();}).then(function(source){registerDocument(source,path);});}
function installCompiled(payload){Object.keys(payload||{}).forEach(function(name){register(name,payload[name]);});}
var readyPromise;if(COMPILED_TEMPLATES){installCompiled(COMPILED_TEMPLATES);readyPromise=Promise.resolve();}else{readyPromise=Promise.all(SOURCE_PATHS.map(loadSource)).then(function(){});}
SC.templates={ready:function(){return readyPromise;},has:function(name){return!!store[name];},clone:function(name){var template=store[name];if(!template)throw new Error('[SushiClub templates] Template no disponible: '+name);return template.content.firstElementChild.cloneNode(true);}};
})();