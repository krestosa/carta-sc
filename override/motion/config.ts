import { tokenMotion } from '../core/tokens.generated.js';
import { motionSprings } from './springs.js';

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
  springs: motionSprings,
});

export type MotionConfig = typeof motionConfig;
