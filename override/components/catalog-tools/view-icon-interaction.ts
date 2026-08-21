import { queries } from '../../core/variables.js';
import { motion } from '../../motion/main.js';
import type { MotionHandle } from '../../motion/types.js';

type OffsetPair = readonly [number, number];

const HOVER_OFFSETS: readonly OffsetPair[] = [
  [0.58, 0.38], [-0.58, 0.38], [0.58, 0], [-0.58, 0], [0.58, -0.38], [-0.58, -0.38],
];
const PRESS_OFFSETS: readonly OffsetPair[] = [
  [0.82, 0.52], [-0.82, 0.52], [0.82, 0], [-0.82, 0], [0.82, -0.52], [-0.82, -0.52],
];
const HOME_OFFSETS: readonly OffsetPair[] = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]];

export class CatalogViewIconInteraction {
  readonly #button: HTMLButtonElement;
  readonly #shapes: SVGRectElement[];
  #handles: MotionHandle[] = [];
  #hovering = false;
  #focused = false;
  #pressed = false;
  #destroyed = false;

  constructor(button: HTMLButtonElement, host: SVGElement) {
    this.#button = button;
    this.#shapes = Array.from(host.querySelectorAll<SVGRectElement>('[data-sc-view-shape]'));
  }

  install(): () => void {
    if (this.#shapes.length !== 6) return () => undefined;

    this.#button.addEventListener('pointerenter', this.#onPointerEnter);
    this.#button.addEventListener('pointerleave', this.#onPointerLeave);
    this.#button.addEventListener('pointerdown', this.#onPointerDown);
    this.#button.addEventListener('pointerup', this.#onPointerUp);
    this.#button.addEventListener('pointercancel', this.#onPointerLeave);
    this.#button.addEventListener('focus', this.#onFocus);
    this.#button.addEventListener('blur', this.#onBlur);
    this.#button.addEventListener('keydown', this.#onKeyDown);
    this.#button.addEventListener('keyup', this.#onKeyUp);

    return () => this.destroy();
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#button.removeEventListener('pointerenter', this.#onPointerEnter);
    this.#button.removeEventListener('pointerleave', this.#onPointerLeave);
    this.#button.removeEventListener('pointerdown', this.#onPointerDown);
    this.#button.removeEventListener('pointerup', this.#onPointerUp);
    this.#button.removeEventListener('pointercancel', this.#onPointerLeave);
    this.#button.removeEventListener('focus', this.#onFocus);
    this.#button.removeEventListener('blur', this.#onBlur);
    this.#button.removeEventListener('keydown', this.#onKeyDown);
    this.#button.removeEventListener('keyup', this.#onKeyUp);
    this.#stop();
    for (const shape of this.#shapes) {
      shape.style.removeProperty('transform');
      shape.style.removeProperty('will-change');
    }
  }

  #focusVisible(): boolean {
    try {
      return this.#button.matches(':focus-visible');
    } catch {
      return document.activeElement === this.#button;
    }
  }

  #stop(): void {
    for (const handle of this.#handles) handle.cancel();
    this.#handles = [];
  }

  #apply(offsets: readonly OffsetPair[], duration: number, ease: string): void {
    if (this.#destroyed) return;
    this.#stop();
    if (queries.reducedMotion.matches) {
      for (const shape of this.#shapes) {
        shape.style.removeProperty('transform');
        shape.style.removeProperty('will-change');
      }
      return;
    }

    this.#handles = this.#shapes.map((shape, index) => {
      const [x, y] = offsets[index] ?? [0, 0];
      return motion.engine.transform(shape, { x, y }, {
        duration,
        delay: index * 0.004,
        ease,
        onComplete: () => shape.style.removeProperty('will-change'),
      });
    });
  }

  #active(): void {
    this.#apply(HOVER_OFFSETS, 0.068, 'quart.out');
  }

  #home(): void {
    this.#apply(HOME_OFFSETS, 0.09, 'quart.out');
  }

  #press(): void {
    this.#apply(PRESS_OFFSETS, 0.042, 'cubic.out');
  }

  #onPointerEnter = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') return;
    this.#hovering = true;
    if (!this.#pressed) this.#active();
  };

  #onPointerLeave = (): void => {
    this.#hovering = false;
    this.#pressed = false;
    this.#focused ? this.#active() : this.#home();
  };

  #onPointerDown = (): void => {
    this.#pressed = true;
    this.#press();
  };

  #onPointerUp = (): void => {
    this.#pressed = false;
    this.#hovering || this.#focused ? this.#active() : this.#home();
  };

  #onFocus = (): void => {
    if (!this.#focusVisible()) return;
    this.#focused = true;
    if (!this.#pressed) this.#active();
  };

  #onBlur = (): void => {
    this.#focused = false;
    this.#pressed = false;
    this.#hovering ? this.#active() : this.#home();
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return;
    this.#pressed = true;
    this.#press();
  };

  #onKeyUp = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    this.#pressed = false;
    this.#hovering || this.#focused ? this.#active() : this.#home();
  };
}
