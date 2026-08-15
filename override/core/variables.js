(function(){
'use strict';
var SC=window.SCOverride=window.SCOverride||{};
SC.config=SC.config||{};
SC.config.version=window.__scCatalogAssetVersion||'unversioned';
SC.config.desktopQuery=SC.config.desktopQuery||window.matchMedia('(min-width: 993px)');
SC.config.urls=SC.config.urls||{cart:'https://www.sushiclub.com.ar/shop_init.php'};
SC.config.selectors=SC.config.selectors||{
  productCard:'.productoShop',
  productLink:'a.fancyboxModalAddProd',
  categoryLink:'a.anchorLink, a.anchorLinkSub'
};
})();