// Explica la responsabilidad de este archivo dentro del código propio y mantiene su lógica en el ámbito que le corresponde.
import { systemTokens } from '../core/tokens.generated.js';
import type { MotionSpringSpec } from './types.js';

type SpringPreset = Readonly<MotionSpringSpec>;
type SpringGroup = Readonly<Record<string, SpringPreset>>;

const preset = (value: { readonly stiffness: number; readonly damping: number }): SpringPreset =>
  Object.freeze({ stiffness: value.stiffness, damping: value.damping });

const spring = systemTokens.motion.springs;

export const motionSprings = Object.freeze({
  spatial: Object.freeze({
    fast: preset(spring.spatial.fast),
    default: preset(spring.spatial.default),
    slow: preset(spring.spatial.slow),
  }) satisfies SpringGroup,
  effects: Object.freeze({
    fast: preset(spring.effects.fast),
    default: preset(spring.effects.default),
    slow: preset(spring.effects.slow),
  }) satisfies SpringGroup,
  indicator: Object.freeze({
    soft: preset(spring.indicator.soft),
    firm: preset(spring.indicator.firm),
  }) satisfies SpringGroup,
  focus: preset(spring.focus),
});
