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

const durations = Object.freeze({
  short1: 0.05,
  short2: 0.1,
  short3: 0.15,
  short4: 0.2,
  medium1: 0.25,
  medium2: 0.3,
  medium3: 0.35,
  medium4: 0.4,
  long1: 0.45,
  long2: 0.5,
  long3: 0.55,
  long4: 0.6,
  extraLong1: 0.7,
  extraLong2: 0.8,
  extraLong3: 0.9,
  extraLong4: 1,
});

const springs = Object.freeze({
  spatial: Object.freeze({
    fast: Object.freeze({ stiffness: 1400, damping: 0.9 }),
    default: Object.freeze({ stiffness: 700, damping: 0.9 }),
    slow: Object.freeze({ stiffness: 300, damping: 0.9 }),
  }),
  effects: Object.freeze({
    fast: Object.freeze({ stiffness: 3800, damping: 1 }),
    default: Object.freeze({ stiffness: 1600, damping: 1 }),
    slow: Object.freeze({ stiffness: 800, damping: 1 }),
  }),
});

export const motionTokens = Object.freeze({
  geometryRefreshDelay: 180,
  durations,
  springs,
  easings: Object.freeze({
    standard: 'standard',
    accelerate: 'standard.accelerate',
    decelerate: 'standard.decelerate',
    linear: 'linear',
    out: 'standard.decelerate',
    strongOut: 'standard.decelerate',
    in: 'standard.accelerate',
    inOut: 'standard',
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
