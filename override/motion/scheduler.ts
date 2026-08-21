import { clamp, easeValue } from './easing.js';
import type {
  MotionHandle,
  MotionSpringOptions,
  MotionSpringSpec,
  MotionTweenOptions,
} from './types.js';

const MOTION_RATE = 1.05;

export function tween(
  duration: number,
  easing: string | undefined,
  update: (progress: number) => void,
  options: MotionTweenOptions = {},
): MotionHandle {
  const delayMs = Math.max(0, ((options.delay ?? 0) * 1000) / MOTION_RATE);
  const durationMs = Math.max(0, (duration * 1000) / MOTION_RATE);
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
    if (elapsed < delayMs) {
      frameId = requestAnimationFrame(frame);
      return;
    }

    const linearProgress = durationMs === 0
      ? 1
      : clamp((elapsed - delayMs) / durationMs, 0, 1);
    update(easeValue(easing, linearProgress));
    if (linearProgress >= 1) {
      complete();
      return;
    }
    frameId = requestAnimationFrame(frame);
  };

  frameId = requestAnimationFrame(frame);
  return {
    cancel(): void {
      if (!running) return;
      running = false;
      cancelAnimationFrame(frameId);
    },
    finish(): void {
      if (!running) return;
      cancelAnimationFrame(frameId);
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

function sampleSpring(spec: MotionSpringSpec, seconds: number, initialVelocity: number): SpringSample {
  const stiffness = Math.max(0.0001, spec.stiffness);
  const damping = Math.max(0, spec.damping);
  const omega = Math.sqrt(stiffness);
  const displacement0 = -1;

  if (damping < 1) {
    const dampedOmega = omega * Math.sqrt(1 - damping * damping);
    const coefficient = (initialVelocity + damping * omega * displacement0) / dampedOmega;
    const decay = Math.exp(-damping * omega * seconds);
    const cosine = Math.cos(dampedOmega * seconds);
    const sine = Math.sin(dampedOmega * seconds);
    const displacement = decay * (displacement0 * cosine + coefficient * sine);
    const velocity = decay * (
      -damping * omega * (displacement0 * cosine + coefficient * sine)
      + (-displacement0 * dampedOmega * sine + coefficient * dampedOmega * cosine)
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

  const root = Math.sqrt(damping * damping - 1);
  const r1 = -omega * (damping - root);
  const r2 = -omega * (damping + root);
  const coefficient1 = (initialVelocity - displacement0 * r2) / (r1 - r2);
  const coefficient2 = displacement0 - coefficient1;
  const first = coefficient1 * Math.exp(r1 * seconds);
  const second = coefficient2 * Math.exp(r2 * seconds);
  return {
    progress: 1 + first + second,
    velocity: r1 * first + r2 * second,
  };
}

export function spring(
  spec: MotionSpringSpec,
  update: (progress: number) => void,
  options: MotionSpringOptions = {},
): MotionHandle {
  const delayMs = Math.max(0, ((options.delay ?? 0) * 1000) / MOTION_RATE);
  const initialVelocity = options.initialVelocity ?? 0;
  let frameId = 0;
  let startTime: number | undefined;
  let running = true;
  let completed = false;

  const complete = (): void => {
    if (completed) return;
    completed = true;
    running = false;
    update(1);
    options.onComplete?.();
  };

  const frame = (timestamp: number): void => {
    if (!running) return;
    startTime ??= timestamp;
    const elapsed = timestamp - startTime;
    if (elapsed < delayMs) {
      frameId = requestAnimationFrame(frame);
      return;
    }

    const seconds = ((elapsed - delayMs) / 1000) * MOTION_RATE;
    const sample = sampleSpring(spec, seconds, initialVelocity);
    update(sample.progress);
    const settled = Math.abs(1 - sample.progress) <= 0.001 && Math.abs(sample.velocity) <= 0.001;
    if (settled || seconds >= 10) {
      complete();
      return;
    }
    frameId = requestAnimationFrame(frame);
  };

  frameId = requestAnimationFrame(frame);
  return {
    cancel(): void {
      if (!running) return;
      running = false;
      cancelAnimationFrame(frameId);
    },
    finish(): void {
      if (!running) return;
      cancelAnimationFrame(frameId);
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
  }, Math.max(0, (seconds * 1000) / MOTION_RATE));

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
