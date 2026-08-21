import type { Cleanup } from '../../core/types.js';
import { queries } from '../../core/variables.js';
import { motion } from '../../motion/main.js';
import type { MotionEngine } from '../../motion/types.js';
import { setupReveal, type RevealProfile } from './reveal-motion.js';

const MEDIA_QUERIES = [queries.phone, queries.tablet, queries.desktop, queries.reducedMotion] as const;

class ProductCardMotionController {
  #cleanup: Cleanup | null = null;
  #initialized = false;

  initialize(): Cleanup {
    if (this.#initialized) return this.destroy;
    this.#initialized = true;
    motion.whenReady(({ engine }) => this.#mount(engine));
    for (const query of MEDIA_QUERIES) query.addEventListener('change', this.#remount);
    return this.destroy;
  }

  destroy = (): void => {
    if (!this.#initialized) return;
    this.#initialized = false;
    this.#cleanup?.();
    this.#cleanup = null;
    for (const query of MEDIA_QUERIES) query.removeEventListener('change', this.#remount);
  };

  #profile(): RevealProfile {
    if (queries.desktop.matches) return { initialY: 12, revealY: 16, threshold: 0.04 };
    if (queries.tablet.matches) return { initialY: 10, revealY: 14, threshold: 0.035 };
    return { initialY: 8, revealY: 12, threshold: 0.025 };
  }

  #mount(engine: MotionEngine): void {
    if (!this.#initialized) return;
    this.#cleanup?.();
    this.#cleanup = setupReveal(engine, this.#profile(), queries.reducedMotion.matches);
  }

  #remount = (): void => this.#mount(motion.engine);
}

const productCardMotion = new ProductCardMotionController();

export function initializeProductCardMotion(): Cleanup {
  return productCardMotion.initialize();
}

export function destroyProductCardMotion(): void {
  productCardMotion.destroy();
}
