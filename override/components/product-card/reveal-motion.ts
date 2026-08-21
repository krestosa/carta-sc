import { scrollState } from '../../core/state.js';
import { selectors } from '../../core/variables.js';
import type { Cleanup } from '../../core/types.js';
import { imagePreloader } from '../../features/image-preloader/image-preloader.js';
import type { MotionEngine, MotionHandle } from '../../motion/types.js';

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

const MOTION = Object.freeze({
  baseDuration: 0.56,
  fastDuration: 0.2,
  velocityFloor: 180,
  velocityCeil: 2800,
  rowDelay: 0.045,
  rowDelayMax: 0.14,
});

export let revealViewport: (() => void) | null = null;

export const setupReveal = (
  engine: MotionEngine,
  profile: RevealProfile,
  reduce: boolean,
): Cleanup => {
  const cards = [...document.querySelectorAll<HTMLElement>(selectors.productCards)];
  const states = new WeakMap<HTMLElement, RevealState>();
  let observer: IntersectionObserver | null = null;
  let mutationObserver: MutationObserver | null = null;
  let lastY = window.scrollY || window.pageYOffset || 0;
  let lastTime = performance.now();
  let velocity = 0;
  let direction = 1;
  let scrollFrame = 0;

  const stateFor = (card: HTMLElement): RevealState => {
    const existing = states.get(card);
    if (existing) return existing;
    const created: RevealState = { prepared: false, done: false, started: false, handles: [], observed: false };
    states.set(card, created);
    return created;
  };

  const renderable = (card: HTMLElement): boolean =>
    !card.hidden && card.offsetParent !== null && card.getBoundingClientRect().height > 0;

  const programmatic = (): boolean =>
    scrollState.programmatic || performance.now() < scrollState.suppressRevealUntil;

  const stop = (card: HTMLElement): void => {
    const state = stateFor(card);
    state.handles.forEach((handle) => handle.cancel());
    state.handles = [];
  };

  const clear = (card: HTMLElement): void => {
    ['top', 'opacity', 'visibility', 'will-change'].forEach((property) => card.style.removeProperty(property));
  };

  const rowPhase = (card: HTMLElement): number => {
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
  };

  const velocityFactor = (speed: number): number => Math.max(
    0,
    Math.min(1, (Math.abs(speed) - MOTION.velocityFloor) / (MOTION.velocityCeil - MOTION.velocityFloor)),
  );

  const durationFor = (speed: number): number =>
    MOTION.baseDuration + (MOTION.fastDuration - MOTION.baseDuration) * velocityFactor(speed);

  const delayFor = (card: HTMLElement, speed: number): number =>
    Math.min(MOTION.rowDelayMax, rowPhase(card) * MOTION.rowDelay) * (1 - 0.8 * velocityFactor(speed));

  const finish = (card: HTMLElement): void => {
    const state = stateFor(card);
    if (state.done) return;
    state.done = true;
    state.started = true;
    if (observer && state.observed) {
      observer.unobserve(card);
      state.observed = false;
    }
    stop(card);
    card.style.opacity = '1';
    card.style.visibility = 'visible';
    card.style.top = '0px';
    clear(card);
  };

  const reveal = (card: HTMLElement, speed: number): void => {
    const state = stateFor(card);
    if (state.done || state.started) return;
    state.started = true;
    if (observer && state.observed) {
      observer.unobserve(card);
      state.observed = false;
    }

    imagePreloader.scan(card);
    if (reduce || programmatic()) {
      finish(card);
      return;
    }

    const duration = durationFor(speed);
    const delay = delayFor(card, speed);
    const startTop = Number.parseFloat(card.style.top) || 0;
    stop(card);
    state.handles = [
      engine.tween(duration * 0.92, 'quad.out', (progress) => {
        card.style.opacity = String(progress);
      }, { delay }),
      engine.tween(duration, 'quart.out', (progress) => {
        card.style.top = `${startTop * (1 - progress)}px`;
      }, {
        delay,
        onComplete: () => {
          state.handles = [];
          finish(card);
        },
      }),
    ];
  };

  const prepare = (card: HTMLElement): boolean => {
    const state = stateFor(card);
    if (state.prepared || state.done || !renderable(card)) return false;
    const rect = card.getBoundingClientRect();
    state.prepared = true;
    if (rect.bottom <= 0) {
      finish(card);
      return false;
    }
    card.style.opacity = '0';
    card.style.visibility = 'visible';
    card.style.top = `${rect.top < innerHeight ? profile.initialY ?? 14 : profile.revealY ?? 18}px`;
    card.style.willChange = 'top,opacity';
    return true;
  };

  const arm = (card: HTMLElement): void => {
    const state = stateFor(card);
    if (!prepare(card) || state.done) return;
    if (reduce) {
      finish(card);
      return;
    }
    if (observer) {
      observer.observe(card);
      state.observed = true;
    }
  };

  const armNode = (node: Node): void => {
    if (!(node instanceof HTMLElement) || node.hidden) return;
    if (node.matches(selectors.productList)) {
      node.querySelectorAll<HTMLElement>(selectors.productCard).forEach(arm);
    } else if (node.matches(selectors.productCard)) {
      arm(node);
    }
  };

  const revealVisibleCards = (): void => {
    cards.forEach((card) => {
      const state = stateFor(card);
      if (!state.prepared) arm(card);
      if (state.done || state.started || !renderable(card)) return;
      const rect = card.getBoundingClientRect();
      if (rect.bottom <= 0) finish(card);
      else if (!observer && rect.top < innerHeight) {
        if (direction < 0 || programmatic()) finish(card);
        else reveal(card, velocity);
      }
    });
  };

  const trackScroll = (): void => {
    const now = performance.now();
    const y = window.scrollY || window.pageYOffset || 0;
    const elapsed = Math.max(16, now - lastTime);
    const delta = y - lastY;
    if (Math.abs(delta) > 0.5) direction = delta > 0 ? 1 : -1;
    velocity = Math.abs(delta) * 1000 / elapsed;
    lastY = y;
    lastTime = now;

    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      revealVisibleCards();
    });
  };

  if (!cards.length) {
    revealViewport = null;
    return () => undefined;
  }

  revealViewport = revealVisibleCards;
  window.addEventListener('scroll', trackScroll, { passive: true });

  if ('IntersectionObserver' in window) {
    const threshold = profile.threshold ?? 0.05;
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const card = entry.target as HTMLElement;
        const state = stateFor(card);
        if (state.done || state.started) return;
        if (direction < 0 || programmatic()) {
          finish(card);
          return;
        }
        if (entry.intersectionRatio + 1e-4 < threshold) return;
        reveal(card, velocity);
      });
    }, { root: null, rootMargin: '0px', threshold: [0, threshold] });
  }

  cards.forEach(arm);
  const container = document.querySelector<HTMLElement>(selectors.container);
  if (container && 'MutationObserver' in window) {
    mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'hidden') {
          const target = mutation.target as HTMLElement;
          if (!target.hidden) armNode(target);
        }
      });
    });
    mutationObserver.observe(container, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
  }

  return () => {
    if (revealViewport === revealVisibleCards) revealViewport = null;
    window.removeEventListener('scroll', trackScroll);
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    observer?.disconnect();
    mutationObserver?.disconnect();
    cards.forEach((card) => {
      stop(card);
      clear(card);
    });
  };
};
