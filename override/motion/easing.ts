export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

interface CubicBezier {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

const BEZIERS: Readonly<Record<string, CubicBezier>> = Object.freeze({
  standard: { x1: 0.2, y1: 0, x2: 0, y2: 1 },
  'standard.accelerate': { x1: 0.3, y1: 0, x2: 1, y2: 1 },
  'standard.decelerate': { x1: 0, y1: 0, x2: 0, y2: 1 },
});

function cubicCoordinate(t: number, first: number, second: number): number {
  const inverse = 1 - t;
  return 3 * inverse * inverse * t * first + 3 * inverse * t * t * second + t * t * t;
}

function cubicDerivative(t: number, first: number, second: number): number {
  const inverse = 1 - t;
  return 3 * inverse * inverse * first
    + 6 * inverse * t * (second - first)
    + 3 * t * t * (1 - second);
}

function cubicBezierValue(curve: CubicBezier, progress: number): number {
  const x = clamp(progress, 0, 1);
  if (x === 0 || x === 1) return x;

  let t = x;
  for (let iteration = 0; iteration < 8; iteration += 1) {
    const estimate = cubicCoordinate(t, curve.x1, curve.x2) - x;
    if (Math.abs(estimate) < 1e-7) break;
    const derivative = cubicDerivative(t, curve.x1, curve.x2);
    if (Math.abs(derivative) < 1e-7) break;
    t = clamp(t - estimate / derivative, 0, 1);
  }

  let low = 0;
  let high = 1;
  for (let iteration = 0; iteration < 12; iteration += 1) {
    const estimate = cubicCoordinate(t, curve.x1, curve.x2);
    if (Math.abs(estimate - x) < 1e-7) break;
    if (estimate < x) low = t;
    else high = t;
    t = (low + high) / 2;
  }

  return cubicCoordinate(t, curve.y1, curve.y2);
}

export function easeValue(name: string | undefined, progress: number): number {
  const x = clamp(progress, 0, 1);
  const key = (name ?? 'linear').toLowerCase();
  const bezier = BEZIERS[key];
  if (bezier) return cubicBezierValue(bezier, x);

  switch (key) {
    case 'none':
    case 'linear': return x;
    case 'quad.in': return x * x;
    case 'quad.out': return 1 - (1 - x) ** 2;
    case 'quad.inout': return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
    case 'cubic.in': return x ** 3;
    case 'cubic.out': return 1 - (1 - x) ** 3;
    case 'cubic.inout': return x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
    case 'quart.in': return x ** 4;
    case 'quart.out': return 1 - (1 - x) ** 4;
    case 'quart.inout': return x < 0.5 ? 8 * x ** 4 : 1 - (-2 * x + 2) ** 4 / 2;
    case 'quint.in': return x ** 5;
    case 'quint.out': return 1 - (1 - x) ** 5;
    case 'quint.inout': return x < 0.5 ? 16 * x ** 5 : 1 - (-2 * x + 2) ** 5 / 2;
    case 'sine.in': return 1 - Math.cos((x * Math.PI) / 2);
    case 'sine.out': return Math.sin((x * Math.PI) / 2);
    case 'sine.inout': return -(Math.cos(Math.PI * x) - 1) / 2;
    default: return cubicBezierValue(BEZIERS.standard, x);
  }
}
