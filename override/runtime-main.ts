/* Orquestador de carga del override. Monta dependencias por etapas, desbloquea motion cuando
   módulos y GSAP están listos y usa la estabilización posterior sólo para refrescar geometría. */
(function(){
'use strict';

if(window.__scOverrideMainBooted)return;
window.__scOverrideMainBooted=true;

type ScriptEntry=[string,string];
type Stage=ScriptEntry[];
type Stages=Stage[];

var version=window.__scCatalogAssetVersion||'unversioned';
var basePath='override/';

/* La primera etapa habilita infraestructura sin esperar la descarga externa de GSAP. */
var foundationStages:Stages=[
  [
    ['features/image-preloader/image-preloader.js','sc-image-preloader-js'],
    ['core/variables.js','sc-override-variables-js'],
    ['core/storage-policy.js','sc-storage-policy-js']
  ],
  [
    ['core/utils.js','sc-override-utils-js'],
    ['core/render-lifecycle.js','sc-override-render-lifecycle-js'],
    ['templates/registry.js','sc-override-template-registry-js'],
    ['motion/main.js','sc-override-motion-js']
  ]
];

/* Módulos que pueden registrarse mientras templates y motion terminan de prepararse. */
var featureStages:Stages=[
  [
    ['motion/global-ui.js','sc-global-ui-motion-js'],
    ['mutations/dom-normalization.js','sc-override-dom-normalization-js'],
    ['mutations/history.js','sc-override-history-js'],
    ['mutations/legacy-category-hover.js','sc-override-category-hover-js'],
    ['components/category-nav/core.js','sc-category-nav-core-js'],
    ['features/content-normalizer/rules.js','sc-content-normalizer-rules-js'],
    ['components/product-card/data.js','sc-product-card-data-js'],
    ['components/section-heading/section-heading.js','sc-section-lines-motion-js'],
    ['components/product-card/reveal-motion.js','sc-product-card-reveal-motion-js'],
    ['components/product-modal/view.js','sc-product-modal-view-js'],
    ['components/product-modal/a11y.js','sc-product-modal-a11y-js'],
    ['components/product-modal/motion.js','sc-product-modal-motion-js'],
    ['components/mobile-header/mobile-header.js','sc-override-mobile-header-js'],
    ['components/cart/list-motion.js','sc-cart-list-motion-js'],
    ['components/cart/scroll-motion.js','sc-cart-scroll-motion-js'],
    ['components/cart/badge-motion.js','sc-cart-badge-motion-js']
  ]
];

/* Dependencias locales: cada grupo se carga en paralelo y los grupos respetan este orden. */
var integrationStages:Stages=[
  [
    ['features/content-normalizer/dom.js','sc-content-normalizer-dom-js'],
    ['components/category-nav/layout.js','sc-category-nav-layout-js'],
    ['components/category-nav/rail-controls.js','sc-category-nav-rail-controls-js'],
    ['components/category-nav/rail-position.js','sc-category-nav-rail-position-js'],
    ['components/category-nav/sticky-state.js','sc-category-nav-sticky-state-js'],
    ['components/category-nav/indicator.js','sc-category-nav-indicator-js'],
    ['components/catalog-tools/search.js','sc-catalog-tools-search-js'],
    ['components/catalog-tools/theme-palette.js','sc-catalog-tools-theme-palette-js'],
    ['components/catalog-tools/view.js','sc-catalog-tools-view-js'],
    ['components/product-card/a11y.js','sc-product-card-a11y-js'],
    ['components/product-card/content.js','sc-product-card-content-js'],
    ['components/product-card/motion.js','sc-product-card-motion-js'],
    ['components/cart/cart.js','sc-override-cart-js']
  ],
  [
    ['components/catalog-tools/theme-controller.js','sc-catalog-tools-theme-controller-js'],
    ['features/content-normalizer/observer.js','sc-content-normalizer-observer-js'],
    ['features/content-normalizer/content-normalizer.js','sc-override-content-normalizer-js'],
    ['components/category-nav/rail.js','sc-category-nav-rail-js'],
    ['components/category-nav/active-state.js','sc-category-nav-active-state-js'],
    ['components/category-nav/scroll-spy.js','sc-category-nav-scroll-spy-js']
  ],
  [
    ['components/category-nav/category-nav.js','sc-override-category-nav-js'],
    ['components/product-card/product-card.js','sc-override-product-card-js'],
    ['components/product-modal/product-modal.js','sc-override-product-modal-js'],
    ['components/catalog-tools/catalog-tools.js','sc-catalog-tools-js']
  ]
];

if(document.documentElement)document.documentElement.classList.add('sc-image-preloader-active');

/* Confirma la vista antes de montar componentes para evitar un primer layout incorrecto. */
(function applyRememberedView():void{
  var modes=['compact','list'],root=document.documentElement,mode='';
  try{
    mode=localStorage.getItem('scCatalogView:v3')||'';
    if(mode==='normal')mode='compact';
    if(modes.indexOf(mode)<0)mode='';
  }catch(_){}
  if(!mode)mode='compact';
  root.setAttribute('data-sc-catalog-view',mode);
  if(document.body)document.body.setAttribute('data-sc-catalog-view',mode);
})();

function assetUrl(path:string):string{return basePath+path+'?v='+version;}

/* Reutiliza un script ya montado y resuelve únicamente cuando terminó de cargar. */
function loadScript(path:string,id:string):Promise<void>{
  return new Promise<void>(function(resolve,reject){
    var existing=id&&document.getElementById(id);
    if(existing instanceof HTMLScriptElement){
      if(existing.dataset.loaded==='true'){resolve();return;}
      existing.addEventListener('load',function():void{resolve();},{once:true});
      existing.addEventListener('error',reject,{once:true});
      return;
    }
    var script=document.createElement('script');
    script.id=id;
    script.src=assetUrl(path);
    script.async=false;
    script.onload=function():void{script.dataset.loaded='true';resolve();};
    script.onerror=reject;
    document.head.appendChild(script);
  });
}

function loadGroup(group:Stage):Promise<void>{
  return Promise.all(group.map(function(entry:ScriptEntry):Promise<void>{return loadScript(entry[0],entry[1]);})).then(function():void{});
}

function loadStages(stages:Stages):Promise<void>{
  return stages.reduce<Promise<void>>(function(chain:Promise<void>,group:Stage):Promise<void>{
    return chain.then(function():Promise<void>{return loadGroup(group);});
  },Promise.resolve());
}

/* Cards y títulos preparan su estado inicial en DOMContentLoaded; no se revela antes. */
function waitForDomReady():Promise<void>{
  if(document.readyState!=='loading')return Promise.resolve();
  return new Promise<void>(function(resolve){
    document.addEventListener('DOMContentLoaded',function():void{resolve();},{once:true});
  });
}

function releaseReveal():void{
  var root=document.documentElement;
  if(!root)return;
  root.setAttribute('data-sc-catalog-reveal-ready','true');
  root.classList.remove('sc-catalog-reveal-prepaint');
}

loadStages(foundationStages)
  .then(function():Promise<void>{return loadStages(featureStages);})
  .then(function():Promise<void>{
    var templates=window.SCOverride&&window.SCOverride.templates;
    if(!templates||!templates.ready)throw Error('Template registry unavailable');
    return templates.ready();
  })
  .then(function():Promise<void>{return loadStages(integrationStages);})
  .then(function():Promise<unknown>|null{
    var motion=window.SCOverride&&window.SCOverride.motion;
    return motion&&motion.prepare?motion.prepare():null;
  })
  .then(function():Promise<void>{return waitForDomReady();})
  .then(function():Promise<void>{
    var runtime=window.SCOverride,lifecycle=runtime.renderLifecycle,motion=runtime.motion;
    lifecycle.markInitialViewport();
    if(lifecycle.freezeInitialViewport)lifecycle.freezeInitialViewport();
    if(motion)motion.unlock();
    releaseReveal();
    return lifecycle.waitForStableLayout();
  })
  .then(function():void{
    var motion=window.SCOverride&&window.SCOverride.motion;
    if(motion&&motion.refresh)motion.refresh(0);
  })
  .catch(function(error:unknown):void{
    releaseReveal();
    if(window.console&&console.error)console.error('[SushiClub override] Error cargando módulos',error);
  });
})();
