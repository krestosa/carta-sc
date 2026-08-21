import type { Cleanup } from '../../core/types.js';
import { motionTokens } from '../../core/variables.js';
import { motion } from '../../motion/main.js';
import type { MotionHandle } from '../../motion/types.js';

const SELECTOR = '.sc-theme-toggle, .sc-catalog-view-toggle';
const REST_RADIUS = 20;
const PRESSED_RADIUS = 8;

interface ControlState {
  radius: number;
  handle: MotionHandle | null;
}

const states = new WeakMap<HTMLElement, ControlState>();

function stateFor(control: HTMLElement): ControlState {
  const existing = states.get(control);
  if (existing) return existing;
  const created: ControlState = { radius: REST_RADIUS, handle: null };
  states.set(control, created);
  return created;
}

function setRadius(control: HTMLElement, target: number): void {
  const state = stateFor(control);
  state.handle?.cancel();
  state.handle = null;

  const apply = (radius: number): void => {
    state.radius = radius;
    control.style.setProperty('--sc-icon-control-radius', `${radius}px`);
  };

  if (motion.reduced()) {
    apply(target);
    return;
  }

  const start = state.radius;
  const delta = target - start;
  if (Math.abs(delta) < 0.01) {
    apply(target);
    return;
  }

  const ran = motion.runLoaded(({ engine }) => {
    state.handle = engine.spring(
      motionTokens.springs.effects.default,
      (progress) => apply(start + delta * progress),
      {
        onComplete: () => {
          apply(target);
          state.handle = null;
        },
      },
    );
  });

  if (!ran) apply(target);
}

function bindControl(control: HTMLElement): Cleanup {
  const press = (): void => setRadius(control, PRESSED_RADIUS);
  const release = (): void => setRadius(control, REST_RADIUS);

  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || control.matches(':disabled')) return;
    try {
      control.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is optional; release events still restore the shape.
    }
    press();
  };

  const onPointerUp = (event: PointerEvent): void => {
    if (control.hasPointerCapture(event.pointerId)) control.releasePointerCapture(event.pointerId);
    release();
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat || (event.key !== ' ' && event.key !== 'Enter')) return;
    press();
  };

  const onKeyUp = (event: KeyboardEvent): void => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    release();
  };

  control.style.setProperty('--sc-icon-control-radius', `${REST_RADIUS}px`);
  control.addEventListener('pointerdown', onPointerDown);
  control.addEventListener('pointerup', onPointerUp);
  control.addEventListener('pointercancel', release);
  control.addEventListener('lostpointercapture', release);
  control.addEventListener('keydown', onKeyDown);
  control.addEventListener('keyup', onKeyUp);
  control.addEventListener('blur', release);

  return () => {
    const state = stateFor(control);
    state.handle?.cancel();
    state.handle = null;
    control.removeEventListener('pointerdown', onPointerDown);
    control.removeEventListener('pointerup', onPointerUp);
    control.removeEventListener('pointercancel', release);
    control.removeEventListener('lostpointercapture', release);
    control.removeEventListener('keydown', onKeyDown);
    control.removeEventListener('keyup', onKeyUp);
    control.removeEventListener('blur', release);
    control.style.removeProperty('--sc-icon-control-radius');
    states.delete(control);
  };
}

export function installIconControlMotion(root: ParentNode): Cleanup {
  const cleanups = [...root.querySelectorAll<HTMLElement>(SELECTOR)].map(bindControl);
  return () => {
    for (const cleanup of cleanups.reverse()) cleanup();
  };
}
