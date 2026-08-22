import type { Cleanup } from '../../core/types.js';
import { queries, selectors } from '../../core/variables.js';
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

const INITIAL_WORK = {
  batchSize: 10,
  frameBudgetMs: 5,
  idleTimeoutMs: 1200,
  fallbackDelayMs: 32,
  desktopCriticalCards: 8,
  compactCriticalCards: 4,
} as const;

class ProductCardController {
  #cardObserver: MutationObserver | null = null;
  #resizeObserver: ResizeObserver | null = null;
  #resizeFallback = false;
  #cardFrame = 0;
  #initialIdle = 0;
  #initialTimer = 0;
  #initialQueue: HTMLElement[] = [];
  #initialDone = false;
  #initialized = false;

  initialize(): Cleanup {
    if (this.#initialized) return this.destroy;
    this.#initialized = true;
    ready(this.#startIncrementalEnhancement);
    queries.desktop.addEventListener('change', this.#onBreakpointChange);
    return this.destroy;
  }

  destroy = (): void => {
    if (!this.#initialized) return;
    this.#initialized = false;
    this.#cardObserver?.disconnect();
    this.#cardObserver = null;
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    if (this.#resizeFallback) {
      globalThis.removeEventListener('resize', scheduleDescriptionMeasure);
      this.#resizeFallback = false;
    }
    if (this.#cardFrame) cancelAnimationFrame(this.#cardFrame);
    this.#cardFrame = 0;
    this.#cancelInitialWork();
    cancelDescriptionMeasure();
    queries.desktop.removeEventListener('change', this.#onBreakpointChange);
  };

  refresh = (): void => {
    enhanceHeadingLevels();
    installTraitReferences();
    document.querySelectorAll<HTMLElement>(selectors.productCards).forEach(this.#enhanceCard);
    scheduleDescriptionMeasure();
    motion.refresh(60);
  };

  repair = (): void => {
    if (!this.#initialized || this.#cardFrame) return;
    this.#cardFrame = requestAnimationFrame(() => {
      this.#cardFrame = 0;
      if (this.#initialized) this.refresh();
    });
  };

  #enhanceCard = (card: HTMLElement | null | undefined): void => {
    if (!card) return;
    const link = card.querySelector<HTMLElement>(selectors.productLink);
    if (link) {
      installFlavorRow(link);
      enhanceCardLink(link);
    }
    ensureDescriptionCopy(card);
  };

  #observeCards(): void {
    const container = document.querySelector<HTMLElement>(selectors.container);
    if (!container || this.#cardObserver) return;
    this.#cardObserver = new MutationObserver((records) => {
      const containsCard = records.some((record) => [...record.addedNodes].some((node) =>
        node instanceof Element
        && (node.matches(selectors.productCard) || Boolean(node.querySelector(selectors.productCard))),
      ));
      if (containsCard) this.repair();
    });
    this.#cardObserver.observe(container, { childList: true, subtree: true });
  }

  #observeResize(): void {
    const container = document.querySelector<HTMLElement>(selectors.container);
    if (!container) return;

    if (typeof ResizeObserver !== 'undefined') {
      this.#resizeObserver = new ResizeObserver(scheduleDescriptionMeasure);
      this.#resizeObserver.observe(container);
      return;
    }
    if (!this.#resizeFallback) {
      this.#resizeFallback = true;
      globalThis.addEventListener('resize', scheduleDescriptionMeasure);
    }
  }

  #finishInitialWork(): void {
    if (this.#initialDone || !this.#initialized) return;
    this.#initialDone = true;
    this.#observeCards();
    this.#observeResize();
    scheduleDescriptionMeasure();
  }

  #cancelInitialWork(): void {
    if (this.#initialIdle && window.cancelIdleCallback) window.cancelIdleCallback(this.#initialIdle);
    if (this.#initialTimer) clearTimeout(this.#initialTimer);
    this.#initialIdle = 0;
    this.#initialTimer = 0;
    this.#initialQueue = [];
  }

  #scheduleInitialBatch(): void {
    if (!this.#initialized || this.#initialIdle || this.#initialTimer) return;
    if (window.requestIdleCallback) {
      this.#initialIdle = window.requestIdleCallback(this.#runInitialBatch, {
        timeout: INITIAL_WORK.idleTimeoutMs,
      });
    } else {
      this.#initialTimer = window.setTimeout(
        () => this.#runInitialBatch(),
        INITIAL_WORK.fallbackDelayMs,
      );
    }
  }

  #runInitialBatch = (deadline: IdleDeadline | null = null): void => {
    this.#initialIdle = 0;
    this.#initialTimer = 0;
    if (!this.#initialized) return;

    const start = performance.now();
    let count = 0;
    while (this.#initialQueue.length && count < INITIAL_WORK.batchSize) {
      if (deadline && deadline.timeRemaining() < 1 && !deadline.didTimeout) break;
      if (performance.now() - start > INITIAL_WORK.frameBudgetMs) break;
      this.#enhanceCard(this.#initialQueue.shift());
      count += 1;
    }

    if (this.#initialQueue.length) this.#scheduleInitialBatch();
    else this.#finishInitialWork();
  };

  #startIncrementalEnhancement = (): void => {
    if (!this.#initialized) return;
    this.#initialDone = false;
    enhanceHeadingLevels();
    installTraitReferences();
    this.#initialQueue = [...document.querySelectorAll<HTMLElement>(selectors.productCard)];

    let critical = queries.desktop.matches
      ? INITIAL_WORK.desktopCriticalCards
      : INITIAL_WORK.compactCriticalCards;
    while (this.#initialQueue.length && critical > 0) {
      this.#enhanceCard(this.#initialQueue.shift());
      critical -= 1;
    }

    if (this.#initialQueue.length) this.#scheduleInitialBatch();
    else this.#finishInitialWork();
  };

  #onBreakpointChange = (): void => {
    if (this.#initialized) this.refresh();
  };
}

const productCards = new ProductCardController();

export function refreshProductCards(): void {
  productCards.refresh();
}

export function repairProductCards(): void {
  productCards.repair();
}

export function initializeProductCards(): Cleanup {
  return productCards.initialize();
}

export const productCard = Object.freeze({
  imageSource,
  traitLabels,
  buildTraitGroup,
  enhanceProductLinks,
  refresh: refreshProductCards,
  repair: repairProductCards,
  init: initializeProductCards,
});
