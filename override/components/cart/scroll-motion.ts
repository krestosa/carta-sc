import { motionTokens } from '../../core/variables.js';
import type { MotionEngine, MotionHandle } from '../../motion/types.js';

export interface CartScrollProfile {
  readonly maxLag: number;
  readonly velocityScale: number;
}

interface CartScrollEntry {
  readonly wrapper: HTMLElement;
  target: HTMLElement | null;
  move: MotionHandle | null;
}

const SCROLL_MOTION = {
  velocityFloor: 55,
  settleDelay: motionTokens.durations.short1,
} as const;

export function setupCartScroll(engine: MotionEngine, profile: CartScrollProfile, reduced: boolean): () => void {
  let entries: CartScrollEntry[] = [];
  let observer: MutationObserver | null = null;
  let frame = 0;
  let settle: MotionHandle | null = null;
  let lastY = window.scrollY || window.pageYOffset || 0;
  let lastTime = performance.now();

  const clamp = (value: number): number => Math.max(-profile.maxLag, Math.min(profile.maxLag, value));
  const targetFor = (wrapper: HTMLElement): HTMLElement =>
    wrapper.querySelector<HTMLElement>('.carritoBox') ??
    wrapper.querySelector<HTMLElement>('.shop_carrito') ??
    (wrapper.firstElementChild as HTMLElement | null) ??
    wrapper;

  const stopMove = (entry: CartScrollEntry): void => {
    entry.move?.cancel();
    entry.move = null;
  };

  const clearTarget = (entry: CartScrollEntry): void => {
    if (!entry.target) return;
    stopMove(entry);
    entry.target.style.removeProperty('transform');
    entry.target.style.removeProperty('will-change');
    entry.target.classList.remove('sc-cart-scroll-motion');
  };

  const configure = (entry: CartScrollEntry, target: HTMLElement): void => {
    if (entry.target && entry.target !== target) clearTarget(entry);
    entry.target = target;
    target.classList.add('sc-cart-scroll-motion');
  };

  const move = (y: number): void => {
    for (const entry of entries) {
      if (!entry.target) continue;
      stopMove(entry);
      entry.move = engine.springTransform(entry.target, { y }, motionTokens.springs.spatial.fast, {
        onComplete: () => { entry.move = null; },
      });
    }
  };

  const scheduleSettle = (): void => {
    settle?.cancel();
    settle = engine.delay(SCROLL_MOTION.settleDelay, () => {
      settle = null;
      move(0);
    });
  };

  const onScroll = (): void => {
    if (reduced) return;
    const now = performance.now();
    const y = window.scrollY || window.pageYOffset || 0;
    const dt = Math.max(16, now - lastTime);
    const velocity = ((y - lastY) * 1000) / dt;
    lastY = y;
    lastTime = now;
    move(Math.abs(velocity) < SCROLL_MOTION.velocityFloor ? 0 : clamp(velocity * profile.velocityScale));
    scheduleSettle();
  };

  const discover = (): void => {
    frame = 0;
    entries = entries.filter((entry) => {
      if (document.documentElement.contains(entry.wrapper)) return true;
      clearTarget(entry);
      return false;
    });

    for (const wrapper of document.querySelectorAll<HTMLElement>('.carritoFixed')) {
      const target = targetFor(wrapper);
      let entry = entries.find((candidate) => candidate.wrapper === wrapper);
      if (!entry) {
        entry = { wrapper, target: null, move: null };
        entries.push(entry);
      }
      if (entry.target !== target) configure(entry, target);
    }
  };

  const containsCart = (node: Node): boolean => node instanceof Element && (node.matches('.carritoFixed') || Boolean(node.querySelector('.carritoFixed')));
  const affectsCart = (mutation: MutationRecord): boolean => {
    const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
    if (target?.closest('.carritoFixed')) return true;
    return [...mutation.addedNodes, ...mutation.removedNodes].some(containsCart);
  };

  const schedule = (): void => {
    if (!frame) frame = requestAnimationFrame(discover);
  };

  const refresh = (): void => {
    move(0);
    lastY = window.scrollY || window.pageYOffset || 0;
    lastTime = performance.now();
  };

  discover();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('sc:motionrefresh', refresh);
  if (document.body) {
    observer = new MutationObserver((mutations) => {
      if (mutations.some(affectsCart)) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  return () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('sc:motionrefresh', refresh);
    observer?.disconnect();
    if (frame) cancelAnimationFrame(frame);
    settle?.cancel();
    entries.forEach(clearTarget);
  };
}
