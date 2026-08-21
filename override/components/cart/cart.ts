import type { Cleanup } from '../../core/types.js';
import { queries } from '../../core/variables.js';
import { motion } from '../../motion/main.js';
import { setupCartBadges } from './badge-motion.js';
import { setupCartList } from './list-motion.js';
import { setupCartScroll, type CartScrollProfile } from './scroll-motion.js';

const PROFILES = {
  mobile: { maxLag: 8, velocityScale: 0.0024 },
  tablet: { maxLag: 10, velocityScale: 0.0028 },
  desktop: { maxLag: 14, velocityScale: 0.0032 },
} as const satisfies Record<'mobile' | 'tablet' | 'desktop', CartScrollProfile>;

const MEDIA_QUERIES = [queries.mobile, queries.tablet, queries.desktop, queries.reducedMotion] as const;

class CartMotionController {
  #cleanup: Cleanup | null = null;
  #initialized = false;

  initialize(): Cleanup {
    if (this.#initialized) return this.destroy;
    this.#initialized = true;
    motion.whenReady(this.#mount);
    for (const query of MEDIA_QUERIES) query.addEventListener('change', this.#mount);
    return this.destroy;
  }

  destroy = (): void => {
    if (!this.#initialized) return;
    this.#initialized = false;
    for (const query of MEDIA_QUERIES) query.removeEventListener('change', this.#mount);
    this.#cleanup?.();
    this.#cleanup = null;
  };

  #profile(): CartScrollProfile {
    if (queries.desktop.matches) return PROFILES.desktop;
    if (queries.tablet.matches) return PROFILES.tablet;
    return PROFILES.mobile;
  }

  #mount = (): void => {
    if (!this.#initialized) return;
    this.#cleanup?.();
    const reduced = queries.reducedMotion.matches;
    const engine = motion.engine;
    const cleanups = [
      setupCartList(engine, reduced),
      setupCartScroll(engine, this.#profile(), reduced),
      setupCartBadges(engine, reduced),
    ];
    this.#cleanup = () => {
      for (const cleanup of cleanups.reverse()) cleanup();
    };
  };
}

const cartMotion = new CartMotionController();

export function initializeCartMotion(): Cleanup {
  return cartMotion.initialize();
}

export function destroyCartMotion(): void {
  cartMotion.destroy();
}
