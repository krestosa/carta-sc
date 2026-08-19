/* Orquestador de carga del override. Monta dependencias por etapas, desbloquea motion cuando
   módulos y GSAP están listos y usa la estabilización posterior sólo para geometría estable. */
(function(){
'use strict';
if(window.__scOverrideMainBooted)return;window.__scOverrideMainBooted=true;
var version=window.__scCatalogAssetVersion||'unversioned',basePath='override/';

var foundationStages=[
  [['features/image-preloader/image-preloader.js','sc-image-preloader-js'],['core/variables.js','sc-override-variables-js'],['core/storage-policy.js','sc-storage-policy-js']],
  [['core/utils.js','sc-override-utils-js'],['core/render-lifecycle.js','sc-override-render-lifecycle-js'],['templates/registry.js','sc-override-template-registry-js'],['motion/main.js','sc-override-motion-js']],
  [['motion/transition-patterns.js','sc-transition-patterns-js']]
];
var featureStages=[[
  ['mutations/dom-normalization.js','sc-override-dom-normalization-js'],
  ['mutations/history.js','sc-override-history-js'],
  ['mutations/legacy-category-hover.js','sc-override-category-hover-js'],
  ['components/category-nav/core.js','sc-category-nav-core-js'],
  ['features/content-normalizer/rules.js','sc-content-normalizer-rules-js'],
  ['components/product-card/data.js','sc-product-card-data-js'],
  ['components/product-modal/view.js','sc-product-modal-view-js'],
  ['components/product-modal/a11y.js','sc-product-modal-a11y-js'],
  ['components/product-modal/motion.js','sc-product-modal-motion-js'],
  ['components/mobile-header/mobile-header.js','sc-override-mobile-header-js']
]];
var integrationStages=[
  [
    ['features/content-normalizer/dom.js','sc-content-normalizer-dom-js'],
    ['components/category-nav/layout.js','sc-category-nav-layout-js'],
    ['components/category-nav/rail-controls.js','sc-category-nav-rail-controls-js'],
    ['components/category-nav/rail-position.js','sc-category-nav-rail-position-js'],
    ['components/category-nav/sticky-state.js','sc-category-nav-sticky-state-js'],
    ['components/category-nav/indicator.js','sc-category-nav-indicator-js'],
    ['components/catalog-tools/search.js','sc-catalog-tools-search-js'],
    ['components/catalog-tools/view.js','sc-catalog-tools-view-js'],
    ['components/catalog-tools/state-motion.js','sc-catalog-tools-state-motion-js'],
    ['components/product-card/a11y.js','sc-product-card-a11y-js'],
    ['components/product-card/content.js','sc-product-card-content-js']
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
(function applyRememberedView(){var modes=['compact','list'],root=document.documentElement,mode='';try{mode=localStorage.getItem('scCatalogView:v3')||'';if(mode==='normal')mode='compact';if(modes.indexOf(mode)<0)mode='';}catch(_){}if(!mode)mode='compact';root.setAttribute('data-sc-catalog-view',mode);if(document.body)document.body.setAttribute('data-sc-catalog-view',mode);})();
function assetUrl(path){return basePath+path+'?v='+version;}
function loadScript(path,id){return new Promise(function(resolve,reject){var existing=id&&document.getElementById(id);if(existing){if(existing.dataset.loaded==='true'){resolve();return;}existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return;}var script=document.createElement('script');script.id=id;script.src=assetUrl(path);script.async=false;script.onload=function(){script.dataset.loaded='true';resolve();};script.onerror=reject;document.head.appendChild(script);});}
function loadGroup(group){return Promise.all(group.map(function(entry){return loadScript(entry[0],entry[1]);}));}
function loadStages(stages){return stages.reduce(function(chain,group){return chain.then(function(){return loadGroup(group);});},Promise.resolve());}
function waitForDomReady(){if(document.readyState!=='loading')return Promise.resolve();return new Promise(function(resolve){document.addEventListener('DOMContentLoaded',resolve,{once:true});});}
function releaseReveal(){var root=document.documentElement;if(!root)return;root.setAttribute('data-sc-catalog-reveal-ready','true');root.classList.remove('sc-catalog-reveal-prepaint');}

loadStages(foundationStages)
  .then(function(){return loadStages(featureStages);})
  .then(function(){var templates=window.SCOverride&&window.SCOverride.templates;if(!templates||!templates.ready)throw Error('Template registry unavailable');return templates.ready();})
  .then(function(){return loadStages(integrationStages);})
  .then(function(){var motion=window.SCOverride&&window.SCOverride.motion;return motion&&motion.prepare?motion.prepare():null;})
  .then(waitForDomReady)
  .then(function(){var runtime=window.SCOverride,lifecycle=runtime.renderLifecycle,motion=runtime.motion;if(motion)motion.unlock();releaseReveal();return lifecycle.waitForStableLayout();})
  .catch(function(error){releaseReveal();if(window.console&&console.error)console.error('[SushiClub override] Error cargando módulos',error);});
})();