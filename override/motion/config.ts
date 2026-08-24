import { motionSprings } from './springs.js';

const durationMs = Object.freeze({
  short1: 50,
  short2: 100,
  short3: 150,
  short4: 200,
  medium1: 250,
  medium3: 350,
  medium4: 400,
  long3: 550,
} as const);

const curves = Object.freeze({
  standard: Object.freeze([0.2, 0, 0, 1] as const),
  accelerate: Object.freeze([0.3, 0, 1, 1] as const),
  decelerate: Object.freeze([0, 0, 0, 1] as const),
  linear: Object.freeze([0, 0, 1, 1] as const),
});

const cubicBezier = (curve: readonly number[]): string =>
  `cubic-bezier(${curve.join(', ')})`;

const cssEasings = Object.freeze({
  standard: cubicBezier(curves.standard),
  accelerate: cubicBezier(curves.accelerate),
  decelerate: cubicBezier(curves.decelerate),
  linear: cubicBezier(curves.linear),
});

const durations = Object.freeze({
  short1: durationMs.short1 / 1000,
  short2: durationMs.short2 / 1000,
  short3: durationMs.short3 / 1000,
  short4: durationMs.short4 / 1000,
  medium1: durationMs.medium1 / 1000,
  medium3: durationMs.medium3 / 1000,
  medium4: durationMs.medium4 / 1000,
  long3: durationMs.long3 / 1000,
});

const transitions = Object.freeze({
  fast: `${durationMs.short3}ms ${cssEasings.decelerate}`,
  standard: `${durationMs.short3}ms ${cssEasings.standard}`,
  icon: `${durationMs.short4}ms ${cssEasings.decelerate}`,
});

const motionCssVariables = Object.freeze({
  '--sc-motion-fast': `${durationMs.short3}ms`,
  '--sc-motion-icon': `${durationMs.short4}ms`,
  '--sc-motion-ease-out': cssEasings.decelerate,
  '--sc-transition-fast': transitions.fast,
  '--sc-transition-standard': transitions.standard,
  '--sc-transition-icon': transitions.icon,
});

export const motionConfig = Object.freeze({
  durationMs,
  durations,
  cssEasings,
  curves,
  transitions,
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

export function installMotionCssVariables(root: HTMLElement = document.documentElement): void {
  for (const [property, value] of Object.entries(motionCssVariables)) {
    root.style.setProperty(property, value);
  }
}

export type MotionConfig = typeof motionConfig;
