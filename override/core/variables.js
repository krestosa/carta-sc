(function(){
'use strict';
var SC=window.SCOverride=window.SCOverride||{},config=SC.config=SC.config||{};
function merged(defaults,current){return Object.assign({},defaults,current||{});}

config.version=window.__scCatalogAssetVersion||config.version||'unversioned';

config.media=merged({
  phone:'(max-width: 640px)',
  mobile:'(max-width: 767px)',
  tablet:'(min-width: 768px) and (max-width: 992px)',
  compact:'(max-width: 992px)',
  compactWide:'(min-width: 641px) and (max-width: 992px)',
  desktop:'(min-width: 993px)',
  reducedMotion:'(prefers-reduced-motion: reduce)'
},config.media);
config.queries=config.queries||{};
['phone','mobile','tablet','compact','compactWide','desktop','reducedMotion'].forEach(function(name){
  if(!config.queries[name])config.queries[name]=window.matchMedia(config.media[name]);
});
config.desktopQuery=config.queries.desktop;

config.urls=merged({
  cart:'https://www.sushiclub.com.ar/shop_init.php',
  gsap:'https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js',
  scrollTrigger:'https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/ScrollTrigger.min.js',
  scrollTo:'https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/ScrollToPlugin.min.js',
  splitText:'https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/SplitText.min.js'
},config.urls);

config.selectors=merged({
  container:'.containerShop',
  productList:'.listadoShop',
  productCard:'.productoShop',
  productCards:'.listadoShop .productoShop',
  productLink:'a.fancyboxModalAddProd',
  productTitle:'.title-shop1',
  productDescription:'.descrip',
  productTraits:'.sabores',
  sectionTitle:'.titleShopSeccion',
  sectionSubtitle:'.subTitleShopSeccion',
  categoryLink:'a.anchorLink, a.anchorLinkSub',
  categoryParentLink:'a.anchorLink[href^="#"]',
  categorySelect:'.JSgoMenu',
  categoryToolbar:'.sc-catalog-toolbar',
  categoryScroller:'.sc-catalog-categories',
  categoryMobileWrapper:'.fixedTopShop.wtopShopMenuMobile',
  categoryMobileRail:'.topShopMenuMobile',
  categoryMobileScroller:'.topShopMenuMobileScroller',
  categoryNavList:'.nav-tabsTopShop,.nav-tabs',
  activeCategoryLink:'a.anchorLink.sc-motion-current,a.anchorLink[aria-current="location"]',
  catalogTools:'.sc-catalog-tools',
  catalogSearchResults:'.sc-catalog-search-results',
  productModal:'.sc-product-modal',
  productModalDialog:'.sc-product-modal__dialog',
  productModalClose:'.sc-product-modal__close',
  cartFixed:'.carritoFixed',
  cartTable:'.carritoTable',
  cartContent:'.carritoFixedContent, .carritoBox, .shop_carrito',
  cartBadge:'.shopMenuRightIcon .badge, .shopMenuRightIcon .badget',
  catalogViewToggle:'.sc-catalog-view-toggle',
  sectionMotionTargets:'.listadoShop .titleShopSeccion > div, .listadoShop .subTitleShopSeccion',
  topBar:'.topBar',
  topShop:'.topShop',
  legacyPullDownOpen:'.topPullDown.open',
  legacyMobileOpen:'.topShopMenuMobile._open',
  railArrow:'.sc-rail-arrow'
},config.selectors);

config.classes=merged({
  catalogLayoutReady:'sc-catalog-layout-ready',
  catalogSearching:'sc-catalog-searching',
  firstCatalogSection:'sc-first-catalog-section',
  staticInitialCard:'sc-static-initial-card',
  staticInitialSection:'sc-static-initial-section',
  categoryCurrent:'sc-motion-current',
  productModalOpen:'sc-product-modal-open',
  catalogToolsReady:'sc-catalog-tools-ready',
  searchSource:'sc-search-source',
  searchHasValue:'sc-search-has-value',
  descriptionTruncated:'sc-description-truncated',
  sectionRuleHost:'sc-section-rule-host',
  cartScrollMotion:'sc-cart-scroll-motion',
  overflowLeft:'sc-overflow-left',
  overflowRight:'sc-overflow-right',
  stuck:'sc-is-stuck'
},config.classes);

config.motion=merged({
  refreshDelay:120,
  geometryRefreshDelay:180,
  cartRefreshDelay:80,
  sectionRefreshDelay:60,
  productModalCloseDelay:190,
  legacyHoverRebindDelay:120,
  reducedDuration:.12,
  stableLayoutTimeout:750,
  globalUiDuration:.16
},config.motion);
config.motion.easings=merged({
  out:'power2.out',
  strongOut:'power3.out',
  in:'power2.in',
  inOut:'power2.inOut'
},config.motion.easings);

config.categoryNav=merged({
  offsetGap:12,
  currentMarkOffset:2,
  spyHoldMs:1800,
  programmaticGraceMs:180,
  scrollMinDuration:.72,
  scrollMaxDuration:1.36,
  scrollDistanceScale:2400,
  railStepMin:140,
  railStepRatio:.65,
  centerRatio:.5,
  desktopForwardRatio:.32,
  desktopBackwardRatio:.68,
  stickyTolerance:.5
},config.categoryNav);
config.categoryNav.indicator=merged({
  scrollDecay:13,
  speedFilter:18,
  warpFilter:16,
  epsilonPosition:.06,
  epsilonVelocity:1.4,
  durationBase:.24,
  durationExtra:.18,
  durationDistance:760,
  omegaScale:8,
  minDuration:.12,
  minWidth:6,
  minTravel:18,
  travelWidthRatio:.55,
  railVelocityScale:240,
  speedEnergyScale:520,
  maxWarp:11,
  minWarp:4.5,
  warpWidthRatio:.13,
  directionThreshold:8,
  leadingShare:.92,
  trailingShare:.08,
  settleWarp:.025,
  settleSmoothVelocity:1.2,
  settleScrollVelocity:2,
  maxFrameDelta:.05,
  scrollSampleMin:.003,
  scrollSampleMax:.16,
  scrollVelocityOldWeight:.32,
  scrollVelocityNewWeight:.68,
  scrollWakeMs:90,
  textInsetMax:1.25,
  textInsetRatio:.025
},config.categoryNav.indicator);

config.cart=merged({
  scrollQuickDuration:.14,
  scrollVelocityFloor:55,
  scrollSettleDelay:70,
  listDuration:.18,
  listReducedDuration:.12,
  listStagger:.028,
  listReducedStagger:.018,
  badgeReducedDuration:.12,
  badgePulseUpDuration:.07,
  badgePulseDownDuration:.10,
  badgePulseScale:1.08
},config.cart);
config.cart.profiles=merged({
  mobile:{maxLag:8,velocityScale:.0024},
  tablet:{maxLag:10,velocityScale:.0028},
  desktop:{maxLag:14,velocityScale:.0032}
},config.cart.profiles);

config.productCard=merged({
  initialViewportRatio:.96,
  behindViewportOffset:-20,
  initialDuration:.34,
  initialStagger:.032,
  revealDuration:.34,
  revealStagger:.03,
  batchInterval:.06,
  rescueViewportRatio:1.03,
  rescueBottomOffset:-30,
  rescueOpacityThreshold:.05,
  rescueDuration:.20,
  rescueDelay:900
},config.productCard);
config.productCard.profiles=merged({
  mobile:{batchMax:4,start:'clamp(top 93%)'},
  tablet:{batchMax:6,start:'clamp(top 92%)'},
  desktop:{batchMax:8,start:'clamp(top 91%)'}
},config.productCard.profiles);

config.productModal=merged({
  openBackdropDuration:.14,
  openDialogDuration:.20,
  openDialogDelay:.015,
  closeDialogDuration:.11,
  closeBackdropDuration:.13,
  closeBackdropDelay:.005
},config.productModal);

config.sectionHeading=merged({
  ruleDuration:.72,
  textDuration:.52,
  textStagger:.045,
  triggerStart:'clamp(top 90%)',
  lineOffsetPercent:105
},config.sectionHeading);

config.catalog=merged({
  locale:'es-AR',
  viewStorageVersion:'v2',
  viewModes:{phone:['one','two','list'],tablet:['two','three','four','list'],desktop:['three','four','list']},
  defaultViews:{phone:'one',tablet:'two',desktop:'three'}
},config.catalog);
})();
