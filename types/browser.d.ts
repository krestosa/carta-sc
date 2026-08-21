interface JQuerySlicknavCompat {
  btn?: ArrayLike<HTMLElement>;
}

interface JQueryCollectionCompat {
  [index: number]: Element | undefined;
  find(selector: string): JQueryCollectionCompat;
  first(): JQueryCollectionCompat;
  off(
    events?: string,
    handler?: EventListenerOrEventListenerObject | ((event: Event) => void),
  ): JQueryCollectionCompat;
  on(
    events: string,
    handler: EventListenerOrEventListenerObject | ((event: Event) => void),
  ): JQueryCollectionCompat;
  data(key: string): JQuerySlicknavCompat | undefined;
}

interface JQueryStaticCompat {
  (target: string | Element | Document | EventTarget | null): JQueryCollectionCompat;
}

interface Window {
  jQuery?: JQueryStaticCompat;
  $?: JQueryStaticCompat;
  __scCatalogAssetVersion?: string;
  __scInitialTheme?: string;
  __scRuntimeReady?: number;
  __scAfterRuntime?: Array<() => void>;
  __scLoadRecaptcha?: () => void;
  __scLegacyMainLoaderBooted?: boolean;
}
