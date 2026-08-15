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

config.ids=merged({
  mobileMenu:'menuMobile',
  mobilePrimaryMenu:'sc-mobile-primary-menu',
  gsapCore:'sc-gsap-core',
  gsapScrollTrigger:'sc-gsap-scrolltrigger',
  gsapScrollTo:'sc-gsap-scrollto',
  gsapSplitText:'sc-gsap-splittext'
},config.ids);

config.attributes=merged({
  template:'data-sc-template',
  fallbackToggle:'data-sc-fallback-toggle',
  a11ySync:'data-sc-a11y-sync',
  a11yKey:'data-sc-a11y-key',
  catalogView:'data-sc-catalog-view',
  catalogViewContext:'data-sc-catalog-view-context',
  view:'data-sc-view',
  viewContext:'data-sc-view-context',
  viewIcon:'data-sc-view-icon',
  searchGroupPrototype:'data-sc-search-group-prototype',
  originalTitle:'data-original-title'
},config.attributes);

config.storage=merged({
  catalogViewPrefix:'scCatalogView',
  legacyCatalogDesktop:'scCatalogView:desktop',
  legacyCatalogMobile:'scCatalogView:mobile'
},config.storage);

config.labels=merged({
  categoryNav:'Categorías de la carta',
  mobileMenuOpen:'Abrir menú de navegación',
  mobileMenuClose:'Cerrar menú de navegación',
  mobileMenuTitle:'Menú',
  traitsPrefix:'Características: ',
  currentPricePrefix:'Precio actual: ',
  productStatePrefix:'Estado del producto: ',
  previousPricePrefix:'Precio anterior: ',
  currentPriceMetaPrefix:'Precio actual ',
  productStateMetaPrefix:'Estado ',
  previousPriceMetaPrefix:'Precio anterior ',
  catalogFallbackCategory:'OTROS',
  searchSingleResult:'1 producto encontrado',
  searchResultSuffix:' productos encontrados',
  catalogViews:{
    one:'Vista: una columna. Cambiar vista',
    two:'Vista: dos columnas. Cambiar vista',
    three:'Vista: tres columnas. Cambiar vista',
    four:'Vista: cuatro columnas. Cambiar vista',
    list:'Vista: lista. Cambiar vista'
  },
  bannerOrder:'Pedilo Online — promoción de SushiClub',
  preferredStore:'Espacio preferido',
  newsletterEmail:'Email para newsletter',
  close:'Cerrar',
  cart:'Ver carrito',
  social:{
    facebook:'Facebook de SushiClub',
    instagram:'Instagram de SushiClub',
    tiktok:'TikTok de SushiClub',
    pinterest:'Pinterest de SushiClub'
  }
},config.labels);
config.labels.catalogViews=merged({
  one:'Vista: una columna. Cambiar vista',
  two:'Vista: dos columnas. Cambiar vista',
  three:'Vista: tres columnas. Cambiar vista',
  four:'Vista: cuatro columnas. Cambiar vista',
  list:'Vista: lista. Cambiar vista'
},config.labels.catalogViews);
config.labels.social=merged({
  facebook:'Facebook de SushiClub',
  instagram:'Instagram de SushiClub',
  tiktok:'TikTok de SushiClub',
  pinterest:'Pinterest de SushiClub'
},config.labels.social);

config.prefixes=merged({
  product:'sc-product-',
  productModalTitle:'sc-product-modal-title-',
  railArrowClass:'sc-rail-arrow--'
},config.prefixes);

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
  categoryNavWrapper:'.wrapp-nav-tabsTopShop',
  categorySubLink:'a.anchorLinkSub',
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
  legacyCategoryHoverLinks:'.nav-tabsTopShop .anchorLink',
  categoryListItem:'.nav-top-li',
  railArrow:'.sc-rail-arrow',
  genericImage:'img',
  templateNode:'template[data-sc-template]',
  banner:'.bannerShop',
  bannerImage:'.bannerShop img',
  productMediaImage:'.imgShop img, .imgLiquidNoFillShop img',
  productMediaHost:'.imgShop, .imgLiquidNoFillShop',
  productLegacyControls:'input,.sumar,button',
  productTraitsHost:'.title-shop1 .sabores',
  productTraitImages:'.title-shop1 .sabores img[data-original-title]',
  traitImages:'img[data-original-title]',
  productId:'.producto-id',
  productCurrentPrice:'.priceRow .priceHijass, .priceRow .price',
  productPreviousPrice:'.priceRow .ofertaPrice',
  productA11yMeta:'.sc-card-a11y-meta',
  productFlavors:'.sc-product-flavors',
  slickNavButton:'.slicknav_btn',
  slickNavPanel:'.slicknav_nav',
  slickNavMenu:'.slicknav_menu',
  slickNavMenus:'body > .slicknav_menu',
  mobileBrandImage:'.brandOnlyMobile img',
  categoryDropdown:'.topPullDown,.dropdown-menu',
  categoryLayoutLinks:'.nav-top-li > a.anchorLink',
  cartRow:'tr',
  cartTotalRow:'.total, .subtotal, .ahorro',
  cartBox:'.carritoBox',
  cartShop:'.shop_carrito',
  catalogSearchGroupPrototype:'[data-sc-search-group-prototype]',
  catalogSearchGroupTitle:'.sc-catalog-search-group-title',
  catalogSearchGrid:'.sc-catalog-search-grid',
  catalogSearchStatus:'.sc-catalog-search-status',
  catalogSearchEmpty:'.sc-catalog-search-empty-message',
  catalogSearchInput:'.sc-catalog-search-input',
  catalogViewIcons:'[data-sc-view-icon]',
  productModalImage:'.sc-product-modal__image',
  productModalTitle:'.sc-product-modal__title',
  productModalDescription:'.sc-product-modal__description',
  productModalPriceSlot:'.sc-product-modal__price-slot',
  productModalCartButton:'.sc-product-modal__cart-button',
  productModalSourcePrice:'.priceRow',
  productModalLegacyControls:'.sumar,input,button',
  focusable:'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
  sectionTitleInner:':scope > div',
  contentBold:'b,strong',
  inlineStyle:'[style]',
  nonContent:'script,style',
  legacyCategoryAnchor:'a[name^="anchor"]',
  legacySearchBox:'#busquedaJSBox',
  legacySearchResults:'#busquedaJSBoxResults',
  orderLink:'a[href*="/pedidosonline"]',
  styledProductImage:'.imgShop[style]',
  preferredStoreSelect:'select[name="sucursalNews"]',
  newsletterInput:'input.newsMail',
  legacyCloseButton:'button.close',
  cartLink:'a.shopMenuRightIcon',
  socialFacebook:'a[href*="facebook.com/sushiclubargentina"]',
  socialInstagram:'a[href*="instagram.com/SushiClub_ar"]',
  socialTiktok:'a[href*="tiktok.com/@sushiclub_ar"]',
  socialPinterest:'a[href*="pinterest.com/sushiclub"]'
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
  stuck:'sc-is-stuck',
  mobileMainMenu:'sc-mobile-main-menu',
  slickNavOpen:'slicknav_open',
  slickNavCollapsed:'slicknav_collapsed',
  slickNavHidden:'slicknav_hidden',
  categoryMotionRoot:'sc-category-motion-root',
  productModalTraits:'sc-product-modal__traits sabores',
  productModalPriceRow:'sc-product-modal__price-row',
  sectionTextLine:'sc-section-text-line'
},config.classes);



config.cssProperties=merged({
  sectionRuleScale:'--sc-section-rule-scale'
},config.cssProperties);

config.templates=merged({
  names:{
    productModal:'product-modal',
    categoryToolbar:'category-toolbar',
    categoryArrowPrefix:'category-arrow-',
    categoryIndicator:'category-indicator',
    productCardA11yMeta:'product-card-a11y-meta',
    productTraitGroup:'product-trait-group',
    catalogTools:'catalog-tools'
  },
  sourcePaths:[
    'components/product-modal/product-modal.html',
    'components/category-nav/category-nav.html',
    'components/product-card/product-card.html',
    'components/catalog-tools/catalog-tools.html'
  ]
},config.templates);
config.templates.names=merged({
  productModal:'product-modal',
  categoryToolbar:'category-toolbar',
  categoryArrowPrefix:'category-arrow-',
  categoryIndicator:'category-indicator',
  productCardA11yMeta:'product-card-a11y-meta',
  productTraitGroup:'product-trait-group',
  catalogTools:'catalog-tools'
},config.templates.names);

config.motion=merged({
  refreshDelay:120,
  geometryRefreshDelay:180,
  cartRefreshDelay:80,
  sectionRefreshDelay:60,
  productModalCloseDelay:190,
  legacyHoverRebindDelay:120,
  reducedDuration:.12,
  stableLayoutTimeout:750,
  globalUiDuration:.16,
  globalUiOffsetY:-3
},config.motion);
config.motion.easings=merged({
  out:'power2.out',
  strongOut:'power3.out',
  in:'power2.in',
  inOut:'power2.inOut'
},config.motion.easings);


config.mobileHeader=merged({
  pluginDataKey:'plugin_slicknav',
  repairDelays:[0,60,120,240]
},config.mobileHeader);

config.categoryNav=merged({
  offsetGap:12,
  currentMarkOffset:2,
  spyHoldMs:1800,
  programmaticGraceMs:180,
  scrollMinDuration:.72,
  scrollMaxDuration:1.36,
  scrollDistanceScale:2400,
  scrollDistancePower:.62,
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
  durationPower:.62,
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
  minFrameDelta:.001,
  scrollSampleMin:.003,
  scrollSampleMax:.16,
  scrollVelocityOldWeight:.32,
  scrollVelocityNewWeight:.68,
  scrollWakeMs:90,
  textInsetMax:1.25,
  textInsetRatio:.025
},config.categoryNav.indicator);

config.cart=merged({
  listOffsetY:4,
  scrollQuickDuration:.14,
  scrollVelocityFloor:55,
  scrollSettleDelay:70,
  listDuration:.18,
  listReducedDuration:.12,
  listStagger:.028,
  listReducedStagger:.018,
  badgeReducedDuration:.12,
  badgeReducedOpacity:.72,
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
  resizeWidthTolerance:.5,
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
  openOffsetY:10,
  openScale:.992,
  closeOffsetY:6,
  closeScale:.994,
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
config.catalog.viewModes=merged({
  phone:['one','two','list'],
  tablet:['two','three','four','list'],
  desktop:['three','four','list']
},config.catalog.viewModes);
config.catalog.defaultViews=merged({phone:'one',tablet:'two',desktop:'three'},config.catalog.defaultViews);
})();
