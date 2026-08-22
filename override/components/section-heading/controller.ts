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

const REVEAL = Object.freeze({
  startPercent: 99,
  endPercent: 86,
  initialDuration: 0.3,
  lineOffsetPercent: 30,
  lineStagger: 0.045,
  refreshDelay: 60,
});

export class SectionHeadingController {
  readonly #layout = new SectionHeadingLayout();
  readonly #states = new WeakMap<HTMLElement, HeadingState>();
  #initialized = false;
  #generation = 0;
  #mutationObserver: MutationObserver | null = null;
  #elements: HTMLElement[] = [];
  #scrollFrame = 0;
  #resizeFrame = 0;
  #lastScrollY = window.scrollY || window.pageYOffset || 0;
  #direction = 1;

  start(): () => void {
    if (this.#initialized) return this.stop;
    const token = ++this.#generation;
    this.#initialized = true;
    this.#elements = this.#layout.targets();

    if (motion.reduced()) {
      for (const element of this.#elements) {
        const state = this.#stateFor(element);
        state.prepared = true;
        state.done = true;
        state.started = true;
        this.#layout.capture(element);
      }
      revealGate.mark('headings');
      return this.stop;
    }

    this.#elements.forEach((element) => this.#prepare(element, true));
    this.#observeVisibility();
    window.addEventListener('scroll', this.#onScroll, { passive: true });
    window.addEventListener('resize', this.#scheduleResplit, { passive: true });
    window.addEventListener('sc:motionrefresh', this.#scheduleResplit);
    revealGate.mark('headings');
    motion.refresh(REVEAL.refreshDelay);
    void document.fonts?.ready.then(() => {
      if (this.#initialized && token === this.#generation) this.#scheduleResplit();
    }).catch(() => undefined);
    return this.stop;
  }

  stop = (): void => {
    this.#generation += 1;
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = null;
    window.removeEventListener('scroll', this.#onScroll);
    window.removeEventListener('resize', this.#scheduleResplit);
    window.removeEventListener('sc:motionrefresh', this.#scheduleResplit);
    if (this.#scrollFrame) cancelAnimationFrame(this.#scrollFrame);
    if (this.#resizeFrame) cancelAnimationFrame(this.#resizeFrame);
    this.#scrollFrame = 0;
    this.#resizeFrame = 0;

    for (const element of this.#elements) {
      const state = this.#stateFor(element);
      if (state.frame) cancelAnimationFrame(state.frame);
      state.frame = 0;
      state.autoplay?.cancel();
      state.autoplay = null;
      this.#layout.restore(element);
      this.#layout.cleanupHost(element);
      state.prepared = false;
    }
    this.#initialized = false;
    this.#elements = [];
  };

  #stateFor(element: HTMLElement): HeadingState {
    const existing = this.#states.get(element);
    if (existing) return existing;
    const state: HeadingState = {
      prepared: false,
      done: false,
      started: false,
      maxProgress: 0,
      autoplay: null,
      frame: 0,
    };
    this.#states.set(element, state);
    return state;
  }

  #programmaticScrollActive(): boolean {
    return scrollState.programmatic || performance.now() < scrollState.suppressRevealUntil;
  }

  #renderProgress(element: HTMLElement, progress: number): void {
    const measuredLines = this.#layout.lines(element);
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
    if (this.#layout.isSectionTitleChild(element)) {
      element.style.setProperty(SECTION_RULE_PROPERTY, String(Math.max(0, Math.min(1, time))));
    }
  }

  #finish(element: HTMLElement): void {
    const state = this.#stateFor(element);
    if (state.done) return;
    state.done = true;
    state.started = true;
    state.maxProgress = 1;
    if (state.frame) cancelAnimationFrame(state.frame);
    state.frame = 0;
    state.autoplay?.cancel();
    state.autoplay = null;
    this.#renderProgress(element, 1);
    this.#layout.clearLineStyles(element);
  }

  #advance(element: HTMLElement, progress: number, scrollDirection: number): void {
    const state = this.#stateFor(element);
    if (state.done) return;
    if (scrollDirection < 0) {
      if (state.started || progress > 0) this.#finish(element);
      return;
    }
    if (this.#programmaticScrollActive()) {
      this.#finish(element);
      return;
    }
    if (progress <= 0 && !state.started) return;
    state.started = true;
    state.maxProgress = Math.max(state.maxProgress, progress);
    this.#renderProgress(element, state.maxProgress);
    if (state.maxProgress >= 0.995) this.#finish(element);
  }

  #autoplay(element: HTMLElement): void {
    const state = this.#stateFor(element);
    if (state.done) return;
    state.started = true;
    state.autoplay?.cancel();
    const from = state.maxProgress;
    state.autoplay = motion.engine.tween(REVEAL.initialDuration, motionTokens.easings.out, (progress) => {
      state.maxProgress = from + (1 - from) * progress;
      this.#renderProgress(element, state.maxProgress);
    }, {
      onComplete: () => {
        state.autoplay = null;
        this.#finish(element);
      },
    });
  }

  #progressFor(element: HTMLElement): number {
    const rect = this.#layout.hostFor(element).getBoundingClientRect();
    const start = innerHeight * (REVEAL.startPercent / 100);
    const end = innerHeight * (REVEAL.endPercent / 100);
    return Math.max(0, Math.min(1, (start - rect.top) / Math.max(1, start - end)));
  }

  #evaluate(element: HTMLElement, initialPass: boolean): void {
    const state = this.#stateFor(element);
    if (state.done || !this.#layout.renderable(element)) return;
    const rect = this.#layout.hostFor(element).getBoundingClientRect();
    if (rect.bottom <= 0) this.#finish(element);
    else if (initialPass && rect.top < innerHeight && rect.bottom > 0) this.#autoplay(element);
    else this.#advance(element, this.#progressFor(element), this.#direction);
  }

  #prepare(element: HTMLElement, initialPass: boolean): void {
    const state = this.#stateFor(element);
    if (state.prepared || !this.#layout.renderable(element)) return;
    state.prepared = true;
    this.#layout.prepareHost(element);
    this.#layout.splitLines(element);
    if (state.done) {
      this.#renderProgress(element, 1);
      this.#layout.clearLineStyles(element);
      return;
    }
    this.#renderProgress(element, 0);
    state.frame = requestAnimationFrame(() => {
      state.frame = 0;
      this.#evaluate(element, initialPass);
    });
  }

  #armNode(node: Node): void {
    if (!(node instanceof HTMLElement) || node.hidden) return;
    if (node.matches(selectors.productList)) {
      node.querySelectorAll(`${selectors.sectionTitle},${selectors.sectionSubtitle}`).forEach((item) => {
        const heading = this.#layout.headingUnit(item);
        if (heading) this.#prepare(heading, true);
      });
      return;
    }
    const heading = this.#layout.headingUnit(node);
    if (heading) this.#prepare(heading, true);
  }

  #evaluateAll = (): void => {
    this.#scrollFrame = 0;
    this.#elements.forEach((element) => this.#evaluate(element, false));
  };

  #onScroll = (): void => {
    const y = window.scrollY || window.pageYOffset || 0;
    if (Math.abs(y - this.#lastScrollY) > 0.5) this.#direction = y > this.#lastScrollY ? 1 : -1;
    this.#lastScrollY = y;
    if (!this.#scrollFrame) this.#scrollFrame = requestAnimationFrame(this.#evaluateAll);
  };

  #resplit = (): void => {
    this.#resizeFrame = 0;
    if (!this.#initialized) return;
    for (const element of this.#elements) {
      const state = this.#stateFor(element);
      if (!state.prepared) continue;
      const progress = state.maxProgress;
      const done = state.done;
      this.#layout.restore(element);
      this.#layout.splitLines(element);
      if (done) {
        this.#renderProgress(element, 1);
        this.#layout.clearLineStyles(element);
      } else {
        this.#renderProgress(element, progress);
      }
    }
    this.#evaluateAll();
  };

  #scheduleResplit = (): void => {
    if (!this.#resizeFrame) this.#resizeFrame = requestAnimationFrame(this.#resplit);
  };

  #observeVisibility(): void {
    const container = document.querySelector<HTMLElement>(selectors.container);
    if (!container) return;
    this.#mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === 'attributes'
          && mutation.attributeName === 'hidden'
          && mutation.target instanceof HTMLElement
          && !mutation.target.hidden
        ) this.#armNode(mutation.target);
      }
    });
    this.#mutationObserver.observe(container, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
  }
}
