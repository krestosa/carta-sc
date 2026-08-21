import { media, queries } from '../core/variables.js';
import { easeValue } from './easing.js';
import { bindMicroInteraction as bindMicroInteractionBehavior } from './micro-interaction.js';
import { animatePath } from './path.js';
import { animateAttributes, animateOpacity, animateTransform, currentTransform } from './properties.js';
import { delay, tween } from './scheduler.js';
import type {
  MicroInteractionOptions,
  MotionDependencies,
  MotionEngine,
  MotionRuntime,
} from './types.js';

type MotionCallback = (dependencies: MotionDependencies) => void;

const readyQueue: MotionCallback[] = [];
const root = document.documentElement;

let unlocked = false;
let refreshTimer = 0;

root.classList.add('sc-motion-engine-ready');

export const prefersReducedMotion = (): boolean =>
  (queries.reducedMotion ?? window.matchMedia(media.reducedMotion)).matches;

export const motionEngine: MotionEngine = Object.freeze({
  tween,
  delay,
  transform: animateTransform,
  opacity: animateOpacity,
  attributes: animateAttributes,
  path: animatePath,
  currentTransform,
  ease: easeValue,
});

const dependencies: MotionDependencies = Object.freeze({ engine: motionEngine });
const dependencyPromise = Promise.resolve(dependencies);

function execute(callback: MotionCallback): void {
  try {
    callback(dependencies);
  } catch (error) {
    console.error('[SushiClub motion]', error);
  }
}

function flushReadyQueue(): void {
  for (const callback of readyQueue.splice(0)) execute(callback);
}

function refresh(delayMs: number | null = 0): void {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    refreshTimer = 0;
    window.dispatchEvent(new CustomEvent('sc:motionrefresh'));
  }, Math.max(0, delayMs ?? 0));
}

function bindMicroInteraction(
  control: HTMLElement,
  target: HTMLElement | SVGElement,
  options: MicroInteractionOptions = {},
): () => void {
  return bindMicroInteractionBehavior(motionEngine, prefersReducedMotion, control, target, options);
}

export const motion: MotionRuntime = Object.freeze({
  engine: motionEngine,
  ready: () => dependencyPromise,
  prepare: () => dependencyPromise,
  whenLoaded: execute,
  whenReady(callback: MotionCallback): void {
    if (unlocked) execute(callback);
    else readyQueue.push(callback);
  },
  run(callback: MotionCallback): boolean {
    if (!unlocked) return false;
    execute(callback);
    return true;
  },
  runLoaded(callback: MotionCallback): boolean {
    execute(callback);
    return true;
  },
  refresh,
  reduced: prefersReducedMotion,
  bindMicroInteraction,
  unlock(): void {
    if (unlocked) return;
    unlocked = true;
    flushReadyQueue();
    refresh(0);
  },
  isReady: () => unlocked,
  isLoaded: () => true,
});
