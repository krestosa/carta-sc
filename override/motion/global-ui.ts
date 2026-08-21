import { motionTokens } from '../core/variables.js';
import { motion } from './main.js';
import type { MotionHandle } from './types.js';

const EVENT = 'shown.bs.dropdown.scUxMotion';
const DURATION = 0.16;
const REDUCED_DURATION = 0.12;
const OFFSET_Y = -3;
const active = new WeakMap<HTMLElement, MotionHandle[]>();
let initialized = false;

function stop(menu: HTMLElement): void {
  for (const handle of active.get(menu) ?? []) handle.cancel();
  active.delete(menu);
}

function clear(menu: HTMLElement): void {
  for (const property of ['transform', 'opacity', 'visibility', 'will-change']) menu.style.removeProperty(property);
}

function onShown(event: Event): void {
  if (!window.jQuery) return;
  const node = window.jQuery(event.target).find('> .dropdown-menu, .dropdown-menu').first()[0];
  if (!(node instanceof HTMLElement)) return;

  const reduced = motion.reduced();
  const duration = reduced ? REDUCED_DURATION : DURATION;
  stop(node);
  node.style.opacity = '0';
  node.style.visibility = 'visible';
  node.style.transform = reduced ? 'translate3d(0,0,0)' : `translate3d(0,${OFFSET_Y}px,0)`;
  const handles: MotionHandle[] = [
    motion.engine.opacity(node, 1, { duration, ease: motionTokens.easings.out, clear: true }),
    motion.engine.transform(node, { y: 0 }, {
      duration,
      ease: motionTokens.easings.out,
      clear: true,
      onComplete: () => {
        active.delete(node);
        clear(node);
      },
    }),
  ];
  active.set(node, handles);
}

export function initializeGlobalUiMotion(): () => void {
  if (initialized || !window.jQuery) return destroyGlobalUiMotion;
  initialized = true;
  window.jQuery(document).off(EVENT, onShown).on(EVENT, onShown);
  return destroyGlobalUiMotion;
}

export function destroyGlobalUiMotion(): void {
  if (window.jQuery) window.jQuery(document).off(EVENT, onShown);
  initialized = false;
}

