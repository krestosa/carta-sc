import type { Cleanup } from '../core/types.js';

export interface MotionHandle {
  cancel(): void;
  finish(): void;
  active(): boolean;
}

export interface MotionTweenOptions {
  delay?: number;
  onComplete?: () => void;
}

export interface MotionSpringSpec {
  readonly stiffness: number;
  readonly damping: number;
}

export interface MotionSpringOptions extends MotionTweenOptions {
  initialVelocity?: number;
}

export interface MotionPropertyOptions extends MotionTweenOptions {
  duration: number;
  ease?: string;
  clear?: boolean;
}

export interface MotionSpringPropertyOptions extends MotionSpringOptions {
  clear?: boolean;
}

export interface MotionTransformState {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface MotionEngine {
  tween(
    duration: number,
    ease: string | undefined,
    update: (progress: number) => void,
    options?: MotionTweenOptions,
  ): MotionHandle;
  spring(
    spec: MotionSpringSpec,
    update: (progress: number) => void,
    options?: MotionSpringOptions,
  ): MotionHandle;
  delay(seconds: number, callback: () => void): MotionHandle;
  transform(
    target: HTMLElement | SVGElement,
    to: Partial<MotionTransformState>,
    options: MotionPropertyOptions,
  ): MotionHandle;
  springTransform(
    target: HTMLElement | SVGElement,
    to: Partial<MotionTransformState>,
    spec: MotionSpringSpec,
    options?: MotionSpringPropertyOptions,
  ): MotionHandle;
  opacity(
    target: HTMLElement | SVGElement,
    to: number,
    options: MotionPropertyOptions,
  ): MotionHandle;
  springOpacity(
    target: HTMLElement | SVGElement,
    to: number,
    spec: MotionSpringSpec,
    options?: MotionSpringPropertyOptions,
  ): MotionHandle;
  attributes(target: Element, to: Record<string, number>, options: MotionPropertyOptions): MotionHandle;
  path(target: SVGPathElement, toD: string, options: MotionPropertyOptions): MotionHandle;
  currentTransform(target: HTMLElement | SVGElement): MotionTransformState;
  ease(name: string | undefined, progress: number): number;
}

export interface MotionDependencies {
  engine: MotionEngine;
}

export interface MicroInteractionOptions {
  active?: { rotation?: number };
  press?: { rotation?: number };
  transformOrigin?: string;
  enterDuration?: number;
  exitDuration?: number;
  pressDuration?: number;
  pressReturnDuration?: number;
  enterEase?: string;
  exitEase?: string;
}

export interface MotionRuntime {
  readonly engine: MotionEngine;
  ready(): Promise<MotionDependencies>;
  prepare(): Promise<MotionDependencies>;
  whenLoaded(callback: (dependencies: MotionDependencies) => void): void;
  whenReady(callback: (dependencies: MotionDependencies) => void): void;
  run(callback: (dependencies: MotionDependencies) => void): boolean;
  runLoaded(callback: (dependencies: MotionDependencies) => void): boolean;
  refresh(delayMs?: number | null): void;
  reduced(): boolean;
  bindMicroInteraction(
    control: HTMLElement,
    target: HTMLElement | SVGElement,
    options?: MicroInteractionOptions,
  ): Cleanup;
  unlock(): void;
  isReady(): boolean;
  isLoaded(): boolean;
}
