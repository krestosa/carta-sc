import { classes, queries, selectors } from './variables.js';

interface Waiter {
  readonly predicate: () => boolean;
  readonly resolve: () => void;
  timer: number;
  settled: boolean;
}

const STABLE_LAYOUT_TIMEOUT = 900;
const FONT_TIMEOUT = 1100;
const MOBILE_HEADER_TIMEOUT = 500;

class PredicateWaitRegistry {
  readonly #waiters: Waiter[] = [];
  #observer: MutationObserver | null = null;

  waitFor(predicate: () => boolean, timeoutMs: number): Promise<void> {
    return new Promise((resolve) => {
      const start = (): void => {
        if (predicate()) {
          resolve();
          return;
        }
        const waiter: Waiter = { predicate, resolve, timer: 0, settled: false };
        this.#waiters.push(waiter);
        this.#ensureObserver();
        waiter.timer = window.setTimeout(() => this.#finish(waiter), timeoutMs);
      };

      if (document.documentElement) start();
      else document.addEventListener('DOMContentLoaded', start, { once: true });
    });
  }

  #ensureObserver(): void {
    if (this.#observer || !('MutationObserver' in window) || !document.documentElement) return;
    this.#observer = new MutationObserver(() => this.#evaluate());
    this.#observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'src', 'srcset'],
    });
  }

  #evaluate(): void {
    for (const waiter of [...this.#waiters]) {
      if (!waiter.settled && waiter.predicate()) this.#finish(waiter);
    }
  }

  #finish(waiter: Waiter): void {
    if (waiter.settled) return;
    waiter.settled = true;
    if (waiter.timer) clearTimeout(waiter.timer);

    const index = this.#waiters.indexOf(waiter);
    if (index >= 0) this.#waiters.splice(index, 1);
    if (this.#waiters.length === 0) {
      this.#observer?.disconnect();
      this.#observer = null;
    }
    waiter.resolve();
  }
}

class InitialViewportTracker {
  #observer: IntersectionObserver | null = null;
  #started = false;
  #frozen = false;

  mark = (): void => {
    if (this.#frozen || this.#started || !('IntersectionObserver' in window)) return;
    const nodes = document.querySelectorAll<Element>(
      `${selectors.productList} ${selectors.sectionTitle},${selectors.productList} ${selectors.sectionSubtitle}`,
    );
    if (!nodes.length) return;

    this.#started = true;
    this.#observer = new IntersectionObserver(this.#apply, { root: null, threshold: 0 });
    nodes.forEach((node) => this.#observer?.observe(node));
  };

  freeze = (): void => {
    if (this.#frozen) return;
    this.#frozen = true;
    if (!this.#observer) return;
    this.#apply(this.#observer.takeRecords());
    this.#observer.disconnect();
    this.#observer = null;
  };

  #apply = (entries: readonly IntersectionObserverEntry[]): void => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      this.#markStatic(entry.target);
      this.#observer?.unobserve(entry.target);
    }
  };

  #markStatic(node: Element | null | undefined): void {
    if (!node) return;
    node.classList.add(classes.staticInitialSection);
    const host = node.matches(selectors.sectionTitle) ? node.querySelector(':scope > div') : node;
    host?.classList.add(classes.staticInitialSection);
  }
}

const waits = new PredicateWaitRegistry();
const initialViewport = new InitialViewportTracker();

function whenDomReady(): Promise<void> {
  if (document.readyState !== 'loading') return Promise.resolve();
  return new Promise((resolve) => {
    document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
  });
}

function withTimeout(promise: PromiseLike<unknown>, timeoutMs: number): Promise<void> {
  return Promise.race([
    Promise.resolve(promise).then(() => undefined, () => undefined),
    new Promise<void>((resolve) => window.setTimeout(resolve, timeoutMs)),
  ]);
}

function waitForCatalogLayout(): Promise<void> {
  if (!queries.desktop.matches) return Promise.resolve();
  return waits.waitFor(
    () => Boolean(document.body?.classList.contains(classes.catalogLayoutReady)),
    STABLE_LAYOUT_TIMEOUT,
  );
}

function waitForCatalogTools(): Promise<void> {
  return waits.waitFor(
    () => Boolean(document.body?.classList.contains('sc-catalog-tools-ready')),
    STABLE_LAYOUT_TIMEOUT,
  );
}

function waitForMobileHeader(): Promise<void> {
  if (queries.desktop.matches) return Promise.resolve();
  return waits.waitFor(
    () => Boolean(document.querySelector('body > .slicknav_menu.sc-mobile-main-menu')),
    MOBILE_HEADER_TIMEOUT,
  );
}

function waitForFonts(): Promise<void> {
  if (!document.fonts?.ready) return Promise.resolve();
  return withTimeout(document.fonts.ready, FONT_TIMEOUT);
}

function afterLayoutFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export const markInitialViewport = initialViewport.mark;
export const freezeInitialViewport = initialViewport.freeze;

export async function waitForStableLayout(): Promise<void> {
  await whenDomReady();
  const pending = [waitForCatalogLayout(), waitForCatalogTools(), waitForMobileHeader()];
  if (queries.desktop.matches) pending.push(waitForFonts());
  await Promise.all(pending);
  await afterLayoutFrame();
  window.dispatchEvent(new CustomEvent('sc:layoutstable'));
}

export const renderLifecycle = Object.freeze({
  markInitialViewport,
  freezeInitialViewport,
  waitForStableLayout,
});

export function initializeRenderLifecycle(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', markInitialViewport, { once: true });
  } else {
    markInitialViewport();
  }
}
