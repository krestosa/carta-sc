export type AssetKind = 'script' | 'link';
export type Externalizer = () => void | Promise<void>;

export interface BundleSource {
  readonly path: string;
  readonly content: string;
}

export interface TagPosition {
  readonly start: number;
  readonly end: number;
}

export const LEGACY_STYLES = [
  '_css_dev/font-awesome.min.css',
  '_css_dev/bootstrap.min.css',
  '_css_dev/fnt-helvlig.css',
  '_css_dev/fontBar.css',
  '_css_dev/jquery.fancybox.css',
  '_css_dev/jquery.fancybox-buttons.css',
  '_css_dev/slick.css',
  '_css_dev/slick-theme.css',
  '_css_dev/sweetalert2.min.css',
  '_css_dev/slicknav__q_dd9216b6.css',
  '_css_dev/nyroModal_wkTheme.css',
  '_css_dev/daterangepicker.css',
  '_css_dev/styles.css',
  '_css_dev/styles_newver17.css',
  'css/styles_shop__q_a48cd660.css',
  'css/_aux__q_a48cd660.css',
] as const;

export const LEGACY_SCRIPTS = [
  '_js_dev/modernizr-2.6.1-respond-1.1.0.min.js',
  '_js_dev/jquery.easing.1.3.min.js',
  'js/bootstrap.min.js',
  '_js_dev/jquery.cycle2.min.js',
  '_js_dev/jquery.slicknav.js',
  '_js_dev/jquery.nyroModal.custom.js',
  '_js_dev/jquery.livequery.min.js',
  '_js_dev/jquery.fancybox.js',
  '_js_dev/jquery.fancybox-buttons.js',
  '_js_dev/jquery.fancybox-media.js',
  '_js_dev/moment.min.js',
  '_js_dev/daterangepicker.js',
  '_js_dev/imgLiquid.js',
  '_js_dev/slick.min.js',
  '_js_dev/sweetalert2.min.js',
  '_js_dev/plugins.js',
] as const;

export const SHOP_SCRIPTS = [
  'js/funcionesShop__q_f352afe3.js',
  'js/main_shop__q_a48cd660.js',
] as const;

export const DATE_FLOW_JS = ['_js_dev/moment.min.js', '_js_dev/daterangepicker.js'] as const;
export const DATE_FLOW_CSS = ['_css_dev/daterangepicker.css'] as const;
