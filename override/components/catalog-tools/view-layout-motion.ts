// Explica la responsabilidad de este archivo dentro del código propio y mantiene su lógica en el ámbito que le corresponde.
import { selectors } from '../../core/variables.js';
import { motionConfig } from '../../motion/config.js';
import { motion } from '../../motion/main.js';

const VIEW_TRANSITION = Object.freeze({
  maxSections: 6,
  viewportMarginMin: 120,
  viewportMarginRatio: 0.35,
  staggerMs: 12,
});

const activeAnimations = new Set<Animation>();
const previousOpacity = new Map<HTMLElement, string>();
let generation = 0;
let running = false;

function visibleSections(): HTMLElement[] {
  const margin = Math.max(VIEW_TRANSITION.viewportMarginMin, window.innerHeight * VIEW_TRANSITION.viewportMarginRatio);
  return Array.from(document.querySelectorAll<HTMLElement>(selectors.productList))
    .filter((section) => {
      if (section.hidden || section.offsetParent === null) return false;
      const rect = section.getBoundingClientRect();
      return rect.bottom >= -margin && rect.top <= window.innerHeight + margin;
    })
    .slice(0, VIEW_TRANSITION.maxSections);
}

function rememberOpacity(node: HTMLElement): void {
  if (!previousOpacity.has(node)) previousOpacity.set(node, node.style.opacity);
}

function hide(node: HTMLElement): void {
  rememberOpacity(node);
  node.style.opacity = '0';
}

function restore(node: HTMLElement): void {
  const value = previousOpacity.get(node);
  if (value === undefined) return;
  if (value) node.style.opacity = value;
  else node.style.removeProperty('opacity');
  previousOpacity.delete(node);
}

function restoreAll(): void {
  for (const node of [...previousOpacity.keys()]) restore(node);
}

function track(animation: Animation): Animation {
  activeAnimations.add(animation);
  return animation;
}

function cancelAnimations(): void {
  for (const animation of activeAnimations) animation.cancel();
  activeAnimations.clear();
}

function waitFor(animations: readonly Animation[]): Promise<void> {
  return Promise.allSettled(animations.map((animation) => animation.finished)).then(() => undefined);
}

function fade(
  nodes: readonly HTMLElement[],
  from: number,
  to: number,
  duration: number,
  easing: string,
  stagger = 0,
): Animation[] {
  return nodes.map((node, index) => track(node.animate(
    [{ opacity: from }, { opacity: to }],
    {
      duration,
      delay: stagger ? Math.min(index, 5) * stagger : 0,
      easing,
      fill: 'both',
    },
  )));
}

function canAnimate(): boolean {
  return !motion.reduced() && typeof Element.prototype.animate === 'function';
}

function finish(token: number, done?: () => void): void {
  if (token !== generation) return;
  cancelAnimations();
  restoreAll();
  running = false;
  done?.();
}

export function isCatalogViewLayoutTransitionActive(): boolean {
  return running;
}

export function cancelCatalogViewLayoutTransition(): void {
  generation += 1;
  running = false;
  cancelAnimations();
  restoreAll();
}

export function animateCatalogViewLayoutChange(commit: () => void, done?: () => void): boolean {
  if (running || !canAnimate()) return false;

  const before = visibleSections();
  if (before.length === 0) return false;

  running = true;
  const token = ++generation;
  const exits = fade(
    before,
    1,
    0,
    motionConfig.durationMs.short2,
    motionConfig.cssEasings.accelerate,
  );

  void waitFor(exits).then(() => {
    if (token !== generation || !running) return;

    for (const section of before) hide(section);
    cancelAnimations();

    commit();

    const after = visibleSections();
    const afterSet = new Set(after);
    for (const section of after) hide(section);
    for (const section of before) {
      if (!afterSet.has(section)) restore(section);
    }

    const entries = fade(
      after,
      0,
      1,
      motionConfig.durationMs.short4,
      motionConfig.cssEasings.decelerate,
      VIEW_TRANSITION.staggerMs,
    );

    void waitFor(entries).then(() => finish(token, done));
  });

  return true;
}
