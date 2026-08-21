import { motionTokens, selectors } from '../../core/variables.js';
import { revealGate, scrollState } from '../../core/state.js';
import { motion } from '../../motion/main.js';
import type { MotionHandle } from '../../motion/types.js';
import { SECTION_RULE_PROPERTY, SectionHeadingLayout } from './layout.js';

interface HeadingState {
  prepared: boolean;
  done: boolean;
  started: boolean;
  maxProgress: number;
  autoplay: MotionHandle | null;
  frame: number;
}

const REVEAL = {
  startPercent: 99,
  endPercent: 86,
  initialDuration: 0.3,
  lineOffsetPercent: 30,
  lineStagger: 0.045,
  refreshDelay: 60,
} as const;

const layout = new SectionHeadingLayout();
const states = new WeakMap<HTMLElement, HeadingState>();
let initialized = false;
let generation = 0;
let mutationObserver: MutationObserver | null = null;
let elements: HTMLElement[] = [];
let scrollFrame = 0;
let resizeFrame = 0;
let lastScrollY = window.scrollY || window.pageYOffset || 0;
let direction = 1;

function stateFor(element: HTMLElement): HeadingState {
  const existing = states.get(element);
  if (existing) return existing;
  const state: HeadingState = {
    prepared: false,
    done: false,
    started: false,
    maxProgress: 0,
    autoplay: null,
    frame: 0,
  };
  states.set(element, state);
  return state;
}

function programmaticScrollActive(): boolean {
  return scrollState.programmatic || performance.now() < scrollState.suppressRevealUntil;
}

function renderProgress(element: HTMLElement, progress: number): void {
  const measuredLines = layout.lines(element);
  const lines = measuredLines.length > 0 ? measuredLines : [element];
  const total = 1 + Math.max(0, lines.length - 1) * REVEAL.lineStagger;
  const time = Math.max(0, Math.min(1, progress)) * total;

  lines.forEach((line, index) => {
    const local = Math.max(0, Math.min(1, time - index * REVEAL.lineStagger));
    const eased = motion.engine.ease(motionTokens.easings.out, local);
    line.style.transform = `translate3d(0,${REVEAL.lineOffsetPercent * (1 - eased)}%,0)`;
    line.style.opacity = String(eased);
    line.style.visibility = 'visible';
    line.style.willChange = 'transform,opacity';
  });
  if (layout.isSectionTitleChild(element)) {
    element.style.setProperty(SECTION_RULE_PROPERTY, String(Math.max(0, Math.min(1, time))));
  }
}

function finish(element: HTMLElement): void {
  const state = stateFor(element);
  if (state.done) return;
  state.done = true;
  state.started = true;
  state.maxProgress = 1;
  if (state.frame) cancelAnimationFrame(state.frame);
  state.frame = 0;
  state.autoplay?.cancel();
  state.autoplay = null;
  renderProgress(element, 1);
  layout.clearLineStyles(element);
}

function advance(element: HTMLElement, progress: number, scrollDirection: number): void {
  const state = stateFor(element);
  if (state.done) return;
  if (scrollDirection < 0) {
    if (state.started || progress > 0) finish(element);
    return;
  }
  if (programmaticScrollActive()) {
    finish(element);
    return;
  }
  if (progress <= 0 && !state.started) return;
  state.started = true;
  state.maxProgress = Math.max(state.maxProgress, progress);
  renderProgress(element, state.maxProgress);
  if (state.maxProgress >= 0.995) finish(element);
}

function autoplay(element: HTMLElement): void {
  const state = stateFor(element);
  if (state.done) return;
  state.started = true;
  state.autoplay?.cancel();
  const from = state.maxProgress;
  state.autoplay = motion.engine.tween(REVEAL.initialDuration, motionTokens.easings.out, (progress) => {
    state.maxProgress = from + (1 - from) * progress;
    renderProgress(element, state.maxProgress);
  }, {
    onComplete: () => {
      state.autoplay = null;
      finish(element);
    },
  });
}

function progressFor(element: HTMLElement): number {
  const rect = layout.hostFor(element).getBoundingClientRect();
  const start = innerHeight * (REVEAL.startPercent / 100);
  const end = innerHeight * (REVEAL.endPercent / 100);
  return Math.max(0, Math.min(1, (start - rect.top) / Math.max(1, start - end)));
}

function evaluate(element: HTMLElement, initialPass: boolean): void {
  const state = stateFor(element);
  if (state.done || !layout.renderable(element)) return;
  const rect = layout.hostFor(element).getBoundingClientRect();
  if (rect.bottom <= 0) finish(element);
  else if (initialPass && rect.top < innerHeight && rect.bottom > 0) autoplay(element);
  else advance(element, progressFor(element), direction);
}

function prepare(element: HTMLElement, initialPass: boolean): void {
  const state = stateFor(element);
  if (state.prepared || !layout.renderable(element)) return;
  state.prepared = true;
  layout.prepareHost(element);
  layout.splitLines(element);
  if (state.done) {
    renderProgress(element, 1);
    layout.clearLineStyles(element);
    return;
  }
  renderProgress(element, 0);
  state.frame = requestAnimationFrame(() => {
    state.frame = 0;
    evaluate(element, initialPass);
  });
}

function armNode(node: Node): void {
  if (!(node instanceof HTMLElement) || node.hidden) return;
  if (node.matches(selectors.productList)) {
    node.querySelectorAll(`${selectors.sectionTitle},${selectors.sectionSubtitle}`).forEach((item) => {
      const heading = layout.headingUnit(item);
      if (heading) prepare(heading, true);
    });
    return;
  }
  const heading = layout.headingUnit(node);
  if (heading) prepare(heading, true);
}

function evaluateAll(): void {
  scrollFrame = 0;
  elements.forEach((element) => evaluate(element, false));
}

function onScroll(): void {
  const y = window.scrollY || window.pageYOffset || 0;
  if (Math.abs(y - lastScrollY) > 0.5) direction = y > lastScrollY ? 1 : -1;
  lastScrollY = y;
  if (!scrollFrame) scrollFrame = requestAnimationFrame(evaluateAll);
}

function resplit(): void {
  resizeFrame = 0;
  if (!initialized) return;
  for (const element of elements) {
    const state = stateFor(element);
    if (!state.prepared) continue;
    const progress = state.maxProgress;
    const done = state.done;
    layout.restore(element);
    layout.splitLines(element);
    if (done) {
      renderProgress(element, 1);
      layout.clearLineStyles(element);
    } else {
      renderProgress(element, progress);
    }
  }
  evaluateAll();
}

function scheduleResplit(): void {
  if (!resizeFrame) resizeFrame = requestAnimationFrame(resplit);
}

export function initializeSectionHeadings(): () => void {
  if (initialized) return destroySectionHeadings;
  const token = ++generation;
  initialized = true;
  elements = layout.targets();

  if (motion.reduced()) {
    for (const element of elements) {
      const state = stateFor(element);
      state.prepared = true;
      state.done = true;
      state.started = true;
      layout.capture(element);
    }
    revealGate.mark('headings');
    return destroySectionHeadings;
  }

  elements.forEach((element) => prepare(element, true));
  const container = document.querySelector<HTMLElement>(selectors.container);
  if (container) {
    mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === 'attributes'
          && mutation.attributeName === 'hidden'
          && mutation.target instanceof HTMLElement
          && !mutation.target.hidden
        ) {
          armNode(mutation.target);
        }
      }
    });
    mutationObserver.observe(container, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', scheduleResplit, { passive: true });
  window.addEventListener('sc:motionrefresh', scheduleResplit);
  revealGate.mark('headings');
  motion.refresh(REVEAL.refreshDelay);
  void document.fonts?.ready.then(() => {
    if (initialized && token === generation) scheduleResplit();
  }).catch(() => undefined);
  return destroySectionHeadings;
}

export function destroySectionHeadings(): void {
  generation += 1;
  mutationObserver?.disconnect();
  mutationObserver = null;
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('resize', scheduleResplit);
  window.removeEventListener('sc:motionrefresh', scheduleResplit);
  if (scrollFrame) cancelAnimationFrame(scrollFrame);
  if (resizeFrame) cancelAnimationFrame(resizeFrame);
  scrollFrame = resizeFrame = 0;

  for (const element of elements) {
    const state = stateFor(element);
    if (state.frame) cancelAnimationFrame(state.frame);
    state.autoplay?.cancel();
    layout.restore(element);
    layout.cleanupHost(element);
    state.prepared = false;
  }
  initialized = false;
  elements = [];
}
