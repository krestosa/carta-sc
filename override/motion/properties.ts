import { spring, tween } from './scheduler.js';
import type {
  MotionHandle,
  MotionPropertyOptions,
  MotionSpringOptions,
  MotionSpringPropertyOptions,
  MotionSpringSpec,
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

function transformEndpoints(
  target: HTMLElement | SVGElement,
  to: Partial<MotionTransformState>,
): readonly [MotionTransformState, MotionTransformState] {
  const from = currentTransform(target);
  return [from, {
    x: to.x ?? from.x,
    y: to.y ?? from.y,
    scale: to.scale ?? from.scale,
    rotation: to.rotation ?? from.rotation,
  }];
}

function interpolateTransform(
  from: MotionTransformState,
  end: MotionTransformState,
  progress: number,
): MotionTransformState {
  return {
    x: from.x + (end.x - from.x) * progress,
    y: from.y + (end.y - from.y) * progress,
    scale: from.scale + (end.scale - from.scale) * progress,
    rotation: from.rotation + (end.rotation - from.rotation) * progress,
  };
}

export function animateTransform(
  target: HTMLElement | SVGElement,
  to: Partial<MotionTransformState>,
  options: MotionPropertyOptions,
): MotionHandle {
  const [from, end] = transformEndpoints(target, to);
  target.style.willChange = 'transform';

  return tween(options.duration, options.ease, (progress) => {
    writeTransform(target, interpolateTransform(from, end, progress));
  }, {
    delay: options.delay,
    onComplete: () => {
      target.style.removeProperty('will-change');
      if (options.clear) target.style.removeProperty('transform');
      options.onComplete?.();
    },
  });
}

export function animateSpringTransform(
  target: HTMLElement | SVGElement,
  to: Partial<MotionTransformState>,
  spec: MotionSpringSpec,
  options: MotionSpringPropertyOptions = {},
): MotionHandle {
  const [from, end] = transformEndpoints(target, to);
  target.style.willChange = 'transform';

  return spring(spec, (progress) => {
    writeTransform(target, interpolateTransform(from, end, progress));
  }, {
    delay: options.delay,
    initialVelocity: options.initialVelocity,
    onComplete: () => {
      target.style.removeProperty('will-change');
      if (options.clear) target.style.removeProperty('transform');
      options.onComplete?.();
    },
  });
}

function currentOpacity(target: HTMLElement | SVGElement): number {
  const parsed = Number.parseFloat(getComputedStyle(target).opacity);
  return Number.isFinite(parsed) ? parsed : 1;
}

export function animateOpacity(
  target: HTMLElement | SVGElement,
  to: number,
  options: MotionPropertyOptions,
): MotionHandle {
  const from = currentOpacity(target);
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

export function animateSpringOpacity(
  target: HTMLElement | SVGElement,
  to: number,
  spec: MotionSpringSpec,
  options: MotionSpringPropertyOptions = {},
): MotionHandle {
  const from = currentOpacity(target);
  target.style.willChange = 'opacity';

  return spring(spec, (progress) => {
    target.style.opacity = String(from + (to - from) * progress);
  }, {
    delay: options.delay,
    initialVelocity: options.initialVelocity,
    onComplete: () => {
      target.style.removeProperty('will-change');
      if (options.clear) target.style.removeProperty('opacity');
      options.onComplete?.();
    },
  });
}

function attributeEndpoints(
  target: Element,
  to: Readonly<Record<string, number>>,
): readonly [readonly string[], Record<string, number>] {
  const keys = Object.keys(to);
  const from = Object.fromEntries(keys.map((key) => {
    const value = Number.parseFloat(target.getAttribute(key) ?? '0');
    return [key, Number.isFinite(value) ? value : 0];
  })) as Record<string, number>;
  return [keys, from];
}

function writeAttributes(
  target: Element,
  keys: readonly string[],
  from: Readonly<Record<string, number>>,
  to: Readonly<Record<string, number>>,
  progress: number,
): void {
  for (const key of keys) {
    const start = from[key] ?? 0;
    const end = to[key] ?? start;
    target.setAttribute(key, String(start + (end - start) * progress));
  }
}

export function animateAttributes(
  target: Element,
  to: Readonly<Record<string, number>>,
  options: MotionPropertyOptions,
): MotionHandle {
  const [keys, from] = attributeEndpoints(target, to);
  return tween(options.duration, options.ease, (progress) => {
    writeAttributes(target, keys, from, to, progress);
  }, { delay: options.delay, onComplete: options.onComplete });
}

export function animateSpringAttributes(
  target: Element,
  to: Readonly<Record<string, number>>,
  spec: MotionSpringSpec,
  options: MotionSpringOptions = {},
): MotionHandle {
  const [keys, from] = attributeEndpoints(target, to);
  return spring(spec, (progress) => {
    writeAttributes(target, keys, from, to, progress);
  }, options);
}
