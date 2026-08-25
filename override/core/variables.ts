// Documenta la responsabilidad de variables dentro de los fundamentos compartidos de la interfaz propia.
import { tokenMedia } from './tokens.generated.js';

const MEDIA = tokenMedia;

export type MediaName = keyof typeof MEDIA;
export type MediaQueries = Readonly<Record<MediaName, MediaQueryList>>;

const mediaEntries = Object.entries(MEDIA) as Array<[MediaName, string]>;

export const media = MEDIA;
export const queries = Object.freeze(
  Object.fromEntries(mediaEntries.map(([name, query]) => [name, window.matchMedia(query)])),
) as MediaQueries;

// Selectores actuales del documento anfitrión del catálogo. Los componentes nuevos conservan sus selectores y clases de estado con su propietario
// en lugar de ampliar este objeto hasta convertirlo en un registro global del sitio.
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
  hostPullDownOpen: '.topPullDown.open',
  hostMobileOpen: '.topShopMenuMobile._open',
});

export const classes = Object.freeze({
  catalogLayoutReady: 'sc-catalog-layout-ready',
  catalogSearching: 'sc-catalog-searching',
  staticInitialSection: 'sc-static-initial-section',
});

export const config = Object.freeze({ media, queries, selectors, classes });
export type RuntimeConfig = typeof config;
