import { tokenMotion } from '../core/tokens.generated.js';
import type { MotionSpringSpec } from './types.js';

const spring = (stiffness: number, damping: number): Readonly<MotionSpringSpec> =>
  Object.freeze({ stiffness, damping });

export const motionConfig = Object.freeze({
  durations: tokenMotion.durations,
  cssEasings: tokenMotion.cssEasings,
  curves: tokenMotion.curves,
  transitions: tokenMotion.transitions,
  easings: Object.freeze({
    standard: 'standard',
    accelerate: 'standard.accelerate',
    decelerate: 'standard.decelerate',
    linear: 'linear',
    out: 'standard.decelerate',
    strongOut: 'standard.decelerate',
    in: 'standard.accelerate',
    inOut: 'standard',
  }),
  springs: Object.freeze({
    spatial: Object.freeze({
      fast: spring(1400, 0.9),
      default: spring(700, 0.9),
      slow: spring(300, 0.9),
    }),
    effects: Object.freeze({
      fast: spring(3800, 1),
      default: spring(1600, 1),
      slow: spring(800, 1),
    }),
    indicator: Object.freeze({
      soft: spring(500, 1),
      firm: spring(1000, 1),
    }),
    focus: spring(1500, 1),
  }),
});

export type MotionConfig = typeof motionConfig;
