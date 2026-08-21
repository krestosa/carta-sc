import { classes } from '../../core/variables.js';
import { scrollState } from '../../core/state.js';
import { categoryLinks, anchorForHref, categoryOffset, CATEGORY_SCROLL } from './core.js';
import { isCategoryIndicatorDirty, markCategoryIndicatorDirty, moveCategoryIndicator } from './indicator.js';
import type { CategoryActiveState } from './active-state.js';

interface SectionMetric {
  readonly node: HTMLElement;
  readonly top: number;
}

const SPY_HOLD_MS = 2200;

export class CategoryScrollSpy {
  readonly #activeState: CategoryActiveState;
  #metrics: SectionMetric[] = [];
  #offset = 0;
  #spyFrame = 0;
  #measureFrame = 0;
  #heldTarget: HTMLElement | null = null;
  #heldUntil = 0;

  constructor(activeState: CategoryActiveState) {
    this.#activeState = activeState;
  }

  hold = (target: HTMLElement | null): void => {
    this.#heldTarget = target;
    this.#heldUntil = target ? performance.now() + SPY_HOLD_MS : 0;
  };

  release = (): void => {
    this.#heldTarget = null;
    this.#heldUntil = 0;
  };

  refresh = (): void => {
    if (this.#locked()) {
      markCategoryIndicatorDirty();
      return;
    }
    if (this.#measureFrame) cancelAnimationFrame(this.#measureFrame);
    this.#measureFrame = requestAnimationFrame(() => {
      this.#measureFrame = requestAnimationFrame(this.#measureMetrics);
    });
  };

  schedule = (): void => {
    if (this.#locked() || (scrollState.programmatic && this.#heldTarget)) return;
    if (!this.#spyFrame) this.#spyFrame = requestAnimationFrame(this.#spy);
  };

  stop(): void {
    if (this.#spyFrame) cancelAnimationFrame(this.#spyFrame);
    if (this.#measureFrame) cancelAnimationFrame(this.#measureFrame);
    this.#spyFrame = 0;
    this.#measureFrame = 0;
    this.#metrics = [];
    this.release();
  }

  current(): HTMLElement | null {
    if (this.#metrics.length === 0) return null;
    const mark = this.#pageY() + this.#offset + CATEGORY_SCROLL.currentMarkOffset;
    let low = 0;
    let high = this.#metrics.length - 1;
    let best = -1;
    while (low <= high) {
      const middle = (low + high) >> 1;
      const item = this.#metrics[middle];
      if (item && item.top <= mark) {
        best = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }
    const item = this.#metrics[best >= 0 ? best : 0];
    if (!item || !document.documentElement.contains(item.node)) {
      this.refresh();
      return null;
    }
    return item.node;
  }

  #locked(): boolean {
    return document.body.classList.contains(classes.catalogSearching);
  }

  #pageY(): number {
    return window.pageYOffset || document.documentElement.scrollTop || 0;
  }

  #measureMetrics = (): void => {
    this.#measureFrame = 0;
    if (this.#locked()) {
      markCategoryIndicatorDirty();
      return;
    }

    const seen = new Set<HTMLElement>();
    const pageY = this.#pageY();
    const metrics: SectionMetric[] = [];
    for (const link of categoryLinks()) {
      const target = anchorForHref(link.getAttribute('href'));
      if (!target || seen.has(target)) continue;
      seen.add(target);
      metrics.push({ node: target, top: target.getBoundingClientRect().top + pageY });
    }
    metrics.sort((a, b) => a.top - b.top);
    this.#metrics = metrics;
    this.#offset = categoryOffset();
    markCategoryIndicatorDirty();
    this.schedule();
  };

  #spy = (): void => {
    this.#spyFrame = 0;
    if (this.#locked()) return;

    const active = this.#activeState.current;
    if (this.#heldTarget && scrollState.programmatic) {
      if (active !== this.#heldTarget) this.#activeState.set(this.#heldTarget, false);
      else if (isCategoryIndicatorDirty()) moveCategoryIndicator(this.#heldTarget, false);
      return;
    }

    const target = this.current();
    if (this.#heldTarget) {
      if (target === this.#heldTarget || performance.now() >= this.#heldUntil) {
        this.release();
      } else {
        if (active && isCategoryIndicatorDirty()) moveCategoryIndicator(active, false);
        return;
      }
    }

    if (target && target !== active) this.#activeState.set(target, true);
    else if (target && isCategoryIndicatorDirty()) moveCategoryIndicator(target, false);
  };
}
