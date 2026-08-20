(function(){
'use strict';
/* Registro único de templates del override. En desarrollo carga fragmentos HTML y en
   producción acepta el payload compilado para clonar nodos sin duplicar markup en JS. */
var SC=window.SCOverride=window.SCOverride||{};
if(SC.__templateRegistryBooted)return;SC.__templateRegistryBooted=true;
var version=window.__scCatalogAssetVersion||'20260817-icons-v3';
var base='override/';
var TEMPLATE_SELECTOR='template[data-sc-template]',TEMPLATE_ATTRIBUTE='data-sc-template';
var COMPILED_TEMPLATES:Record<string,string>|null=null;/*__SC_TEMPLATE_PAYLOAD__*/

/* Estas rutas deben permanecer literales porque el compilador las usa como manifiesto estático de templates. */
var SOURCE_PATHS=[
  'components/product-modal/product-modal.html',
  'components/category-nav/category-nav.html',
  'components/product-card/product-card.html',
  'components/catalog-tools/catalog-tools.html'
];
var store:Record<string,HTMLTemplateElement>=Object.create(null);

/* Valida cada fragmento al registrarlo y exige una única raíz clonable. */
function register(name:string,markup:string):void{if(!name)throw new Error('[SushiClub templates] Template sin nombre');if(store[name])throw new Error('[SushiClub templates] Template duplicado: '+name);var template=document.createElement('template');template.innerHTML=String(markup||'').trim();if(template.content.children.length!==1)throw new Error('[SushiClub templates] '+name+' debe tener un único elemento raíz');store[name]=template;}
function registerDocument(source:string,path:string):void{var doc=new DOMParser().parseFromString(source,'text/html');var templates=doc.querySelectorAll<HTMLTemplateElement>(TEMPLATE_SELECTOR);if(!templates.length)throw new Error('[SushiClub templates] Sin templates en '+path);Array.prototype.forEach.call(templates,function(template:HTMLTemplateElement):void{register((template.getAttribute(TEMPLATE_ATTRIBUTE)||'').trim(),template.innerHTML);});}
function loadSource(path:string):Promise<void>{return fetch(base+path+'?v='+version,{credentials:'same-origin'}).then(function(response:Response):Promise<string>{if(!response.ok)throw new Error('[SushiClub templates] No se pudo cargar '+path+' ('+response.status+')');return response.text();}).then(function(source:string):void{registerDocument(source,path);});}
function installCompiled(payload:Record<string,string>|null):void{Object.keys(payload||{}).forEach(function(name:string):void{if(payload){var markup=payload[name];if(markup!==undefined)register(name,markup);}});}
var readyPromise:Promise<void>;if(COMPILED_TEMPLATES){installCompiled(COMPILED_TEMPLATES);readyPromise=Promise.resolve();}else{readyPromise=Promise.all(SOURCE_PATHS.map(loadSource)).then(function():void{});}
SC.templates={ready:function():Promise<void>{return readyPromise;},has:function(name:string):boolean{return!!store[name];},clone:function(name:string):Element{var template=store[name];if(!template)throw new Error('[SushiClub templates] Template no disponible: '+name);var root=template.content.firstElementChild;if(!root)throw new Error('[SushiClub templates] Template vacío: '+name);var clone=root.cloneNode(true);if(!(clone instanceof Element))throw new Error('[SushiClub templates] Clon inválido: '+name);return clone;}};
})();
