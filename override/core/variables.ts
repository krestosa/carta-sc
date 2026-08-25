import { tokenMedia } from './tokens.generated.js';

const MEDIA = tokenMedia;

export type MediaName = keyof typeof MEDIA;
export type MediaQueries = Readonly<Record<MediaName, MediaQueryList>>;

const mediaEntries = Object.entries(MEDIA) as Array<[MediaName, string]>;

export const media = MEDIA;
export const queries = Object.freeze(
  Object.fromEntries(mediaEntries.map(([name, query]) => [name, window.matchMedia(query)])),
) as MediaQueries;

// Catalog compatibility contracts. New components keep selectors and state classes with their owner
// instead of extending this object into a site-wide registry.
export const selectors = Object.freeze({
  container: '.containerShop',
  productList: '.listadoShop',
  productCard: '.productoShop',
  productCards: '.listadoShop .productoShop',
  productLink: 'a.fancyboxModalAddProd',
  productTitle: '.title-shop1',
  productDescription: '.descrip',
  productTraits: '.sabores',
  sectionTitle: '.titleShopSeccion',
  sectionSubtitle: '.subTitleShopSeccion',
  categoryToolbar: '.sc-catalog-toolbar',
  legacyPullDownOpen: '.topPullDown.open',
  legacyMobileOpen: '.topShopMenuMobile._open',
});

export const classes = Object.freeze({
  catalogLayoutReady: 'sc-catalog-layout-ready',
  catalogSearching: 'sc-catalog-searching',
  staticInitialSection: 'sc-static-initial-section',
});

export const config = Object.freeze({ media, queries, selectors, classes });
export type RuntimeConfig = typeof config;
