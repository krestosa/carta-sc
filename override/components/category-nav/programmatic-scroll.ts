import { scrollState } from '../../core/state.js';
import { motionTokens } from '../../core/variables.js';
import { motion } from '../../motion/main.js';
import type { MotionHandle } from '../../motion/types.js';
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

export class ProgrammaticCategoryScroll {
  readonly #callbacks: ProgrammaticScrollCallbacks;
  #frame = 0;
  #move: MotionHandle | null = null;
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
    if (plan.instant) {
      window.scrollTo(0, categoryTargetY(target));
      this.#finish(token, target);
      return;
    }
    this.#animate(target, token, plan.y);
  }

  interrupt(): void {
    if (scrollState.programmatic) this.cancel(true);
  }

  cancel(userInterrupt: boolean): void {
    this.#token += 1;
    this.#move?.cancel();
    this.#move = null;
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

  #animate(target: HTMLElement, token: number, destination: number): void {
    const startY = currentPageY();
    this.#move = motion.engine.tween(
      motionTokens.durations.medium1,
      'quad.inout',
      (progress) => {
        if (token !== this.#token) return;
        if (categoryOffsetIsDirty()) destination = targetYFromOffset(target);
        window.scrollTo(0, startY + (destination - startY) * progress);
      },
      {
        onComplete: () => {
          if (token !== this.#token) return;
          this.#move = null;
          this.#finish(token, target);
        },
      },
    );
  }
}
