import type { Cleanup } from '../core/types.js';
import { motionTokens } from '../core/variables.js';
import { motion } from './main.js';
import type { MotionHandle } from './types.js';

const EVENT = 'shown.bs.dropdown.scUxMotion';
const OFFSET_Y = -3;

class GlobalUiMotionController {
  readonly #active = new WeakMap<HTMLElement, MotionHandle[]>();
  #initialized = false;

  initialize(): Cleanup {
    if (this.#initialized || !window.jQuery) return this.destroy;
    this.#initialized = true;
    window.jQuery(document).off(EVENT, this.#onShown).on(EVENT, this.#onShown);
    return this.destroy;
  }

  destroy = (): void => {
    if (window.jQuery) window.jQuery(document).off(EVENT, this.#onShown);
    this.#initialized = false;
  };

  #stop(menu: HTMLElement): void {
    for (const handle of this.#active.get(menu) ?? []) handle.cancel();
    this.#active.delete(menu);
  }

  #clear(menu: HTMLElement): void {
    for (const property of ['transform', 'opacity', 'visibility', 'will-change']) {
      menu.style.removeProperty(property);
    }
  }

  #onShown = (event: Event): void => {
    if (!window.jQuery) return;
    const node = window.jQuery(event.target).find('> .dropdown-menu, .dropdown-menu').first()[0];
    if (!(node instanceof HTMLElement)) return;

    const reduced = motion.reduced();
    this.#stop(node);
    node.style.opacity = '0';
    node.style.visibility = 'visible';
    node.style.transform = reduced ? 'translate3d(0,0,0)' : `translate3d(0,${OFFSET_Y}px,0)`;

    const handles: MotionHandle[] = [
      motion.engine.opacity(node, 1, {
        duration: reduced ? motionTokens.durations.short2 : motionTokens.durations.short3,
        ease: motionTokens.easings.decelerate,
        clear: true,
      }),
    ];

    if (!reduced) {
      handles.push(motion.engine.springTransform(node, { y: 0 }, motionTokens.springs.spatial.fast, {
        clear: true,
        onComplete: () => {
          this.#active.delete(node);
          this.#clear(node);
        },
      }));
    } else {
      handles.push(motion.engine.delay(motionTokens.durations.short2, () => {
        this.#active.delete(node);
        this.#clear(node);
      }));
    }
    this.#active.set(node, handles);
  };
}

const globalUiMotion = new GlobalUiMotionController();

export function initializeGlobalUiMotion(): Cleanup {
  return globalUiMotion.initialize();
}

export function destroyGlobalUiMotion(): void {
  globalUiMotion.destroy();
}
