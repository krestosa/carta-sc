import type { MotionSpringSpec } from './types.js';

type SpringPreset = Readonly<MotionSpringSpec>;

const preset = (stiffness: number, damping: number): SpringPreset => Object.freeze({ stiffness, damping });

export const motionSprings = Object.freeze({
  spatial: Object.freeze({
    fast: preset(1400, 0.9),
    default: preset(700, 0.9),
    slow: preset(300, 0.9),
  }),
  effects: Object.freeze({
    fast: preset(3800, 1),
    default: preset(1600, 1),
    slow: preset(800, 1),
  }),
  indicator: Object.freeze({
    soft: preset(500, 1),
    firm: preset(1000, 1),
  }),
  focus: preset(1500, 1),
});
