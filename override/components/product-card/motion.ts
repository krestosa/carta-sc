import { queries } from '../../core/variables.js';
import type { Cleanup } from '../../core/types.js';
import { motion } from '../../motion/main.js';
import type { MotionEngine } from '../../motion/types.js';
import { setupReveal } from './reveal-motion.js';

let cleanup: Cleanup | null = null;
let initialized = false;

const mount = (engine: MotionEngine): void => {
  cleanup?.();
  const profile = queries.desktop.matches
    ? { initialY: 12, revealY: 16, threshold: 0.04 }
    : queries.tablet.matches
      ? { initialY: 10, revealY: 14, threshold: 0.035 }
      : { initialY: 8, revealY: 12, threshold: 0.025 };
  cleanup = setupReveal(engine, profile, queries.reducedMotion.matches);
};

export const initializeProductCardMotion = (): Cleanup => {
  if (initialized) return () => undefined;
  initialized = true;
  const remount = (): void => mount(motion.engine);
  motion.whenReady(() => mount(motion.engine));

  const mediaQueries = [queries.phone, queries.tablet, queries.desktop, queries.reducedMotion];
  mediaQueries.forEach((query) => query.addEventListener('change', remount));

  return () => {
    if (!initialized) return;
    initialized = false;
    cleanup?.();
    cleanup = null;
    mediaQueries.forEach((query) => query.removeEventListener('change', remount));
  };
};
