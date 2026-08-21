import { motionTokens } from '../../core/variables.js';
import type { MotionEngine, MotionHandle } from '../../motion/types.js';

const BADGE_MOTION = {
  reducedDuration: 0.12,
  reducedOpacity: 0.72,
  pulseUpDuration: 0.07,
  pulseDownDuration: 0.1,
  pulseScale: 1.08,
} as const;

export function setupCartBadges(engine: MotionEngine, reduced: boolean): () => void {
  const badges = Array.from(document.querySelectorAll<HTMLElement>('.shopMenuRightIcon .badge, .shopMenuRightIcon .badget'));
  const observers: MutationObserver[] = [];
  const pending = new Set<HTMLElement>();
  const active = new WeakMap<HTMLElement, MotionHandle[]>();
  let frame = 0;

  const clear = (badge: HTMLElement): void => {
    for (const property of ['transform', 'opacity', 'visibility', 'will-change']) badge.style.removeProperty(property);
  };

  const stop = (badge: HTMLElement): void => {
    for (const handle of active.get(badge) ?? []) handle.cancel();
    active.delete(badge);
  };

  const animate = (badge: HTMLElement): void => {
    stop(badge);
    if (reduced) {
      badge.style.opacity = String(BADGE_MOTION.reducedOpacity);
      const fade = engine.opacity(badge, 1, {
        duration: BADGE_MOTION.reducedDuration,
        ease: motionTokens.easings.out,
        clear: true,
        onComplete: () => {
          active.delete(badge);
          clear(badge);
        },
      });
      active.set(badge, [fade]);
      return;
    }

    const handles: MotionHandle[] = [];
    const up = engine.transform(badge, { scale: BADGE_MOTION.pulseScale }, {
      duration: BADGE_MOTION.pulseUpDuration,
      ease: motionTokens.easings.out,
      onComplete: () => {
        const down = engine.transform(badge, { scale: 1 }, {
          duration: BADGE_MOTION.pulseDownDuration,
          ease: motionTokens.easings.out,
          clear: true,
          onComplete: () => {
            active.delete(badge);
            clear(badge);
          },
        });
        handles.push(down);
      },
    });
    handles.push(up);
    active.set(badge, handles);
  };

  const flush = (): void => {
    frame = 0;
    const batch = Array.from(pending);
    pending.clear();
    batch.forEach(animate);
  };

  for (const badge of badges) {
    const observer = new MutationObserver(() => {
      pending.add(badge);
      if (!frame) frame = requestAnimationFrame(flush);
    });
    observer.observe(badge, { childList: true, characterData: true, subtree: true });
    observers.push(observer);
  }

  return () => {
    observers.forEach((observer) => observer.disconnect());
    if (frame) cancelAnimationFrame(frame);
    pending.clear();
    for (const badge of badges) {
      stop(badge);
      clear(badge);
    }
  };
}
