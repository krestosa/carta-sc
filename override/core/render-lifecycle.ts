import { classes, queries, selectors } from './variables.js';

interface Waiter {
  predicate: () => boolean;
  resolve: () => void;
  timer: number;
  settled: boolean;
}

const STABLE_LAYOUT_TIMEOUT = 900;
const FONT_TIMEOUT = 1100;
const MEDIA_TIMEOUT = 1200;
const MOBILE_HEADER_TIMEOUT = 500;

const waiters: Waiter[] = [];
let waitObserver: MutationObserver | null = null;
let initialViewportObserver: IntersectionObserver | null = null;
let initialViewportStarted = false;
let initialViewportFrozen = false;

const markStaticInitial = (node: Element | null | undefined): void => {
  if (!node) return;
  node.classList.add(classes.staticInitialSection);
  const host = node.matches(selectors.sectionTitle) ? node.querySelector(':scope > div') : node;
  host?.classList.add(classes.staticInitialSection);
};

const applyInitialViewportEntries = (entries: readonly IntersectionObserverEntry[]): void => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    markStaticInitial(entry.target);
    initialViewportObserver?.unobserve(entry.target);
  }
};

export const markInitialViewport = (): void => {
  if (initialViewportFrozen || initialViewportStarted || !('IntersectionObserver' in window)) return;

  const nodes = document.querySelectorAll<Element>(
    `${selectors.productList} ${selectors.sectionTitle},${selectors.productList} ${selectors.sectionSubtitle}`,
  );
  if (!nodes.length) return;

  initialViewportStarted = true;
  initialViewportObserver = new IntersectionObserver(applyInitialViewportEntries, {
    root: null,
    threshold: 0,
  });
  nodes.forEach((node) => initialViewportObserver?.observe(node));
};

export const freezeInitialViewport = (): void => {
  if (initialViewportFrozen) return;
  initialViewportFrozen = true;
  if (!initialViewportObserver) return;
  applyInitialViewportEntries(initialViewportObserver.takeRecords());
  initialViewportObserver.disconnect();
  initialViewportObserver = null;
};

const whenDomReady = (): Promise<void> => {
  if (document.readyState !== 'loading') return Promise.resolve();
  return new Promise((resolve) => {
    document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
  });
};

const withTimeout = (promise: PromiseLike<unknown>, timeoutMs: number): Promise<void> =>
  Promise.race([
    Promise.resolve(promise).then(() => undefined, () => undefined),
    new Promise<void>((resolve) => window.setTimeout(resolve, timeoutMs)),
  ]);

const disconnectWaitObserver = (): void => {
  waitObserver?.disconnect();
  waitObserver = null;
};

const removeWaiter = (waiter: Waiter): void => {
  const index = waiters.indexOf(waiter);
  if (index >= 0) waiters.splice(index, 1);
  if (!waiters.length) disconnectWaitObserver();
};

const finishWaiter = (waiter: Waiter): void => {
  if (waiter.settled) return;
  waiter.settled = true;
  if (waiter.timer) clearTimeout(waiter.timer);
  removeWaiter(waiter);
  waiter.resolve();
};

const evaluateWaiters = (): void => {
  for (const waiter of [...waiters]) {
    if (!waiter.settled && waiter.predicate()) finishWaiter(waiter);
  }
};

const ensureWaitObserver = (): void => {
  if (waitObserver || !('MutationObserver' in window) || !document.documentElement) return;
  waitObserver = new MutationObserver(evaluateWaiters);
  waitObserver.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'src', 'srcset'],
  });
};

const waitFor = (predicate: () => boolean, timeoutMs: number): Promise<void> =>
  new Promise((resolve) => {
    const start = (): void => {
      if (predicate()) {
        resolve();
        return;
      }
      const waiter: Waiter = { predicate, resolve, timer: 0, settled: false };
      waiters.push(waiter);
      ensureWaitObserver();
      waiter.timer = window.setTimeout(() => finishWaiter(waiter), timeoutMs);
    };

    if (document.documentElement) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });
  });

const waitForCatalogLayout = (): Promise<void> => {
  if (!queries.desktop.matches) return Promise.resolve();
  return waitFor(
    () => Boolean(document.body?.classList.contains(classes.catalogLayoutReady)),
    STABLE_LAYOUT_TIMEOUT,
  );
};

const waitForCatalogTools = (): Promise<void> =>
  waitFor(
    () => Boolean(document.body?.classList.contains('sc-catalog-tools-ready')),
    STABLE_LAYOUT_TIMEOUT,
  );

const waitForMobileHeader = (): Promise<void> => {
  if (queries.desktop.matches) return Promise.resolve();
  return waitFor(
    () => Boolean(document.querySelector('body > .slicknav_menu.sc-mobile-main-menu')),
    MOBILE_HEADER_TIMEOUT,
  );
};

const waitForFonts = (): Promise<void> => {
  if (!document.fonts?.ready) return Promise.resolve();
  return withTimeout(document.fonts.ready, FONT_TIMEOUT);
};

const waitForImage = (image: HTMLImageElement | null): Promise<void> => {
  if (!image) return Promise.resolve();
  if (image.complete) {
    if (image.naturalWidth > 0 && typeof image.decode === 'function') {
      return withTimeout(image.decode(), MEDIA_TIMEOUT);
    }
    return Promise.resolve();
  }

  return withTimeout(new Promise<void>((resolve) => {
    const done = (): void => {
      image.removeEventListener('load', done);
      image.removeEventListener('error', done);
      resolve();
    };
    image.addEventListener('load', done, { once: true });
    image.addEventListener('error', done, { once: true });
  }), MEDIA_TIMEOUT);
};

const waitForCriticalMedia = async (): Promise<void> => {
  if (!queries.desktop.matches || !document.documentElement.classList.contains('sc-catalog-prepaint')) return;
  await waitFor(
    () => Boolean(document.querySelector('.bannerShop .imgBannerShop')),
    STABLE_LAYOUT_TIMEOUT,
  );
  await waitForImage(document.querySelector<HTMLImageElement>('.bannerShop .imgBannerShop'));
};

const clearPrepaint = (): void => {
  document.documentElement.classList.remove(
    'sc-catalog-prepaint',
    'sc-banner-media-ready',
    'sc-mobile-logo-ready',
  );
};

const afterLayoutFrame = (): Promise<void> => new Promise((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
});

export const waitForStableLayout = async (): Promise<void> => {
  await whenDomReady();
  const waits = [waitForCatalogLayout(), waitForCatalogTools(), waitForMobileHeader()];
  if (queries.desktop.matches) waits.push(waitForFonts(), waitForCriticalMedia());
  await Promise.all(waits);
  await afterLayoutFrame();
  clearPrepaint();
};

export const renderLifecycle = Object.freeze({
  markInitialViewport,
  freezeInitialViewport,
  waitForStableLayout,
});

export const initializeRenderLifecycle = (): void => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', markInitialViewport, { once: true });
  } else {
    markInitialViewport();
  }
};
