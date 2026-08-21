import { tween } from './scheduler.js';
import type {
  MotionHandle,
  MotionPropertyOptions,
  MotionTransformState,
} from './types.js';

export function currentTransform(target: HTMLElement | SVGElement): MotionTransformState {
  const transform = getComputedStyle(target).transform;
  if (!transform || transform === 'none') return { x: 0, y: 0, scale: 1, rotation: 0 };

  try {
    const matrix = new DOMMatrixReadOnly(transform);
    const scale = Math.hypot(matrix.a, matrix.b) || 1;
    const rotation = Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
    return { x: matrix.m41, y: matrix.m42, scale, rotation };
  } catch {
    return { x: 0, y: 0, scale: 1, rotation: 0 };
  }
}

function writeTransform(target: HTMLElement | SVGElement, state: MotionTransformState): void {
  target.style.transform = `translate3d(${state.x}px,${state.y}px,0) rotate(${state.rotation}deg) scale(${state.scale})`;
}

export function animateTransform(
  target: HTMLElement | SVGElement,
  to: Partial<MotionTransformState>,
  options: MotionPropertyOptions,
): MotionHandle {
  const from = currentTransform(target);
  const end: MotionTransformState = {
    x: to.x ?? from.x,
    y: to.y ?? from.y,
    scale: to.scale ?? from.scale,
    rotation: to.rotation ?? from.rotation,
  };
  target.style.willChange = 'transform';

  return tween(options.duration, options.ease, (progress) => {
    writeTransform(target, {
      x: from.x + (end.x - from.x) * progress,
      y: from.y + (end.y - from.y) * progress,
      scale: from.scale + (end.scale - from.scale) * progress,
      rotation: from.rotation + (end.rotation - from.rotation) * progress,
    });
  }, {
    delay: options.delay,
    onComplete: () => {
      target.style.removeProperty('will-change');
      if (options.clear) target.style.removeProperty('transform');
      options.onComplete?.();
    },
  });
}

export function animateOpacity(
  target: HTMLElement | SVGElement,
  to: number,
  options: MotionPropertyOptions,
): MotionHandle {
  const parsed = Number.parseFloat(getComputedStyle(target).opacity);
  const from = Number.isFinite(parsed) ? parsed : 1;
  target.style.willChange = 'opacity';

  return tween(options.duration, options.ease, (progress) => {
    target.style.opacity = String(from + (to - from) * progress);
  }, {
    delay: options.delay,
    onComplete: () => {
      target.style.removeProperty('will-change');
      if (options.clear) target.style.removeProperty('opacity');
      options.onComplete?.();
    },
  });
}

export function animateAttributes(
  target: Element,
  to: Readonly<Record<string, number>>,
  options: MotionPropertyOptions,
): MotionHandle {
  const keys = Object.keys(to);
  const from = Object.fromEntries(keys.map((key) => {
    const value = Number.parseFloat(target.getAttribute(key) ?? '0');
    return [key, Number.isFinite(value) ? value : 0];
  })) as Record<string, number>;

  return tween(options.duration, options.ease, (progress) => {
    for (const key of keys) {
      const start = from[key] ?? 0;
      const end = to[key] ?? start;
      target.setAttribute(key, String(start + (end - start) * progress));
    }
  }, { delay: options.delay, onComplete: options.onComplete });
}
