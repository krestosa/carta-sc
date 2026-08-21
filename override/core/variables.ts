const MEDIA = {
  phone: '(max-width: 640px)',
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 992px)',
  compact: '(max-width: 992px)',
  compactWide: '(min-width: 641px) and (max-width: 992px)',
  desktop: '(min-width: 993px)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  reducedTransparency: '(prefers-reduced-transparency: reduce)',
  moreContrast: '(prefers-contrast: more)',
  forcedColors: '(forced-colors: active)',
} as const;

export type MediaName = keyof typeof MEDIA;
export type MediaQueries = Readonly<Record<MediaName, MediaQueryList>>;

const mediaEntries = Object.entries(MEDIA) as Array<[MediaName, string]>;

export const media = MEDIA;
export const queries = Object.freeze(
  Object.fromEntries(mediaEntries.map(([name, query]) => [name, window.matchMedia(query)])),
) as MediaQueries;

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

export const motionTokens = Object.freeze({
  geometryRefreshDelay: 180,
  easings: Object.freeze({
    out: 'cubic.out',
    strongOut: 'quart.out',
    in: 'cubic.in',
    inOut: 'cubic.inOut',
  }),
});

export const config = Object.freeze({
  media,
  queries,
  selectors,
  classes,
  motion: motionTokens,
});

export type RuntimeConfig = typeof config;
