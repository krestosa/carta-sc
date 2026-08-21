import { scrollState } from '../../core/state.js';
import type { Cleanup } from '../../core/types.js';
import { motionTokens, selectors } from '../../core/variables.js';
import { imagePreloader } from '../../features/image-preloader/image-preloader.js';
import type { MotionEngine, MotionHandle, MotionSpringSpec } from '../../motion/types.js';

export interface RevealProfile {
  initialY?: number;
  revealY?: number;
  threshold?: number;
}

interface RevealState {
  prepared: boolean;
  done: boolean;
  started: boolean;
  handles: MotionHandle[];
  observed: boolean;
}

const MOTION = {
  velocityFloor: 180,
  velocityCeil: 2800,
  rowDelay: motionTokens.durations.short1,
  rowDelayMax: motionTokens.durations.short3,
} as const;

class ProductCardRevealController {
  readonly #engine: MotionEngine;
  readonly #profile: RevealProfile;
  readonly #reduce: boolean;
  readonly #cards: HTMLElement[];
  readonly #states = new WeakMap<HTMLElement, RevealState>();

  #observer: IntersectionObserver | null = null;
  #mutationObserver: MutationObserver | null = null;
  #lastY = window.scrollY || window.pageYOffset || 0;
  #lastTime = performance.now();
  #velocity = 0;
  #direction = 1;
  #scrollFrame = 0;

  constructor(engine: MotionEngine, profile: RevealProfile, reduce: boolean) {
    this.#engine = engine;
    this.#profile = profile;
    this.#reduce = reduce;
    this.#cards = [...document.querySelectorAll<HTMLElement>(selectors.productCards)];
  }

  start(): Cleanup {
    if (this.#cards.length === 0) return () => undefined;

    window.addEventListener('scroll', this.#trackScroll, { passive: true });
    this.#createIntersectionObserver();
    this.#cards.forEach(this.#arm);
    this.#observeVisibilityChanges();
    return () => this.destroy();
  }

  destroy(): void {
    window.removeEventListener('scroll', this.#trackScroll);
    if (this.#scrollFrame) cancelAnimationFrame(this.#scrollFrame);
    this.#scrollFrame = 0;
    this.#observer?.disconnect();
    this.#mutationObserver?.disconnect();
    this.#observer = null;
    this.#mutationObserver = null;

    for (const card of this.#cards) {
      this.#stop(card);
      this.#clear(card);
    }
  }

  revealVisibleCards = (): void => {
    for (const card of this.#cards) {
      const state = this.#stateFor(card);
      if (!state.prepared) this.#arm(card);
      if (state.done || state.started || !this.#renderable(card)) continue;

      const rect = card.getBoundingClientRect();
      if (rect.bottom <= 0) {
        this.#finish(card);
      } else if (!this.#observer && rect.top < innerHeight) {
        if (this.#direction < 0 || this.#programmatic()) this.#finish(card);
        else this.#reveal(card, this.#velocity);
      }
    }
  };

  #stateFor(card: HTMLElement): RevealState {
    const existing = this.#states.get(card);
    if (existing) return existing;
    const state: RevealState = {
      prepared: false,
      done: false,
      started: false,
      handles: [],
      observed: false,
    };
    this.#states.set(card, state);
    return state;
  }

  #renderable(card: HTMLElement): boolean {
    return !card.hidden && card.offsetParent !== null && card.getBoundingClientRect().height > 0;
  }

  #programmatic(): boolean {
    return scrollState.programmatic || performance.now() < scrollState.suppressRevealUntil;
  }

  #stop(card: HTMLElement): void {
    const state = this.#stateFor(card);
    for (const handle of state.handles) handle.cancel();
    state.handles = [];
  }

  #clear(card: HTMLElement): void {
    for (const property of ['top', 'opacity', 'visibility', 'will-change']) {
      card.style.removeProperty(property);
    }
  }

  #rowPhase(card: HTMLElement): number {
    const top = card.offsetTop;
    let count = 0;
    let node = card.previousElementSibling;
    while (node) {
      if (node.matches(selectors.productCard)) {
        const sibling = node as HTMLElement;
        if (Math.abs(sibling.offsetTop - top) <= 3) count += 1;
        else break;
      }
      node = node.previousElementSibling;
    }
    return Math.min(count, 5);
  }

  #velocityFactor(speed: number): number {
    return Math.max(
      0,
      Math.min(
        1,
        (Math.abs(speed) - MOTION.velocityFloor) / (MOTION.velocityCeil - MOTION.velocityFloor),
      ),
    );
  }

  #spatialSpring(speed: number): MotionSpringSpec {
    return this.#velocityFactor(speed) >= 0.5
      ? motionTokens.springs.spatial.fast
      : motionTokens.springs.spatial.default;
  }

  #effectsSpring(speed: number): MotionSpringSpec {
    return this.#velocityFactor(speed) >= 0.5
      ? motionTokens.springs.effects.fast
      : motionTokens.springs.effects.default;
  }

  #delayFor(card: HTMLElement, speed: number): number {
    return Math.min(MOTION.rowDelayMax, this.#rowPhase(card) * MOTION.rowDelay)
      * (1 - 0.8 * this.#velocityFactor(speed));
  }

  #finish(card: HTMLElement): void {
    const state = this.#stateFor(card);
    if (state.done) return;
    state.done = true;
    state.started = true;
    if (this.#observer && state.observed) {
      this.#observer.unobserve(card);
      state.observed = false;
    }
    this.#stop(card);
    card.style.opacity = '1';
    card.style.visibility = 'visible';
    card.style.top = '0px';
    this.#clear(card);
  }

  #reveal(card: HTMLElement, speed: number): void {
    const state = this.#stateFor(card);
    if (state.done || state.started) return;
    state.started = true;
    if (this.#observer && state.observed) {
      this.#observer.unobserve(card);
      state.observed = false;
    }

    imagePreloader.scan(card);
    if (this.#reduce || this.#programmatic()) {
      this.#finish(card);
      return;
    }

    const delay = this.#delayFor(card, speed);
    const startTop = Number.parseFloat(card.style.top) || 0;
    this.#stop(card);
    state.handles = [
      this.#engine.springOpacity(card, 1, this.#effectsSpring(speed), { delay }),
      this.#engine.spring(this.#spatialSpring(speed), (progress) => {
        card.style.top = `${startTop * (1 - progress)}px`;
      }, {
        delay,
        onComplete: () => {
          state.handles = [];
          this.#finish(card);
        },
      }),
    ];
  }

  #prepare(card: HTMLElement): boolean {
    const state = this.#stateFor(card);
    if (state.prepared || state.done || !this.#renderable(card)) return false;

    const rect = card.getBoundingClientRect();
    state.prepared = true;
    if (rect.bottom <= 0) {
      this.#finish(card);
      return false;
    }

    card.style.opacity = '0';
    card.style.visibility = 'visible';
    card.style.top = `${rect.top < innerHeight ? this.#profile.initialY ?? 14 : this.#profile.revealY ?? 18}px`;
    card.style.willChange = 'top,opacity';
    return true;
  }

  #arm = (card: HTMLElement): void => {
    const state = this.#stateFor(card);
    if (!this.#prepare(card) || state.done) return;
    if (this.#reduce) {
      this.#finish(card);
      return;
    }
    if (this.#observer) {
      this.#observer.observe(card);
      state.observed = true;
    }
  };

  #armNode(node: Node): void {
    if (!(node instanceof HTMLElement) || node.hidden) return;
    if (node.matches(selectors.productList)) {
      node.querySelectorAll<HTMLElement>(selectors.productCard).forEach(this.#arm);
    } else if (node.matches(selectors.productCard)) {
      this.#arm(node);
    }
  }

  #trackScroll = (): void => {
    const now = performance.now();
    const y = window.scrollY || window.pageYOffset || 0;
    const elapsed = Math.max(16, now - this.#lastTime);
    const delta = y - this.#lastY;
    if (Math.abs(delta) > 0.5) this.#direction = delta > 0 ? 1 : -1;
    this.#velocity = Math.abs(delta) * 1000 / elapsed;
    this.#lastY = y;
    this.#lastTime = now;

    if (this.#scrollFrame) cancelAnimationFrame(this.#scrollFrame);
    this.#scrollFrame = requestAnimationFrame(() => {
      this.#scrollFrame = 0;
      this.revealVisibleCards();
    });
  };

  #createIntersectionObserver(): void {
    if (!('IntersectionObserver' in window)) return;
    const threshold = this.#profile.threshold ?? 0.05;
    this.#observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const card = entry.target as HTMLElement;
        const state = this.#stateFor(card);
        if (state.done || state.started) continue;
        if (this.#direction < 0 || this.#programmatic()) {
          this.#finish(card);
          continue;
        }
        if (entry.intersectionRatio + 1e-4 < threshold) continue;
        this.#reveal(card, this.#velocity);
      }
    }, { root: null, rootMargin: '0px', threshold: [0, threshold] });
  }

  #observeVisibilityChanges(): void {
    const container = document.querySelector<HTMLElement>(selectors.container);
    if (!container || !('MutationObserver' in window)) return;
    this.#mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== 'attributes' || mutation.attributeName !== 'hidden') continue;
        const target = mutation.target as HTMLElement;
        if (!target.hidden) this.#armNode(target);
      }
    });
    this.#mutationObserver.observe(container, {
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden'],
    });
  }
}

export function setupReveal(
  engine: MotionEngine,
  profile: RevealProfile,
  reduce: boolean,
): Cleanup {
  return new ProductCardRevealController(engine, profile, reduce).start();
}
