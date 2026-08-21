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

let cleanup: (() => void) | null = null;
let initialized = false;

function currentProfile(): CartScrollProfile {
  if (queries.desktop.matches) return PROFILES.desktop;
  if (queries.tablet.matches) return PROFILES.tablet;
  return PROFILES.mobile;
}

function mount(): void {
  cleanup?.();
  const reduced = queries.reducedMotion.matches;
  const engine = motion.engine;
  const cleanList = setupCartList(engine, reduced);
  const cleanScroll = setupCartScroll(engine, currentProfile(), reduced);
  const cleanBadges = setupCartBadges(engine, reduced);
  cleanup = () => {
    cleanList();
    cleanScroll();
    cleanBadges();
  };
}

export function initializeCartMotion(): () => void {
  if (initialized) return destroyCartMotion;
  initialized = true;

  motion.whenReady(() => mount());
  for (const query of [queries.mobile, queries.tablet, queries.desktop, queries.reducedMotion]) {
    query.addEventListener('change', mount);
  }
  return destroyCartMotion;
}

export function destroyCartMotion(): void {
  if (!initialized) return;
  initialized = false;
  for (const query of [queries.mobile, queries.tablet, queries.desktop, queries.reducedMotion]) {
    query.removeEventListener('change', mount);
  }
  cleanup?.();
  cleanup = null;
}
