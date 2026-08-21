export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function easeValue(name: string | undefined, progress: number): number {
  const x = clamp(progress, 0, 1);
  const key = (name ?? 'linear').toLowerCase();

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
    default: return 1 - (1 - x) ** 3;
  }
}
