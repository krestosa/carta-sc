/* GENERATED from tokens/design.tokens.json (DTCG 2025.10). Do not edit manually. */
export const tokenMedia = Object.freeze({
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
} as const);

export const tokenMotion = Object.freeze({
  geometryRefreshDelay: 180,
  durations: Object.freeze({
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
    extraLong4: 1
  }),
  springs: Object.freeze({
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
    indicator: Object.freeze({
      soft: Object.freeze({ stiffness: 500, damping: 1 }),
      firm: Object.freeze({ stiffness: 1000, damping: 1 }),
    }),
    focus: Object.freeze({ stiffness: 1500, damping: 1 }),
  }),
  cssEasings: Object.freeze({
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
    decelerate: 'cubic-bezier(0, 0, 0, 1)',
    linear: 'cubic-bezier(0, 0, 1, 1)'
  }),
} as const);
