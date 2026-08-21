import { motionTokens, queries } from '../core/variables.js';
import { motion } from './main.js';
import type { MotionHandle } from './types.js';

const CLOSED_SCALE = 0.8;
const OPEN_SCALE = 1;

interface PopoverEntry {
  handles: MotionHandle[];
  token: number;
}

class AnchoredPopoverMotion {
  readonly #entries = new WeakMap<HTMLElement, PopoverEntry>();

  open(surface: HTMLElement, anchor: HTMLElement): void {
    const entry = this.#entry(surface);
    this.#cancelEntry(entry);
    const token = ++entry.token;
    this.#setOrigin(surface, anchor);
    surface.style.visibility = 'visible';
    surface.style.pointerEvents = 'auto';

    if (queries.reducedMotion.matches) {
      this.#settleOpen(surface);
      return;
    }

    if (!surface.style.opacity) surface.style.opacity = '0';
    const current = motion.engine.currentTransform(surface);
    if (!surface.style.transform || Math.abs(current.scale - OPEN_SCALE) < 0.001) {
      surface.style.transform = `translate3d(${current.x}px,${current.y}px,0) rotate(${current.rotation}deg) scale(${CLOSED_SCALE})`;
    }

    let remaining = 2;
    const complete = (): void => {
      remaining -= 1;
      if (remaining > 0 || token !== entry.token) return;
      entry.handles = [];
      this.#settleOpen(surface);
    };

    entry.handles = [
      motion.engine.springTransform(surface, { scale: OPEN_SCALE }, motionTokens.springs.spatial.fast, { onComplete: complete }),
      motion.engine.springOpacity(surface, 1, motionTokens.springs.effects.fast, { onComplete: complete }),
    ];
  }

  close(surface: HTMLElement, anchor: HTMLElement, finalize: () => void): void {
    const entry = this.#entry(surface);
    this.#cancelEntry(entry);
    const token = ++entry.token;
    this.#setOrigin(surface, anchor);
    surface.style.visibility = 'visible';
    surface.style.pointerEvents = 'none';

    if (queries.reducedMotion.matches) {
      finalize();
      this.#settleClosed(surface);
      return;
    }

    let remaining = 2;
    const complete = (): void => {
      remaining -= 1;
      if (remaining > 0 || token !== entry.token) return;
      entry.handles = [];
      finalize();
      this.#settleClosed(surface);
    };

    entry.handles = [
      motion.engine.springTransform(surface, { scale: CLOSED_SCALE }, motionTokens.springs.spatial.fast, { onComplete: complete }),
      motion.engine.springOpacity(surface, 0, motionTokens.springs.effects.fast, { onComplete: complete }),
    ];
  }

  cancel(surface: HTMLElement): void {
    const entry = this.#entries.get(surface);
    if (!entry) return;
    this.#cancelEntry(entry);
    entry.token += 1;
  }

  #entry(surface: HTMLElement): PopoverEntry {
    const current = this.#entries.get(surface);
    if (current) return current;
    const entry: PopoverEntry = { handles: [], token: 0 };
    this.#entries.set(surface, entry);
    return entry;
  }

  #cancelEntry(entry: PopoverEntry): void {
    for (const handle of entry.handles.splice(0)) handle.cancel();
  }

  #setOrigin(surface: HTMLElement, anchor: HTMLElement): void {
    const surfaceRect = surface.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const x = Math.max(0, Math.min(surfaceRect.width, anchorRect.left + anchorRect.width / 2 - surfaceRect.left));
    const y = surfaceRect.top >= anchorRect.bottom
      ? 0
      : surfaceRect.bottom <= anchorRect.top
        ? surfaceRect.height
        : Math.max(0, Math.min(surfaceRect.height, anchorRect.top + anchorRect.height / 2 - surfaceRect.top));
    surface.style.transformOrigin = `${x}px ${y}px`;
  }

  #settleOpen(surface: HTMLElement): void {
    surface.style.removeProperty('opacity');
    surface.style.removeProperty('transform');
    surface.style.removeProperty('will-change');
    surface.style.removeProperty('visibility');
    surface.style.removeProperty('pointer-events');
  }

  #settleClosed(surface: HTMLElement): void {
    surface.style.removeProperty('opacity');
    surface.style.removeProperty('transform');
    surface.style.removeProperty('will-change');
    surface.style.removeProperty('visibility');
    surface.style.removeProperty('pointer-events');
    surface.style.removeProperty('transform-origin');
  }
}

export const anchoredPopoverMotion = new AnchoredPopoverMotion();
