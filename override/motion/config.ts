// Documenta la responsabilidad de config dentro del sistema propio de movimiento.
import { systemTokens } from '../core/tokens.generated.js';
import { motionSprings } from './springs.js';

const motion = systemTokens.motion;

export const motionConfig = Object.freeze({
  durationMs: motion.durationMs,
  durations: motion.durations,
  cssEasings: motion.cssEasings,
  curves: motion.curves,
  transitions: motion.transitions,
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
