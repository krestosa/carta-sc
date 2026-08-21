import { clamp, easeValue } from './easing.js';
import type { MotionHandle, MotionTweenOptions } from './types.js';

export function tween(
  duration: number,
  easing: string | undefined,
  update: (progress: number) => void,
  options: MotionTweenOptions = {},
): MotionHandle {
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
