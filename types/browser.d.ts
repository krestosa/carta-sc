interface Window {
  SCOverride: any;
  jQuery?: any;
  $?: any;
  gsap?: GsapLike;
  ScrollTrigger?: ScrollTriggerLike;
  MorphSVGPlugin?: MorphSVGPluginLike;
  SplitText?: SplitTextLike;
  __scCatalogAssetVersion?: string;
  __scInitialTheme?: string;
  __scOverrideMainBooted?: boolean;
  __scOverrideEntryBooted?: boolean;
  __scMotionCoreBooted?: boolean;
  __scStoragePolicyBooted?: boolean;
  __scContentNormalizerBooted?: boolean;
  __scRuntimeReady?: number;
  __scAfterRuntime?: Array<() => void>;
  __scLoadRecaptcha?: () => void;
}
declare var gsap: GsapLike;
declare var ScrollTrigger: ScrollTriggerLike;
declare var MorphSVGPlugin: MorphSVGPluginLike;
declare var SplitText: SplitTextLike;
interface Window {
  __scLegacyMainLoaderBooted?: boolean;
}
interface Storage {
  __scPersistenceGuard?: boolean;
}
interface IconMotionState { timeline: GsapTimeline | null; }
interface ViewIconMotionState { timeline: GsapTimeline | null; }
interface SVGElement { __scIconMotion?: IconMotionState | null; __scViewMorphReady?: boolean; __scViewIconMotion?: ViewIconMotionState | null; }
interface HTMLElement {
  __scCategoryConfirm?: Animation | null;
  __scModalMotionToken?: number;
  __scImagePriorityAssigned?: boolean;
}
type GsapVars = Record<string, unknown>;
interface GsapTween {
  kill(): void;
  pause(position?: number): GsapTween;
  restart(includeDelay?: boolean): GsapTween;
}
interface GsapTimeline extends GsapTween {
  progress(value?: number): number | GsapTimeline;
  to(target: unknown, vars: GsapVars, position?: number | string): GsapTimeline;
  fromTo(target: unknown, fromVars: GsapVars, toVars: GsapVars, position?: number | string): GsapTimeline;
  set(target: unknown, vars: GsapVars, position?: number | string): GsapTimeline;
  call(callback: () => void, params?: unknown[] | null, position?: number | string): GsapTimeline;
}
interface GsapQuickTo {
  (value: number): void;
  tween?: GsapTween;
}
interface GsapMatchMediaContext {
  conditions: Record<string, boolean>;
}
interface GsapMatchMedia {
  add(conditions: Record<string, string>, callback: (context: GsapMatchMediaContext) => void | (() => void)): void;
  revert(): void;
}
interface GsapUtils {
  toArray<T extends Element = Element>(target: string | T | ArrayLike<T>): T[];
  clamp(min: number, max: number): (value: number) => number;
  selector(root: Element | Document | DocumentFragment): (selector: string) => Element[];
  wrap(min: number, max: number, value: number): number;
}
interface GsapLike {
  utils: GsapUtils;
  killTweensOf(target: unknown, properties?: string): void;
  set(target: unknown, vars: GsapVars): void;
  to(target: unknown, vars: GsapVars): GsapTween;
  fromTo(target: unknown, fromVars: GsapVars, toVars: GsapVars): GsapTween;
  timeline(vars?: GsapVars): GsapTimeline;
  quickTo(target: object, property: string, vars: GsapVars): GsapQuickTo;
  delayedCall(delay: number, callback: () => void): GsapTween;
  matchMedia(): GsapMatchMedia;
  registerPlugin(...plugins: unknown[]): void;
}
interface ScrollTriggerInstance {
  direction: number;
  progress: number;
  kill(): void;
  getVelocity(): number;
}
interface ScrollTriggerLike {
  create(config: GsapVars): ScrollTriggerInstance;
  refresh(): void;
  config(config: GsapVars): void;
}

interface MorphSVGPluginLike { convertToPath(element: Element): unknown; }
interface SplitTextInstance {
  lines: HTMLElement[];
  revert(): void;
}
interface SplitTextLike {
  create(element: HTMLElement, options: {
    type: string;
    mask?: string;
    linesClass?: string;
    autoSplit?: boolean;
    aria?: string;
    onSplit?: (instance: SplitTextInstance) => unknown;
  }): SplitTextInstance;
}
interface MotionDeps {
  gsap: GsapLike;
  ScrollTrigger: ScrollTriggerLike;
  MorphSVGPlugin?: MorphSVGPluginLike;
  SplitText?: SplitTextLike;
}
