import { queries, selectors } from '../../core/variables.js';
import type { Cleanup } from '../../core/types.js';
import { ready } from '../../core/utils.js';
import { motion } from '../../motion/main.js';
import { enhanceCardLink, enhanceHeadingLevels, enhanceProductLinks } from './a11y.js';
import {
  cancelDescriptionMeasure,
  ensureDescriptionCopy,
  installFlavorRow,
  installTraitReferences,
  scheduleDescriptionMeasure,
} from './content.js';
import { buildTraitGroup, imageSource, traitLabels } from './data.js';

const INITIAL_BATCH = 10;
const INITIAL_BUDGET_MS = 5;
const INITIAL_IDLE_TIMEOUT = 1200;

let cardObserver: MutationObserver | null = null;
let resizeObserver: ResizeObserver | null = null;
let resizeFallback = false;
let cardFrame = 0;
let initialIdle = 0;
let initialTimer = 0;
let initialQueue: HTMLElement[] = [];
let initialDone = false;
let initialized = false;

const enhanceCard = (card: HTMLElement | null | undefined): void => {
  if (!card) return;
  const link = card.querySelector<HTMLElement>(selectors.productLink);
  if (link) {
    installFlavorRow(link);
    enhanceCardLink(link);
  }
  ensureDescriptionCopy(card);
};

export const refreshProductCards = (): void => {
  enhanceHeadingLevels();
  installTraitReferences();
  document.querySelectorAll<HTMLElement>(selectors.productCards).forEach(enhanceCard);
  scheduleDescriptionMeasure();
  motion.refresh(60);
};

export const repairProductCards = (): void => {
  if (cardFrame) return;
  cardFrame = requestAnimationFrame(() => {
    cardFrame = 0;
    refreshProductCards();
  });
};

const observeCards = (): void => {
  const container = document.querySelector<HTMLElement>(selectors.container);
  if (!container || cardObserver) return;
  cardObserver = new MutationObserver((records) => {
    const containsCard = records.some((record) => [...record.addedNodes].some((node) =>
      node instanceof Element && (node.matches(selectors.productCard) || Boolean(node.querySelector(selectors.productCard))),
    ));
    if (containsCard) repairProductCards();
  });
  cardObserver.observe(container, { childList: true, subtree: true });
};

const observeResize = (): void => {
  const container = document.querySelector<HTMLElement>(selectors.container);
  if (!container) return;

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(scheduleDescriptionMeasure);
    resizeObserver.observe(container);
    return;
  }
  if (!resizeFallback) {
    resizeFallback = true;
    globalThis.addEventListener('resize', scheduleDescriptionMeasure);
  }
};

const finishInitialWork = (): void => {
  if (initialDone) return;
  initialDone = true;
  observeCards();
  observeResize();
  scheduleDescriptionMeasure();
};

const cancelInitialWork = (): void => {
  if (initialIdle && window.cancelIdleCallback) window.cancelIdleCallback(initialIdle);
  if (initialTimer) clearTimeout(initialTimer);
  initialIdle = 0;
  initialTimer = 0;
  initialQueue = [];
};

const scheduleInitialBatch = (): void => {
  if (!initialized || initialIdle || initialTimer) return;
  if (window.requestIdleCallback) {
    initialIdle = window.requestIdleCallback(runInitialBatch, { timeout: INITIAL_IDLE_TIMEOUT });
  } else {
    initialTimer = window.setTimeout(() => runInitialBatch(), 32);
  }
};

const runInitialBatch = (deadline: IdleDeadline | null = null): void => {
  initialIdle = 0;
  initialTimer = 0;
  if (!initialized) return;

  const start = performance.now();
  let count = 0;
  while (initialQueue.length && count < INITIAL_BATCH) {
    if (deadline && deadline.timeRemaining() < 1 && !deadline.didTimeout) break;
    if (performance.now() - start > INITIAL_BUDGET_MS) break;
    enhanceCard(initialQueue.shift());
    count += 1;
  }

  if (initialQueue.length) scheduleInitialBatch();
  else finishInitialWork();
};

const startIncrementalEnhancement = (): void => {
  initialDone = false;
  enhanceHeadingLevels();
  installTraitReferences();
  initialQueue = [...document.querySelectorAll<HTMLElement>(selectors.productCard)];
  let critical = queries.desktop.matches ? 8 : 4;
  while (initialQueue.length && critical > 0) {
    enhanceCard(initialQueue.shift());
    critical -= 1;
  }
  if (initialQueue.length) scheduleInitialBatch();
  else finishInitialWork();
};

const onBreakpointChange = (): void => {
  if (initialized) refreshProductCards();
};

export const initializeProductCards = (): Cleanup => {
  if (initialized) return () => undefined;
  initialized = true;
  ready(startIncrementalEnhancement);
  queries.desktop.addEventListener('change', onBreakpointChange);

  return () => {
    if (!initialized) return;
    initialized = false;
    cardObserver?.disconnect();
    cardObserver = null;
    resizeObserver?.disconnect();
    resizeObserver = null;
    if (resizeFallback) {
      globalThis.removeEventListener('resize', scheduleDescriptionMeasure);
      resizeFallback = false;
    }
    if (cardFrame) cancelAnimationFrame(cardFrame);
    cardFrame = 0;
    cancelInitialWork();
    cancelDescriptionMeasure();
    queries.desktop.removeEventListener('change', onBreakpointChange);
  };
};

export const productCard = Object.freeze({
  imageSource,
  traitLabels,
  buildTraitGroup,
  enhanceProductLinks,
  refresh: refreshProductCards,
  repair: repairProductCards,
  init: initializeProductCards,
});
