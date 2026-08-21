import { motionTokens, queries } from '../../core/variables.js';
import { motion } from '../../motion/main.js';
import type { MotionHandle } from '../../motion/types.js';

const activeMotions = new WeakMap<HTMLElement, MotionHandle>();

function clampTarget(scroller: HTMLElement, value: number): number {
  const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  return Math.max(0, Math.min(max, value));
}

export function stopRailMotion(scroller: HTMLElement): void {
  activeMotions.get(scroller)?.cancel();
  activeMotions.delete(scroller);
}

export function moveRailTo(scroller: HTMLElement, value: number, onComplete?: () => void): void {
  stopRailMotion(scroller);
  const start = scroller.scrollLeft;
  const target = clampTarget(scroller, value);

  if (queries.reducedMotion.matches || Math.abs(target - start) < 1) {
    scroller.scrollLeft = target;
    onComplete?.();
    return;
  }

  const handle = motion.engine.spring(motionTokens.springs.spatial.fast, (progress) => {
    scroller.scrollLeft = start + (target - start) * progress;
  }, {
    onComplete: () => {
      if (activeMotions.get(scroller) === handle) activeMotions.delete(scroller);
      scroller.scrollLeft = target;
      onComplete?.();
    },
  });
  activeMotions.set(scroller, handle);
}

export function moveRailBy(scroller: HTMLElement, delta: number, onComplete?: () => void): void {
  moveRailTo(scroller, scroller.scrollLeft + delta, onComplete);
}
