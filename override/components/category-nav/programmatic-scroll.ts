import { scrollState } from '../../core/state.js';
import { CATEGORY_SCROLL } from './config.js';
import {
  categoryOffsetIsDirty,
  categoryScrollPlan,
  categoryTargetY,
  confirmCategoryTarget,
  currentPageY,
  invalidateCategoryOffset,
  targetYFromOffset,
  type ScrollPlan,
} from './scroll-geometry.js';

export interface ProgrammaticScrollCallbacks {
  readonly refreshMetrics: () => void;
  readonly releaseSpyHold: () => void;
  readonly scheduleSpy: () => void;
  readonly confirmTarget?: (target: HTMLElement) => void;
}

function easing(progress: number): number {
  return progress < 0.5 ? 4 * progress ** 3 : 1 - ((-2 * progress + 2) ** 3) / 2;
}

export class ProgrammaticCategoryScroll {
  readonly #callbacks: ProgrammaticScrollCallbacks;
  #frame = 0;
  #token = 0;

  constructor(callbacks: ProgrammaticScrollCallbacks) {
    this.#callbacks = callbacks;
  }

  get active(): boolean {
    return scrollState.programmatic;
  }

  scrollTo(target: HTMLElement, plan: ScrollPlan = categoryScrollPlan(target)): void {
    invalidateCategoryOffset();
    this.cancel(false);
    const token = ++this.#token;
    this.#setProgrammatic(true, false);
    if (plan.duration === 0) {
      window.scrollTo(0, categoryTargetY(target));
      this.#finish(token, target);
      return;
    }
    this.#animate(target, token, plan.duration, plan.y);
  }

  interrupt(): void {
    if (scrollState.programmatic) this.cancel(true);
  }

  cancel(userInterrupt: boolean): void {
    this.#token += 1;
    if (this.#frame) cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    if (!userInterrupt) return;
    this.#setProgrammatic(false, false);
    this.#callbacks.releaseSpyHold();
    this.#callbacks.scheduleSpy();
  }

  #setProgrammatic(active: boolean, grace: boolean): void {
    scrollState.programmatic = active;
    scrollState.suppressRevealUntil = active
      ? Infinity
      : grace
        ? performance.now() + CATEGORY_SCROLL.programmaticGraceMs
        : 0;
  }

  #finish(token: number, target: HTMLElement): void {
    if (token !== this.#token) return;
    this.#frame = requestAnimationFrame(() => {
      if (token !== this.#token) return;
      this.#frame = requestAnimationFrame(() => {
        this.#frame = 0;
        if (token !== this.#token) return;

        const finalY = categoryTargetY(target);
        if (Math.abs(finalY - currentPageY()) > CATEGORY_SCROLL.settleTolerance) {
          window.scrollTo(0, finalY);
        }
        this.#callbacks.refreshMetrics();
        this.#setProgrammatic(false, true);
        this.#callbacks.releaseSpyHold();
        this.#callbacks.scheduleSpy();
        (this.#callbacks.confirmTarget ?? confirmCategoryTarget)(target);
      });
    });
  }

  #animate(target: HTMLElement, token: number, duration: number, destination: number): void {
    const startY = currentPageY();
    const startTime = performance.now();
    const durationMs = duration * 1000;

    const frame = (now: number): void => {
      if (token !== this.#token) return;
      if (categoryOffsetIsDirty()) destination = targetYFromOffset(target);
      const progress = Math.min(1, (now - startTime) / durationMs);
      window.scrollTo(0, startY + (destination - startY) * easing(progress));
      if (progress < 1) {
        this.#frame = requestAnimationFrame(frame);
      } else {
        this.#frame = 0;
        this.#finish(token, target);
      }
    };

    this.#frame = requestAnimationFrame(frame);
  }
}
