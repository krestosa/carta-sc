import { delay, spring, tween } from './scheduler.js';
import type {
  MotionHandle,
  MotionPropertyOptions,
  MotionSpringOptions,
  MotionSpringSpec,
} from './types.js';

type Point = readonly [x: number, y: number];

interface SampledPath {
  readonly points: Point[];
  readonly closed: boolean;
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const PATH_SAMPLE_COUNT = 64;
const ALIGNMENT_SAMPLE_TARGET = 16;

function splitPathData(data: string): string[] {
  return data.match(/[Mm][^Mm]*/g) ?? [data];
}

function samplePath(svg: SVGSVGElement, data: string, count: number): SampledPath | null {
  const probe = document.createElementNS(SVG_NAMESPACE, 'path');
  probe.setAttribute('d', data);
  probe.setAttribute('visibility', 'hidden');
  probe.setAttribute('pointer-events', 'none');
  svg.appendChild(probe);

  try {
    const length = probe.getTotalLength();
    if (!Number.isFinite(length) || length <= 0) return null;
    const closed = /[zZ]\s*$/.test(data);
    const points = Array.from({ length: count }, (_, index): Point => {
      const ratio = closed ? index / count : count === 1 ? 0 : index / (count - 1);
      const point = probe.getPointAtLength(length * ratio);
      return [point.x, point.y];
    });
    return { points, closed };
  } catch {
    return null;
  } finally {
    probe.remove();
  }
}

function samplePathSet(svg: SVGSVGElement, data: string, count: number): SampledPath[] | null {
  const result: SampledPath[] = [];
  for (const part of splitPathData(data)) {
    const sampled = samplePath(svg, part, count);
    if (!sampled) return null;
    result.push(sampled);
  }
  return result;
}

function pointDistance(a: Point, b: Point): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

function alignPoints(source: Point[], target: Point[]): Point[] {
  if (source.length !== target.length || source.length < 2) return [...target];
  const count = source.length;
  const scoreStride = Math.max(1, Math.floor(count / ALIGNMENT_SAMPLE_TARGET));
  let best = [...target];
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidateBase of [target, [...target].reverse()]) {
    for (let shift = 0; shift < count; shift += 1) {
      let score = 0;
      for (let index = 0; index < count; index += scoreStride) {
        const sourcePoint = source[index] ?? source[0];
        const candidatePoint = candidateBase[(index + shift) % count] ?? candidateBase[0];
        if (sourcePoint && candidatePoint) score += pointDistance(sourcePoint, candidatePoint);
      }
      if (score >= bestScore) continue;
      bestScore = score;
      best = Array.from(
        { length: count },
        (_, index) => candidateBase[(index + shift) % count] ?? candidateBase[0]!,
      );
    }
  }
  return best;
}

function pathRenderer(target: SVGPathElement, toD: string): ((progress: number) => void) | null {
  const svg = target.ownerSVGElement;
  if (!svg || !toD) return null;

  const fromD = target.getAttribute('d') ?? '';
  const fromSet = samplePathSet(svg, fromD, PATH_SAMPLE_COUNT);
  const toSet = samplePathSet(svg, toD, PATH_SAMPLE_COUNT);
  if (!fromSet?.length || !toSet?.length) return null;

  const pairCount = Math.max(fromSet.length, toSet.length);
  const pairs = Array.from({ length: pairCount }, (_, index) => {
    const source = fromSet[Math.min(index, fromSet.length - 1)] ?? fromSet[0]!;
    const destination = toSet[Math.min(index, toSet.length - 1)] ?? toSet[0]!;
    return {
      from: source,
      to: { points: alignPoints(source.points, destination.points), closed: destination.closed },
    };
  });

  return (progress: number): void => {
    let data = '';
    for (const pair of pairs) {
      pair.from.points.forEach((fromPoint, index) => {
        const toPoint = pair.to.points[index];
        if (!toPoint) return;
        const x = fromPoint[0] + (toPoint[0] - fromPoint[0]) * progress;
        const y = fromPoint[1] + (toPoint[1] - fromPoint[1]) * progress;
        data += `${index === 0 ? 'M' : 'L'}${x.toFixed(3)} ${y.toFixed(3)}`;
      });
      if (pair.from.closed || pair.to.closed) data += 'Z';
    }
    target.setAttribute('d', data);
  };
}

export function animatePath(
  target: SVGPathElement,
  toD: string,
  options: MotionPropertyOptions,
): MotionHandle {
  const render = pathRenderer(target, toD);
  if (!render) {
    return tween(options.duration, options.ease, () => undefined, {
      delay: options.delay,
      onComplete: () => {
        target.setAttribute('d', toD);
        options.onComplete?.();
      },
    });
  }

  return tween(options.duration, options.ease, render, {
    delay: options.delay,
    onComplete: () => {
      target.setAttribute('d', toD);
      options.onComplete?.();
    },
  });
}

export function animateSpringPath(
  target: SVGPathElement,
  toD: string,
  spec: MotionSpringSpec,
  options: MotionSpringOptions = {},
): MotionHandle {
  const render = pathRenderer(target, toD);
  if (!render) {
    if (!target.ownerSVGElement || !toD) {
      target.setAttribute('d', toD);
      return delay(0, () => options.onComplete?.());
    }
    return spring(spec, () => undefined, {
      delay: options.delay,
      initialVelocity: options.initialVelocity,
      onComplete: () => {
        target.setAttribute('d', toD);
        options.onComplete?.();
      },
    });
  }

  return spring(spec, render, {
    delay: options.delay,
    initialVelocity: options.initialVelocity,
    onComplete: () => {
      target.setAttribute('d', toD);
      options.onComplete?.();
    },
  });
}
