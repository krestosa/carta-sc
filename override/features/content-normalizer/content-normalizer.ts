import { type Cleanup } from '../../core/types.js';
import { normalizeContentHost, CONTENT_HOST_SELECTOR } from './dom.js';
import { ContentMutationObserver } from './observer.js';

const INITIAL_WORK = Object.freeze({
  criticalHosts: 12,
  batchSize: 6,
  frameBudgetMs: 4,
  idleTimeoutMs: 1600,
  fallbackDelayMs: 32,
});

class ContentNormalizer {
  #active = false;
  #queue: Element[] = [];
  #idleHandle = 0;
  #timerHandle = 0;
  readonly #observer = new ContentMutationObserver();

  start(): Cleanup {
    if (this.#active) return () => this.stop();
    this.#active = true;
    this.#queue = [...document.querySelectorAll<Element>(CONTENT_HOST_SELECTOR)];

    let critical = Math.min(INITIAL_WORK.criticalHosts, this.#queue.length);
    while (critical > 0) {
      critical -= 1;
      normalizeContentHost(this.#queue.shift());
    }

    if (this.#queue.length) this.#schedule();
    else this.#finishInitialPass();
    return () => this.stop();
  }

  stop(): void {
    if (!this.#active) return;
    this.#active = false;
    this.#cancelScheduledWork();
    this.#observer.disconnect();
  }

  #run(deadline: IdleDeadline | null): void {
    this.#idleHandle = 0;
    this.#timerHandle = 0;
    if (!this.#active) return;

    const startedAt = performance.now();
    let count = 0;
    while (
      this.#queue.length
      && count < INITIAL_WORK.batchSize
      && performance.now() - startedAt < INITIAL_WORK.frameBudgetMs
      && (!deadline || deadline.didTimeout || deadline.timeRemaining() > 2)
    ) {
      normalizeContentHost(this.#queue.shift());
      count += 1;
    }

    if (this.#queue.length) this.#schedule();
    else this.#finishInitialPass();
  }

  #schedule(): void {
    if (!this.#active || this.#idleHandle || this.#timerHandle) return;
    if (typeof window.requestIdleCallback === 'function') {
      this.#idleHandle = window.requestIdleCallback((deadline) => this.#run(deadline), {
        timeout: INITIAL_WORK.idleTimeoutMs,
      });
      return;
    }
    this.#timerHandle = window.setTimeout(() => this.#run(null), INITIAL_WORK.fallbackDelayMs);
  }

  #finishInitialPass(): void {
    this.#idleHandle = 0;
    this.#timerHandle = 0;
    this.#queue = [];
    if (this.#active) this.#observer.observe();
  }

  #cancelScheduledWork(): void {
    if (this.#idleHandle && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(this.#idleHandle);
    if (this.#timerHandle) clearTimeout(this.#timerHandle);
    this.#idleHandle = 0;
    this.#timerHandle = 0;
    this.#queue = [];
  }
}

const normalizer = new ContentNormalizer();

export function initializeContentNormalizer(): Cleanup {
  return normalizer.start();
}

export function destroyContentNormalizer(): void {
  normalizer.stop();
}
