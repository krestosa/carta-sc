interface JQuerySlicknavBridge {
  btn?: ArrayLike<HTMLElement>;
}

interface JQueryCollectionBridge {
  [index: number]: Element | undefined;
  find(selector: string): JQueryCollectionBridge;
  first(): JQueryCollectionBridge;
  off(
    events?: string,
    handler?: EventListenerOrEventListenerObject | ((event: Event) => void),
  ): JQueryCollectionBridge;
  on(
    events: string,
    handler: EventListenerOrEventListenerObject | ((event: Event) => void),
  ): JQueryCollectionBridge;
  data(key: string): JQuerySlicknavBridge | undefined;
}

interface JQueryStaticBridge {
  (target: string | Element | Document | EventTarget | null): JQueryCollectionBridge;
}

interface Window {
  jQuery?: JQueryStaticBridge;
  $?: JQueryStaticBridge;
}
