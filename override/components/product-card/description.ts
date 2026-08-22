import { selectors } from '../../core/variables.js';

interface DescriptionMeasurement {
  readonly card: HTMLElement;
  readonly clamped: boolean;
}

const DESCRIPTION_MEASURE = Object.freeze({
  batchSize: 8,
  frameBudgetMs: 4,
  writeBatchSize: 24,
  idleTimeoutMs: 1400,
  fallbackDelayMs: 30,
  visibilityRootMargin: '180px 0px',
  maxLines: 2,
  heightTolerancePx: 0.5,
});

function descriptionNode(target: Element | null): HTMLElement | null {
  if (!target) return null;
  if (target.matches(selectors.productDescription)) return target as HTMLElement;
  return target.querySelector<HTMLElement>(selectors.productDescription);
}

export function ensureDescriptionCopy(target: Element | null): HTMLElement | null {
  const description = descriptionNode(target);
  if (!description) return null;

  const existing = [...description.children]
    .find((child): child is HTMLElement => child instanceof HTMLElement && child.classList.contains('sc-description-copy'));
  if (existing) return existing;

  const copy = document.createElement('span');
  copy.className = 'sc-description-copy';
  while (description.firstChild) copy.appendChild(description.firstChild);
  description.appendChild(copy);
  return copy;
}

class DescriptionMeasureScheduler {
  readonly #observedCards = new Set<HTMLElement>();

  #startFrame = 0;
  #measureFrame = 0;
  #writeFrame = 0;
  #idleHandle = 0;
  #timer = 0;
  #queue: HTMLElement[] = [];
  #pendingWrites: DescriptionMeasurement[] = [];
  #rerun = false;
  #visibilityObserver: IntersectionObserver | null = null;

  schedule = (): void => {
    if (this.#hasScheduledWork()) {
      this.#rerun = true;
      return;
    }

    this.#startFrame = requestAnimationFrame(() => {
      this.#startFrame = 0;
      if (!this.#queue.length) {
        this.#queue = [...document.querySelectorAll<HTMLElement>(selectors.productCards)];
      }
      this.#scheduleMeasureBatch();
    });
  };

  cancel = (): void => {
    if (this.#startFrame) cancelAnimationFrame(this.#startFrame);
    if (this.#measureFrame) cancelAnimationFrame(this.#measureFrame);
    if (this.#writeFrame) cancelAnimationFrame(this.#writeFrame);
    if (this.#idleHandle && window.cancelIdleCallback) window.cancelIdleCallback(this.#idleHandle);
    if (this.#timer) clearTimeout(this.#timer);

    this.#startFrame = 0;
    this.#measureFrame = 0;
    this.#writeFrame = 0;
    this.#idleHandle = 0;
    this.#timer = 0;
    this.#queue = [];
    this.#pendingWrites = [];
    this.#rerun = false;
  };

  #hasScheduledWork(): boolean {
    return Boolean(this.#startFrame || this.#measureFrame || this.#idleHandle || this.#timer);
  }

  #scheduleMeasureBatch(): void {
    if (window.requestIdleCallback) {
      this.#idleHandle = window.requestIdleCallback(this.#measureBatch, {
        timeout: DESCRIPTION_MEASURE.idleTimeoutMs,
      });
      return;
    }
    this.#timer = window.setTimeout(() => this.#measureBatch(), DESCRIPTION_MEASURE.fallbackDelayMs);
  }

  #measureBatch = (deadline: IdleDeadline | null = null): void => {
    this.#measureFrame = 0;
    this.#idleHandle = 0;
    this.#timer = 0;
    const startedAt = performance.now();
    let count = 0;

    while (this.#queue.length && count < DESCRIPTION_MEASURE.batchSize) {
      if (deadline && deadline.timeRemaining() < 1 && !deadline.didTimeout) break;
      if (performance.now() - startedAt > DESCRIPTION_MEASURE.frameBudgetMs) break;

      const card = this.#queue.shift();
      if (!card) continue;
      if (card.hidden || card.offsetParent === null) {
        this.#observeUntilVisible(card);
        continue;
      }

      this.#queueWrite(card, this.#measureCard(card));
      count += 1;
    }

    if (this.#queue.length) this.schedule();
    else if (this.#rerun) {
      this.#rerun = false;
      this.schedule();
    }
  };

  #measureCard(card: HTMLElement): boolean {
    const description = card.querySelector<HTMLElement>(selectors.productDescription);
    const copy = ensureDescriptionCopy(description);
    if (!description || !copy) return false;

    const lineHeight = Number.parseFloat(getComputedStyle(copy).lineHeight) || 0;
    const maxHeight = lineHeight * DESCRIPTION_MEASURE.maxLines + DESCRIPTION_MEASURE.heightTolerancePx;
    return lineHeight > 0 && copy.scrollHeight > maxHeight;
  }

  #queueWrite(card: HTMLElement, clamped: boolean): void {
    this.#pendingWrites.push({ card, clamped });
    if (!this.#writeFrame) this.#writeFrame = requestAnimationFrame(this.#flushWrites);
  }

  #flushWrites = (): void => {
    this.#writeFrame = 0;
    const batch = this.#pendingWrites.splice(0, DESCRIPTION_MEASURE.writeBatchSize);
    for (const { card, clamped } of batch) this.#applyState(card, clamped);

    if (this.#pendingWrites.length) this.#writeFrame = requestAnimationFrame(this.#flushWrites);
    else if (this.#queue.length) this.schedule();
  };

  #applyState(card: HTMLElement, clamped: boolean): void {
    const description = card.querySelector<HTMLElement>(selectors.productDescription);
    if (!description) return;
    description.classList.toggle('sc-description-clamped', clamped);
    card.classList.toggle('sc-description-is-clamped', clamped);
  }

  #observeUntilVisible(card: HTMLElement): void {
    if (!('IntersectionObserver' in window)) return;
    this.#visibilityObserver ??= new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const visibleCard = entry.target as HTMLElement;
        this.#observedCards.delete(visibleCard);
        this.#visibilityObserver?.unobserve(visibleCard);
        this.#queue.push(visibleCard);
        this.schedule();
      }
    }, { rootMargin: DESCRIPTION_MEASURE.visibilityRootMargin });

    if (this.#observedCards.has(card)) return;
    this.#observedCards.add(card);
    this.#visibilityObserver.observe(card);
  }
}

const descriptionMeasureScheduler = new DescriptionMeasureScheduler();

export const scheduleDescriptionMeasure = descriptionMeasureScheduler.schedule;
export const cancelDescriptionMeasure = descriptionMeasureScheduler.cancel;
export const measureDescriptions = scheduleDescriptionMeasure;
