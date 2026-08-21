import { clamp, easeValue } from './easing.js';
import type {
  MotionHandle,
  MotionSpringOptions,
  MotionSpringSpec,
  MotionTweenOptions,
} from './types.js';

type FrameTask = (timestamp: number) => boolean;

const frameTasks = new Set<FrameTask>();
let sharedFrameId = 0;

function requestSharedFrame(): void {
  if (sharedFrameId || frameTasks.size === 0) return;
  sharedFrameId = requestAnimationFrame((timestamp) => {
    sharedFrameId = 0;
    const current = Array.from(frameTasks);
    for (const task of current) {
      if (!frameTasks.has(task)) continue;
      if (!task(timestamp)) frameTasks.delete(task);
    }
    requestSharedFrame();
  });
}

function addFrameTask(task: FrameTask): () => void {
  frameTasks.add(task);
  requestSharedFrame();
  return () => {
    frameTasks.delete(task);
    if (frameTasks.size === 0 && sharedFrameId) {
      cancelAnimationFrame(sharedFrameId);
      sharedFrameId = 0;
    }
  };
}

export function tween(
  duration: number,
  easing: string | undefined,
  update: (progress: number) => void,
  options: MotionTweenOptions = {},
): MotionHandle {
  const delayMs = Math.max(0, (options.delay ?? 0) * 1000);
  const durationMs = Math.max(0, duration * 1000);
  let startTime: number | undefined;
  let running = true;
  let completed = false;
  let removeFrameTask: () => void = () => undefined;

  const complete = (): void => {
    if (completed) return;
    completed = true;
    running = false;
    options.onComplete?.();
  };

  const frame: FrameTask = (timestamp) => {
    if (!running) return false;
    startTime ??= timestamp;
    const elapsed = timestamp - startTime;
    if (elapsed < delayMs) return true;

    const linearProgress = durationMs === 0
      ? 1
      : clamp((elapsed - delayMs) / durationMs, 0, 1);
    update(easeValue(easing, linearProgress));
    if (linearProgress >= 1) {
      complete();
      return false;
    }
    return true;
  };

  removeFrameTask = addFrameTask(frame);
  return {
    cancel(): void {
      if (!running) return;
      running = false;
      removeFrameTask();
    },
    finish(): void {
      if (!running) return;
      removeFrameTask();
      update(1);
      complete();
    },
    active: () => running,
  };
}

interface SpringSample {
  readonly progress: number;
  readonly velocity: number;
}

interface SpringModel {
  readonly omega: number;
  readonly damping: number;
  readonly dampedOmega: number;
  readonly r1: number;
  readonly r2: number;
}

const springModels = new WeakMap<MotionSpringSpec, SpringModel>();
const FLOAT_VISIBILITY_THRESHOLD = 0.01;

function springModel(spec: MotionSpringSpec): SpringModel {
  const cached = springModels.get(spec);
  if (cached) return cached;

  const stiffness = Math.max(0.0001, spec.stiffness);
  const damping = Math.max(0, spec.damping);
  const omega = Math.sqrt(stiffness);
  const dampedOmega = damping < 1 ? omega * Math.sqrt(1 - damping * damping) : 0;
  const root = damping > 1 ? Math.sqrt(damping * damping - 1) : 0;
  const model: SpringModel = {
    omega,
    damping,
    dampedOmega,
    r1: damping > 1 ? -omega * (damping - root) : -omega,
    r2: damping > 1 ? -omega * (damping + root) : -omega,
  };
  springModels.set(spec, model);
  return model;
}

function sampleSpring(model: SpringModel, seconds: number, initialVelocity: number): SpringSample {
  const { omega, damping } = model;
  const displacement0 = -1;

  if (damping < 1) {
    const coefficient = (initialVelocity + damping * omega * displacement0) / model.dampedOmega;
    const decay = Math.exp(-damping * omega * seconds);
    const cosine = Math.cos(model.dampedOmega * seconds);
    const sine = Math.sin(model.dampedOmega * seconds);
    const displacement = decay * (displacement0 * cosine + coefficient * sine);
    const velocity = decay * (
      -damping * omega * (displacement0 * cosine + coefficient * sine)
      + (-displacement0 * model.dampedOmega * sine + coefficient * model.dampedOmega * cosine)
    );
    return { progress: 1 + displacement, velocity };
  }

  if (damping === 1) {
    const coefficient = initialVelocity + omega * displacement0;
    const decay = Math.exp(-omega * seconds);
    const displacement = (displacement0 + coefficient * seconds) * decay;
    const velocity = (coefficient - omega * (displacement0 + coefficient * seconds)) * decay;
    return { progress: 1 + displacement, velocity };
  }

  const coefficient1 = (initialVelocity - displacement0 * model.r2) / (model.r1 - model.r2);
  const coefficient2 = displacement0 - coefficient1;
  const first = coefficient1 * Math.exp(model.r1 * seconds);
  const second = coefficient2 * Math.exp(model.r2 * seconds);
  return {
    progress: 1 + first + second,
    velocity: model.r1 * first + model.r2 * second,
  };
}

function estimateUnderDamped(
  rootReal: number,
  rootImaginary: number,
  position: number,
  velocity: number,
  delta: number,
): number {
  const c1 = position;
  const c2 = (velocity - rootReal * c1) / rootImaginary;
  const envelope = Math.sqrt(c1 * c1 + c2 * c2);
  return Math.log(delta / envelope) / rootReal;
}

function estimateCritical(
  root: number,
  position: number,
  velocity: number,
  delta: number,
): number {
  const c1 = position;
  const c2 = velocity - root * c1;
  const t1 = Math.log(Math.abs(delta / c1)) / root;
  const guess = Math.log(Math.abs(delta / c2));
  let t2 = guess;
  for (let iteration = 0; iteration <= 5; iteration += 1) {
    t2 = guess - Math.log(Math.abs(t2 / root));
  }
  t2 /= root;

  let current = !Number.isFinite(t1) ? t2 : !Number.isFinite(t2) ? t1 : Math.max(t1, t2);
  const inflectionTime = -(root * c1 + c2) / (root * c2);
  const inflectionValue = (c1 + c2 * inflectionTime) * Math.exp(root * inflectionTime);

  let signedDelta: number;
  if (!Number.isFinite(inflectionTime) || inflectionTime <= 0) {
    signedDelta = -delta;
  } else if (-inflectionValue < delta) {
    if (c2 < 0 && c1 > 0) current = 0;
    signedDelta = -delta;
  } else {
    current = -(2 / root) - c1 / c2;
    signedDelta = delta;
  }

  let difference = Number.POSITIVE_INFINITY;
  for (let iteration = 0; difference > 0.001 && iteration < 100; iteration += 1) {
    const previous = current;
    const exponential = Math.exp(root * current);
    const value = (c1 + c2 * current) * exponential + signedDelta;
    const derivative = (c2 * (root * current + 1) + c1 * root) * exponential;
    if (!Number.isFinite(derivative) || Math.abs(derivative) < 1e-12) break;
    current -= value / derivative;
    difference = Math.abs(previous - current);
  }
  return current;
}

function estimateOverDamped(
  r1: number,
  r2: number,
  position: number,
  velocity: number,
  delta: number,
): number {
  const c2 = (r1 * position - velocity) / (r1 - r2);
  const c1 = position - c2;
  const t1 = Math.log(Math.abs(delta / c1)) / r1;
  const t2 = Math.log(Math.abs(delta / c2)) / r2;
  let current = !Number.isFinite(t1) ? t2 : !Number.isFinite(t2) ? t1 : Math.max(t1, t2);

  const inflectionTime = Math.log((c1 * r1) / (-c2 * r2)) / (r2 - r1);
  const inflectionValue = c1 * Math.exp(r1 * inflectionTime) + c2 * Math.exp(r2 * inflectionTime);
  let signedDelta: number;
  if (!Number.isFinite(inflectionTime) || inflectionTime <= 0) {
    signedDelta = -delta;
  } else if (-inflectionValue < delta) {
    if (c2 > 0 && c1 < 0) current = 0;
    signedDelta = -delta;
  } else {
    current = Math.log(-(c2 * r2 * r2) / (c1 * r1 * r1)) / (r1 - r2);
    signedDelta = delta;
  }

  let difference = Number.POSITIVE_INFINITY;
  for (let iteration = 0; difference > 0.001 && iteration < 100; iteration += 1) {
    const previous = current;
    const first = c1 * Math.exp(r1 * current);
    const second = c2 * Math.exp(r2 * current);
    const derivative = first * r1 + second * r2;
    if (!Number.isFinite(derivative) || Math.abs(derivative) < 1e-12) break;
    current -= (first + second + signedDelta) / derivative;
    difference = Math.abs(previous - current);
  }
  return current;
}

function springDurationSeconds(model: SpringModel, initialVelocity: number): number {
  if (model.damping === 0) return 10;

  const initialDisplacement = -1 / FLOAT_VISIBILITY_THRESHOLD;
  const velocity = initialVelocity / FLOAT_VISIBILITY_THRESHOLD;
  const position = Math.abs(initialDisplacement);
  const directedVelocity = initialDisplacement < 0 ? -velocity : velocity;
  let duration: number;

  if (model.damping < 1) {
    duration = estimateUnderDamped(
      -model.damping * model.omega,
      model.dampedOmega,
      position,
      directedVelocity,
      1,
    );
  } else if (model.damping === 1) {
    duration = estimateCritical(-model.omega, position, directedVelocity, 1);
  } else {
    duration = estimateOverDamped(model.r1, model.r2, position, directedVelocity, 1);
  }

  return Number.isFinite(duration) ? Math.max(0, Math.min(10, duration)) : 10;
}

export function spring(
  spec: MotionSpringSpec,
  update: (progress: number) => void,
  options: MotionSpringOptions = {},
): MotionHandle {
  const delayMs = Math.max(0, (options.delay ?? 0) * 1000);
  const initialVelocity = options.initialVelocity ?? 0;
  const model = springModel(spec);
  const durationSeconds = springDurationSeconds(model, initialVelocity);
  let startTime: number | undefined;
  let running = true;
  let completed = false;
  let removeFrameTask: () => void = () => undefined;

  const complete = (): void => {
    if (completed) return;
    completed = true;
    running = false;
    update(1);
    options.onComplete?.();
  };

  const frame: FrameTask = (timestamp) => {
    if (!running) return false;
    startTime ??= timestamp;
    const elapsed = timestamp - startTime;
    if (elapsed < delayMs) return true;

    const seconds = (elapsed - delayMs) / 1000;
    if (seconds >= durationSeconds) {
      complete();
      return false;
    }
    update(sampleSpring(model, seconds, initialVelocity).progress);
    return true;
  };

  removeFrameTask = addFrameTask(frame);
  return {
    cancel(): void {
      if (!running) return;
      running = false;
      removeFrameTask();
    },
    finish(): void {
      if (!running) return;
      removeFrameTask();
      complete();
    },
    active: () => running,
  };
}

export function delay(seconds: number, callback: () => void): MotionHandle {
  let running = true;
  const timeoutId = window.setTimeout(() => {
    if (!running) return;
    running = false;
    callback();
  }, Math.max(0, seconds * 1000));

  return {
    cancel(): void {
      if (!running) return;
      running = false;
      clearTimeout(timeoutId);
    },
    finish(): void {
      if (!running) return;
      running = false;
      clearTimeout(timeoutId);
      callback();
    },
    active: () => running,
  };
}
