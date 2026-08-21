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

const root = document.documentElement;
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

class LocalMotionRuntime implements MotionRuntime {
  readonly engine = motionEngine;
  readonly #dependencies: MotionDependencies = Object.freeze({ engine: this.engine });
  readonly #dependencyPromise = Promise.resolve(this.#dependencies);
  readonly #readyQueue: MotionCallback[] = [];

  #unlocked = false;
  #refreshTimer = 0;

  ready(): Promise<MotionDependencies> {
    return this.#dependencyPromise;
  }

  prepare(): Promise<MotionDependencies> {
    return this.#dependencyPromise;
  }

  whenLoaded(callback: MotionCallback): void {
    this.#execute(callback);
  }

  whenReady(callback: MotionCallback): void {
    if (this.#unlocked) this.#execute(callback);
    else this.#readyQueue.push(callback);
  }

  run(callback: MotionCallback): boolean {
    if (!this.#unlocked) return false;
    this.#execute(callback);
    return true;
  }

  runLoaded(callback: MotionCallback): boolean {
    this.#execute(callback);
    return true;
  }

  refresh(delayMs: number | null = 0): void {
    if (this.#refreshTimer) clearTimeout(this.#refreshTimer);
    this.#refreshTimer = window.setTimeout(() => {
      this.#refreshTimer = 0;
      window.dispatchEvent(new CustomEvent('sc:motionrefresh'));
    }, Math.max(0, delayMs ?? 0));
  }

  reduced(): boolean {
    return prefersReducedMotion();
  }

  bindMicroInteraction(
    control: HTMLElement,
    target: HTMLElement | SVGElement,
    options: MicroInteractionOptions = {},
  ): () => void {
    return bindMicroInteractionBehavior(this.engine, prefersReducedMotion, control, target, options);
  }

  unlock(): void {
    if (this.#unlocked) return;
    this.#unlocked = true;
    this.#flushReadyQueue();
    this.refresh(0);
  }

  isReady(): boolean {
    return this.#unlocked;
  }

  isLoaded(): boolean {
    return true;
  }

  #execute(callback: MotionCallback): void {
    try {
      callback(this.#dependencies);
    } catch (error) {
      console.error('[SushiClub motion]', error);
    }
  }

  #flushReadyQueue(): void {
    for (const callback of this.#readyQueue.splice(0)) this.#execute(callback);
  }
}

export const motion: MotionRuntime = new LocalMotionRuntime();
