import { media, queries } from '../core/variables.js';
import type { Cleanup } from '../core/types.js';
import type {
  MicroInteractionOptions,
  MotionDependencies,
  MotionEngine,
  MotionHandle,
  MotionPropertyOptions,
  MotionRuntime,
  MotionTransformState,
  MotionTweenOptions,
} from './types.js';

type MotionCallback = (dependencies: MotionDependencies) => void;
type Point = readonly [x: number, y: number];

interface SampledPath {
  readonly points: Point[];
  readonly closed: boolean;
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const PATH_SAMPLE_COUNT = 64;
const readyQueue: MotionCallback[] = [];
const root = document.documentElement;

let unlocked = false;
let refreshTimer = 0;

root.classList.add('sc-motion-engine-ready');

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const prefersReducedMotion = (): boolean =>
  (queries.reducedMotion ?? window.matchMedia(media.reducedMotion)).matches;

const easeValue = (name: string | undefined, progress: number): number => {
  const x = clamp(progress, 0, 1);
  const key = (name ?? 'linear').toLowerCase();

  switch (key) {
    case 'none':
    case 'linear': return x;
    case 'quad.in': return x * x;
    case 'quad.out': return 1 - (1 - x) ** 2;
    case 'quad.inout': return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
    case 'cubic.in': return x ** 3;
    case 'cubic.out': return 1 - (1 - x) ** 3;
    case 'cubic.inout': return x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
    case 'quart.in': return x ** 4;
    case 'quart.out': return 1 - (1 - x) ** 4;
    case 'quart.inout': return x < 0.5 ? 8 * x ** 4 : 1 - (-2 * x + 2) ** 4 / 2;
    case 'quint.in': return x ** 5;
    case 'quint.out': return 1 - (1 - x) ** 5;
    case 'quint.inout': return x < 0.5 ? 16 * x ** 5 : 1 - (-2 * x + 2) ** 5 / 2;
    case 'sine.in': return 1 - Math.cos((x * Math.PI) / 2);
    case 'sine.out': return Math.sin((x * Math.PI) / 2);
    case 'sine.inout': return -(Math.cos(Math.PI * x) - 1) / 2;
    default: return 1 - (1 - x) ** 3;
  }
};

const tween = (duration: number, easing: string | undefined, update: (progress: number) => void, options: MotionTweenOptions = {}): MotionHandle => {
  const delayMs = Math.max(0, (options.delay ?? 0) * 1000);
  const durationMs = Math.max(0, duration * 1000);
  let frameId = 0;
  let startTime: number | undefined;
  let running = true;
  let completed = false;

  const complete = (): void => {
    if (completed) return;
    completed = true;
    running = false;
    options.onComplete?.();
  };

  const frame = (timestamp: number): void => {
    if (!running) return;
    startTime ??= timestamp;
    const elapsed = timestamp - startTime;
    if (elapsed < delayMs) { frameId = requestAnimationFrame(frame); return; }
    const linearProgress = durationMs === 0 ? 1 : clamp((elapsed - delayMs) / durationMs, 0, 1);
    update(easeValue(easing, linearProgress));
    if (linearProgress >= 1) { complete(); return; }
    frameId = requestAnimationFrame(frame);
  };

  frameId = requestAnimationFrame(frame);
  return {
    cancel(): void { if (!running) return; running = false; cancelAnimationFrame(frameId); },
    finish(): void { if (!running) return; cancelAnimationFrame(frameId); update(1); complete(); },
    active: () => running,
  };
};

const delay = (seconds: number, callback: () => void): MotionHandle => {
  let running = true;
  const timeoutId = window.setTimeout(() => { if (!running) return; running = false; callback(); }, Math.max(0, seconds * 1000));
  return {
    cancel(): void { if (!running) return; running = false; clearTimeout(timeoutId); },
    finish(): void { if (!running) return; running = false; clearTimeout(timeoutId); callback(); },
    active: () => running,
  };
};

const currentTransform = (target: HTMLElement | SVGElement): MotionTransformState => {
  const transform = getComputedStyle(target).transform;
  if (!transform || transform === 'none') return { x: 0, y: 0, scale: 1, rotation: 0 };
  try {
    const matrix = new DOMMatrixReadOnly(transform);
    const scale = Math.hypot(matrix.a, matrix.b) || 1;
    const rotation = Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
    return { x: matrix.m41, y: matrix.m42, scale, rotation };
  } catch { return { x: 0, y: 0, scale: 1, rotation: 0 }; }
};

const writeTransform = (target: HTMLElement | SVGElement, state: MotionTransformState): void => {
  target.style.transform = `translate3d(${state.x}px,${state.y}px,0) rotate(${state.rotation}deg) scale(${state.scale})`;
};

const animateTransform = (target: HTMLElement | SVGElement, to: Partial<MotionTransformState>, options: MotionPropertyOptions): MotionHandle => {
  const from = currentTransform(target);
  const end: MotionTransformState = { x: to.x ?? from.x, y: to.y ?? from.y, scale: to.scale ?? from.scale, rotation: to.rotation ?? from.rotation };
  target.style.willChange = 'transform';
  return tween(options.duration, options.ease, (progress) => writeTransform(target, {
    x: from.x + (end.x - from.x) * progress,
    y: from.y + (end.y - from.y) * progress,
    scale: from.scale + (end.scale - from.scale) * progress,
    rotation: from.rotation + (end.rotation - from.rotation) * progress,
  }), { delay: options.delay, onComplete: () => { target.style.removeProperty('will-change'); if (options.clear) target.style.removeProperty('transform'); options.onComplete?.(); } });
};

const animateOpacity = (target: HTMLElement | SVGElement, to: number, options: MotionPropertyOptions): MotionHandle => {
  const parsed = Number.parseFloat(getComputedStyle(target).opacity);
  const from = Number.isFinite(parsed) ? parsed : 1;
  target.style.willChange = 'opacity';
  return tween(options.duration, options.ease, (progress) => { target.style.opacity = String(from + (to - from) * progress); }, { delay: options.delay, onComplete: () => { target.style.removeProperty('will-change'); if (options.clear) target.style.removeProperty('opacity'); options.onComplete?.(); } });
};

const animateAttributes = (target: Element, to: Readonly<Record<string, number>>, options: MotionPropertyOptions): MotionHandle => {
  const keys = Object.keys(to);
  const from = Object.fromEntries(keys.map((key) => { const value = Number.parseFloat(target.getAttribute(key) ?? '0'); return [key, Number.isFinite(value) ? value : 0]; })) as Record<string, number>;
  return tween(options.duration, options.ease, (progress) => {
    for (const key of keys) {
      const start = from[key] ?? 0;
      const end = to[key] ?? start;
      target.setAttribute(key, String(start + (end - start) * progress));
    }
  }, { delay: options.delay, onComplete: options.onComplete });
};

const splitPathData = (data: string): string[] => data.match(/[Mm][^Mm]*/g) ?? [data];

const samplePath = (svg: SVGSVGElement, data: string, count: number): SampledPath | null => {
  const probe = document.createElementNS(SVG_NAMESPACE, 'path');
  probe.setAttribute('d', data); probe.setAttribute('visibility', 'hidden'); probe.setAttribute('pointer-events', 'none'); svg.appendChild(probe);
  try {
    const length = probe.getTotalLength();
    if (!Number.isFinite(length) || length <= 0) return null;
    const closed = /[zZ]\s*$/.test(data);
    const points = Array.from({ length: count }, (_, index): Point => {
      const ratio = closed ? index / count : count === 1 ? 0 : index / (count - 1);
      const point = probe.getPointAtLength(length * ratio);
      return [point.x, point.y];
    });
    return { points, closed };
  } catch { return null; } finally { probe.remove(); }
};

const samplePathSet = (svg: SVGSVGElement, data: string, count: number): SampledPath[] | null => {
  const result: SampledPath[] = [];
  for (const part of splitPathData(data)) { const sampled = samplePath(svg, part, count); if (!sampled) return null; result.push(sampled); }
  return result;
};

const pointDistance = (a: Point, b: Point): number => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

const alignPoints = (source: Point[], target: Point[]): Point[] => {
  if (source.length !== target.length || source.length < 2) return [...target];
  const count = source.length;
  const scoreStride = Math.max(1, Math.floor(count / 16));
  let best = [...target];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidateBase of [target, [...target].reverse()]) {
    for (let shift = 0; shift < count; shift += 1) {
      let score = 0;
      for (let index = 0; index < count; index += scoreStride) {
        const sourcePoint = source[index] ?? source[0];
        const candidatePoint = candidateBase[(index + shift) % count] ?? candidateBase[0];
        if (sourcePoint && candidatePoint) score += pointDistance(sourcePoint, candidatePoint);
      }
      if (score >= bestScore) continue;
      bestScore = score;
      best = Array.from({ length: count }, (_, index) => candidateBase[(index + shift) % count] ?? candidateBase[0]!);
    }
  }
  return best;
};

const animatePath = (target: SVGPathElement, toD: string, options: MotionPropertyOptions): MotionHandle => {
  const svg = target.ownerSVGElement;
  if (!svg || !toD) { target.setAttribute('d', toD); return delay(0, () => options.onComplete?.()); }
  const fromD = target.getAttribute('d') ?? '';
  const fromSet = samplePathSet(svg, fromD, PATH_SAMPLE_COUNT);
  const toSet = samplePathSet(svg, toD, PATH_SAMPLE_COUNT);
  if (!fromSet?.length || !toSet?.length) return tween(options.duration, options.ease, (progress) => { if (progress >= 1) target.setAttribute('d', toD); }, { delay: options.delay, onComplete: options.onComplete });
  const pairCount = Math.max(fromSet.length, toSet.length);
  const pairs = Array.from({ length: pairCount }, (_, index) => {
    const source = fromSet[Math.min(index, fromSet.length - 1)] ?? fromSet[0]!;
    const destination = toSet[Math.min(index, toSet.length - 1)] ?? toSet[0]!;
    return { from: source, to: { points: alignPoints(source.points, destination.points), closed: destination.closed } };
  });
  return tween(options.duration, options.ease, (progress) => {
    let data = '';
    for (const pair of pairs) {
      pair.from.points.forEach((fromPoint, index) => {
        const toPoint = pair.to.points[index]; if (!toPoint) return;
        const x = fromPoint[0] + (toPoint[0] - fromPoint[0]) * progress;
        const y = fromPoint[1] + (toPoint[1] - fromPoint[1]) * progress;
        data += `${index === 0 ? 'M' : 'L'}${x.toFixed(3)} ${y.toFixed(3)}`;
      });
      if (pair.from.closed || pair.to.closed) data += 'Z';
    }
    target.setAttribute('d', data);
  }, { delay: options.delay, onComplete: () => { target.setAttribute('d', toD); options.onComplete?.(); } });
};

export const motionEngine: MotionEngine = Object.freeze({ tween, delay, transform: animateTransform, opacity: animateOpacity, attributes: animateAttributes, path: animatePath, currentTransform, ease: easeValue });
const dependencies: MotionDependencies = Object.freeze({ engine: motionEngine });
const dependencyPromise = Promise.resolve(dependencies);

const execute = (callback: MotionCallback): void => { try { callback(dependencies); } catch (error) { console.error('[SushiClub motion]', error); } };
const flushReadyQueue = (): void => { for (const callback of readyQueue.splice(0)) execute(callback); };
const refresh = (delayMs: number | null = 0): void => {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => { refreshTimer = 0; window.dispatchEvent(new CustomEvent('sc:motionrefresh')); }, Math.max(0, delayMs ?? 0));
};

const bindMicroInteraction = (control: HTMLElement, target: HTMLElement | SVGElement, options: MicroInteractionOptions = {}): Cleanup => {
  let activeTween: MotionHandle | null = null;
  let destroyed = false;
  let hovered = false;
  let focused = false;
  let pressed = false;
  const focusVisible = (): boolean => { try { return control.matches(':focus-visible'); } catch { return document.activeElement === control; } };
  const stopTween = (): void => { activeTween?.cancel(); activeTween = null; };
  const rotationFor = (kind: 'active' | 'press'): number => { const value = Number(options[kind]?.rotation); return Number.isFinite(value) && value !== 0 ? value : kind === 'press' ? -6 : 12; };
  const clearTransform = (): void => { target.style.removeProperty('transform'); target.style.removeProperty('will-change'); };
  const move = (rotation: number, duration: number, easing: string, clearAtEnd: boolean): void => {
    if (destroyed) return; stopTween(); if (prefersReducedMotion()) { clearTransform(); return; }
    target.style.transformOrigin = options.transformOrigin ?? '50% 50%';
    activeTween = motionEngine.transform(target, { rotation }, { duration, ease: easing, onComplete: () => { activeTween = null; if (clearAtEnd) clearTransform(); } });
  };
  const moveActive = (): void => move(rotationFor('active'), options.enterDuration ?? 0.1, options.enterEase ?? 'quart.out', false);
  const moveHome = (): void => move(0, options.exitDuration ?? 0.14, options.exitEase ?? 'quart.out', true);
  const pulsePress = (): void => {
    if (destroyed) return; stopTween(); if (prefersReducedMotion()) { clearTransform(); return; }
    const returnAngle = hovered || focused ? rotationFor('active') : 0;
    activeTween = motionEngine.transform(target, { rotation: rotationFor('press') }, { duration: options.pressDuration ?? 0.055, ease: 'cubic.out', onComplete: () => {
      activeTween = motionEngine.transform(target, { rotation: returnAngle }, { duration: options.pressReturnDuration ?? 0.085, ease: 'quart.out', onComplete: () => { activeTween = null; if (returnAngle === 0) clearTransform(); } });
    } });
  };
  const onPointerEnter = (event: PointerEvent): void => { if (event.pointerType === 'touch' || hovered) return; hovered = true; if (!pressed) moveActive(); };
  const onPointerLeave = (): void => { hovered = false; pressed = false; focused ? moveActive() : moveHome(); };
  const onPointerDown = (): void => { pressed = true; pulsePress(); };
  const onPointerUp = (): void => { pressed = false; hovered || focused ? moveActive() : moveHome(); };
  const onFocus = (): void => { if (!focusVisible() || focused) return; focused = true; if (!pressed) moveActive(); };
  const onBlur = (): void => { focused = false; pressed = false; hovered ? moveActive() : moveHome(); };
  const onKeyDown = (event: KeyboardEvent): void => { if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return; pressed = true; pulsePress(); };
  const onKeyUp = (event: KeyboardEvent): void => { if (event.key !== 'Enter' && event.key !== ' ') return; pressed = false; hovered || focused ? moveActive() : moveHome(); };
  control.addEventListener('pointerenter', onPointerEnter); control.addEventListener('pointerleave', onPointerLeave); control.addEventListener('pointerdown', onPointerDown); control.addEventListener('pointerup', onPointerUp); control.addEventListener('pointercancel', onPointerLeave); control.addEventListener('focus', onFocus); control.addEventListener('blur', onBlur); control.addEventListener('keydown', onKeyDown); control.addEventListener('keyup', onKeyUp);
  return () => {
    if (destroyed) return; destroyed = true;
    control.removeEventListener('pointerenter', onPointerEnter); control.removeEventListener('pointerleave', onPointerLeave); control.removeEventListener('pointerdown', onPointerDown); control.removeEventListener('pointerup', onPointerUp); control.removeEventListener('pointercancel', onPointerLeave); control.removeEventListener('focus', onFocus); control.removeEventListener('blur', onBlur); control.removeEventListener('keydown', onKeyDown); control.removeEventListener('keyup', onKeyUp); stopTween(); clearTransform();
  };
};

export const motion: MotionRuntime = Object.freeze({
  engine: motionEngine,
  ready: () => dependencyPromise,
  prepare: () => dependencyPromise,
  whenLoaded: execute,
  whenReady(callback: MotionCallback): void { unlocked ? execute(callback) : readyQueue.push(callback); },
  run(callback: MotionCallback): boolean { if (!unlocked) return false; execute(callback); return true; },
  runLoaded(callback: MotionCallback): boolean { execute(callback); return true; },
  refresh,
  reduced: prefersReducedMotion,
  bindMicroInteraction,
  unlock(): void { if (unlocked) return; unlocked = true; flushReadyQueue(); refresh(0); },
  isReady: () => unlocked,
  isLoaded: () => true,
});
