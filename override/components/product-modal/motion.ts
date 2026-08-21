import { motionTokens } from '../../core/variables.js';
import { motion } from '../../motion/main.js';
import type { MotionHandle } from '../../motion/types.js';
import { PRODUCT_MODAL_SELECTORS } from './view.js';

const MOTION = {
  openOffsetY: 10,
  openScale: 0.992,
  closeOffsetY: 6,
  closeScale: 0.994,
} as const;

interface ModalMotionState {
  token: number;
  handles: MotionHandle[];
}

const states = new WeakMap<HTMLElement, ModalMotionState>();

function stateFor(modal: HTMLElement): ModalMotionState {
  const existing = states.get(modal);
  if (existing) return existing;
  const created: ModalMotionState = { token: 0, handles: [] };
  states.set(modal, created);
  return created;
}

function nextToken(modal: HTMLElement): number {
  const state = stateFor(modal);
  state.token += 1;
  return state.token;
}

function isCurrent(modal: HTMLElement, token: number): boolean {
  return stateFor(modal).token === token;
}

function stop(modal: HTMLElement): void {
  const state = stateFor(modal);
  for (const handle of state.handles) handle.cancel();
  state.handles = [];
}

function register(modal: HTMLElement, handles: MotionHandle[]): void {
  stateFor(modal).handles = handles;
}

function clear(modal: HTMLElement, dialog: HTMLElement): void {
  for (const property of ['opacity', 'visibility', 'will-change']) modal.style.removeProperty(property);
  for (const property of ['transform', 'opacity', 'visibility', 'will-change']) dialog.style.removeProperty(property);
}

function setTransformOrigin(dialog: HTMLElement, source: HTMLElement | null): void {
  let value = '50% 50%';
  if (source && document.documentElement.contains(source)) {
    const sourceRect = source.getBoundingClientRect();
    const dialogRect = dialog.getBoundingClientRect();
    if (dialogRect.width > 0 && dialogRect.height > 0) {
      const x = Math.max(12, Math.min(88, ((sourceRect.left + sourceRect.width / 2 - dialogRect.left) / dialogRect.width) * 100));
      const y = Math.max(10, Math.min(90, ((sourceRect.top + sourceRect.height / 2 - dialogRect.top) / dialogRect.height) * 100));
      value = `${x.toFixed(2)}% ${y.toFixed(2)}%`;
    }
  }
  dialog.style.transformOrigin = value;
}

export function cancelModalMotion(modal: HTMLElement | null): void {
  if (!modal) return;
  nextToken(modal);
  stop(modal);
}

export function animateModalOpen(modal: HTMLElement | null, source: HTMLElement | null): void {
  if (!modal) return;
  const token = nextToken(modal);
  const dialog = modal.querySelector<HTMLElement>(PRODUCT_MODAL_SELECTORS.dialog);
  if (!dialog) return;

  setTransformOrigin(dialog, source);
  const ran = motion.run(({ engine }) => {
    stop(modal);
    modal.style.opacity = '0';
    modal.style.visibility = 'visible';
    dialog.style.opacity = '0';
    dialog.style.visibility = 'visible';
    dialog.style.transform = `translate3d(0,${MOTION.openOffsetY}px,0) scale(${MOTION.openScale})`;

    register(modal, [
      engine.opacity(modal, 1, {
        duration: motionTokens.durations.short3,
        ease: motionTokens.easings.decelerate,
      }),
      engine.opacity(dialog, 1, {
        duration: motionTokens.durations.short4,
        ease: motionTokens.easings.decelerate,
      }),
      engine.springTransform(dialog, { y: 0, scale: 1 }, motionTokens.springs.spatial.default, {
        onComplete: () => {
          if (!isCurrent(modal, token)) return;
          stateFor(modal).handles = [];
          clear(modal, dialog);
        },
      }),
    ]);
  });

  if (!ran) setTransformOrigin(dialog, source);
}

export function animateModalReopen(modal: HTMLElement | null, source: HTMLElement | null): void {
  if (!modal) return;
  const token = nextToken(modal);
  const dialog = modal.querySelector<HTMLElement>(PRODUCT_MODAL_SELECTORS.dialog);
  if (!dialog) return;

  setTransformOrigin(dialog, source);
  const ran = motion.runLoaded(({ engine }) => {
    stop(modal);
    modal.style.visibility = 'visible';
    dialog.style.visibility = 'visible';
    register(modal, [
      engine.opacity(modal, 1, {
        duration: motionTokens.durations.short2,
        ease: motionTokens.easings.decelerate,
      }),
      engine.opacity(dialog, 1, {
        duration: motionTokens.durations.short3,
        ease: motionTokens.easings.decelerate,
      }),
      engine.springTransform(dialog, { y: 0, scale: 1 }, motionTokens.springs.spatial.fast, {
        onComplete: () => {
          if (!isCurrent(modal, token)) return;
          stateFor(modal).handles = [];
          clear(modal, dialog);
        },
      }),
    ]);
  });

  if (!ran) {
    modal.style.removeProperty('opacity');
    modal.style.removeProperty('visibility');
  }
}

export function animateModalClose(modal: HTMLElement | null, done?: () => void): void {
  if (!modal) {
    done?.();
    return;
  }

  const token = nextToken(modal);
  if (motion.reduced()) {
    stop(modal);
    done?.();
    return;
  }

  const ran = motion.runLoaded(({ engine }) => {
    const dialog = modal.querySelector<HTMLElement>(PRODUCT_MODAL_SELECTORS.dialog);
    if (!dialog) {
      done?.();
      return;
    }

    stop(modal);
    register(modal, [
      engine.opacity(dialog, 0, {
        duration: motionTokens.durations.short2,
        ease: motionTokens.easings.accelerate,
      }),
      engine.springTransform(dialog, {
        y: MOTION.closeOffsetY,
        scale: MOTION.closeScale,
      }, motionTokens.springs.spatial.fast),
      engine.opacity(modal, 0, {
        duration: motionTokens.durations.short3,
        ease: motionTokens.easings.accelerate,
        onComplete: () => {
          if (!isCurrent(modal, token)) return;
          stateFor(modal).handles = [];
          done?.();
        },
      }),
    ]);
  });

  if (!ran) done?.();
}
