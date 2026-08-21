import { queries } from '../../core/variables.js';

const PULSE_CYCLE_MS = 1500;
const WAVE_ROW_DELAY_MS = 200;
const WAVE_COLUMN_DELAY_MS = 100;
const ROW_TOLERANCE_PX = 4;
const REVEAL_DURATION_MS = 300;
const REVEAL_ALPHA_DURATION_MS = 80;
const RESET_OUTGOING_MS = 150;
const RESET_INCOMING_MS = 250;
const RESET_DURATION_MS = RESET_OUTGOING_MS + RESET_INCOMING_MS;

const COVER_ALPHA_PROPERTY = '--sc-image-preloader-cover-alpha';
const CONTENT_ALPHA_PROPERTY = '--sc-image-preloader-content-alpha';
const PHASE_PROPERTY = '--sc-image-preloader-phase';
const CLOCK_PROPERTY = '--sc-image-preloader-clock';
const WAVE_DELAY_PROPERTY = '--sc-image-preloader-wave-delay';

interface CubicBezier {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

interface StageMotionState {
  token: number;
  startedAt: number;
  duration: number;
  update: (elapsed: number) => void;
  complete: () => void;
}

interface WaveEntry {
  readonly stage: HTMLElement;
  readonly top: number;
  readonly left: number;
}

const STANDARD: CubicBezier = Object.freeze({ x1: 0.2, y1: 0, x2: 0, y2: 1 });
const ACCELERATE: CubicBezier = Object.freeze({ x1: 0.3, y1: 0, x2: 1, y2: 1 });
const WIPE: CubicBezier = Object.freeze({ x1: 0, y1: 0.2, x2: 1, y2: 0.6 });

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function cubicCoordinate(t: number, first: number, second: number): number {
  const inverse = 1 - t;
  return 3 * inverse * inverse * t * first + 3 * inverse * t * t * second + t * t * t;
}

function cubicDerivative(t: number, first: number, second: number): number {
  const inverse = 1 - t;
  return 3 * inverse * inverse * first
    + 6 * inverse * t * (second - first)
    + 3 * t * t * (1 - second);
}

function cubicBezierValue(curve: CubicBezier, progress: number): number {
  const x = clamp(progress);
  if (x === 0 || x === 1) return x;

  let t = x;
  for (let iteration = 0; iteration < 8; iteration += 1) {
    const estimate = cubicCoordinate(t, curve.x1, curve.x2) - x;
    if (Math.abs(estimate) < 1e-7) break;
    const derivative = cubicDerivative(t, curve.x1, curve.x2);
    if (Math.abs(derivative) < 1e-7) break;
    t = clamp(t - estimate / derivative);
  }

  let low = 0;
  let high = 1;
  for (let iteration = 0; iteration < 12; iteration += 1) {
    const estimate = cubicCoordinate(t, curve.x1, curve.x2);
    if (Math.abs(estimate - x) < 1e-7) break;
    if (estimate < x) low = t;
    else high = t;
    t = (low + high) / 2;
  }

  return cubicCoordinate(t, curve.y1, curve.y2);
}

function phaseDelay(waveDelay = 0): string {
  return `${-(performance.now() % PULSE_CYCLE_MS) + waveDelay}ms`;
}

function cardFor(stage: HTMLElement): HTMLElement | null {
  return stage.closest<HTMLElement>('.productoShop');
}

function setSharedProperty(stage: HTMLElement, property: string, value: string): void {
  stage.style.setProperty(property, value);
  cardFor(stage)?.style.setProperty(property, value);
}

function removeSharedProperty(stage: HTMLElement, property: string): void {
  stage.style.removeProperty(property);
  cardFor(stage)?.style.removeProperty(property);
}

function setAlpha(stage: HTMLElement, cover: number, content: number): void {
  setSharedProperty(stage, COVER_ALPHA_PROPERTY, String(clamp(cover)));
  setSharedProperty(stage, CONTENT_ALPHA_PROPERTY, String(clamp(content)));
}

function clearAlpha(stage: HTMLElement): void {
  removeSharedProperty(stage, COVER_ALPHA_PROPERTY);
  removeSharedProperty(stage, CONTENT_ALPHA_PROPERTY);
}

function visibleWaveEntries(stages: readonly HTMLElement[]): WaveEntry[] {
  const entries: WaveEntry[] = [];
  for (const stage of stages) {
    const card = cardFor(stage);
    if (!card || card.hidden) continue;
    const rect = card.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    entries.push({ stage, top: rect.top, left: rect.left });
  }
  return entries.sort((a, b) => Math.abs(a.top - b.top) > ROW_TOLERANCE_PX
    ? a.top - b.top
    : a.left - b.left);
}

function applyWaveLayout(stages: readonly HTMLElement[]): void {
  const entries = visibleWaveEntries(stages);
  let row = -1;
  let rowTop = Number.NEGATIVE_INFINITY;
  let column = 0;

  for (const entry of entries) {
    if (row < 0 || Math.abs(entry.top - rowTop) > ROW_TOLERANCE_PX) {
      row += 1;
      rowTop = entry.top;
      column = 0;
    }
    const delay = (row * WAVE_ROW_DELAY_MS + column * WAVE_COLUMN_DELAY_MS) % PULSE_CYCLE_MS;
    setSharedProperty(entry.stage, WAVE_DELAY_PROPERTY, `${delay}ms`);
    setSharedProperty(entry.stage, PHASE_PROPERTY, phaseDelay(delay));
    column += 1;
  }
}

class PlaceholderFrameCoordinator {
  readonly #states = new Map<HTMLElement, StageMotionState>();
  #frame = 0;

  start(
    stage: HTMLElement,
    duration: number,
    update: (elapsed: number) => void,
    complete: () => void,
  ): void {
    this.cancel(stage);
    const state: StageMotionState = {
      token: 1,
      startedAt: performance.now(),
      duration,
      update,
      complete,
    };
    this.#states.set(stage, state);
    update(0);
    this.#requestFrame();
  }

  cancel(stage: HTMLElement): void {
    const state = this.#states.get(stage);
    if (!state) return;
    state.token += 1;
    this.#states.delete(stage);
    this.#cancelFrameIfIdle();
  }

  clear(): void {
    this.#states.clear();
    if (this.#frame) cancelAnimationFrame(this.#frame);
    this.#frame = 0;
  }

  #requestFrame(): void {
    if (!this.#frame && this.#states.size) this.#frame = requestAnimationFrame(this.#tick);
  }

  #cancelFrameIfIdle(): void {
    if (this.#states.size || !this.#frame) return;
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
  }

  #tick = (now: number): void => {
    this.#frame = 0;
    const completed: Array<[HTMLElement, StageMotionState]> = [];

    for (const [stage, state] of this.#states) {
      const elapsed = Math.min(state.duration, Math.max(0, now - state.startedAt));
      state.update(elapsed);
      if (elapsed >= state.duration) completed.push([stage, state]);
    }

    for (const [stage, state] of completed) {
      if (this.#states.get(stage) !== state) continue;
      this.#states.delete(stage);
      state.complete();
    }

    this.#requestFrame();
  };
}

export function synchronizeImagePlaceholderCycle(): void {
  document.documentElement.style.setProperty(CLOCK_PROPERTY, phaseDelay());
  applyWaveLayout([
    ...document.querySelectorAll<HTMLElement>('.listadoShop .productoShop .imgShop,.listadoShop .productoShop .imgLiquidNoFillShop'),
  ]);
}

export class ImagePlaceholderMotion {
  readonly #initialized = new WeakSet<HTMLElement>();
  readonly #registered = new Set<HTMLElement>();
  readonly #coordinator = new PlaceholderFrameCoordinator();

  synchronize(stages: readonly HTMLElement[]): void {
    document.documentElement.style.setProperty(CLOCK_PROPERTY, phaseDelay());
    applyWaveLayout(stages);
  }

  markLoading(stage: HTMLElement, active: boolean): void {
    this.#registered.add(stage);
    const card = cardFor(stage);
    const wasReady = stage.classList.contains('sc-image-ready');
    const wasRevealing = stage.classList.contains('sc-image-revealing');
    const alreadyLoading = stage.classList.contains('sc-image-loading') && !wasRevealing;
    const firstLoading = !this.#initialized.has(stage);
    this.#initialized.add(stage);

    if (alreadyLoading) {
      this.#setActive(stage, active);
      return;
    }

    this.#cancel(stage);
    stage.classList.remove('sc-image-ready', 'sc-image-revealing');
    stage.classList.add('sc-image-loading');
    card?.classList.remove('sc-card-placeholder-ready', 'sc-card-placeholder-revealing');
    card?.classList.add('sc-card-placeholder-loading');
    this.#setActive(stage, active);

    if (queries.reducedMotion.matches || firstLoading || (!wasReady && !wasRevealing)) {
      stage.classList.remove('sc-image-transitioning');
      card?.classList.remove('sc-card-placeholder-transitioning');
      clearAlpha(stage);
      return;
    }

    stage.classList.add('sc-image-transitioning');
    card?.classList.add('sc-card-placeholder-transitioning');
    this.#animate(stage, RESET_DURATION_MS, (elapsed) => {
      const content = elapsed < RESET_OUTGOING_MS
        ? cubicBezierValue(ACCELERATE, 1 - elapsed / RESET_OUTGOING_MS)
        : 0;

      let cover = 0;
      if (elapsed >= RESET_OUTGOING_MS) {
        const incoming = clamp((elapsed - RESET_OUTGOING_MS) / RESET_INCOMING_MS);
        cover = cubicBezierValue(STANDARD, 0.1 + 0.9 * incoming);
      }
      setAlpha(stage, cover, content);
    }, () => {
      clearAlpha(stage);
      stage.classList.remove('sc-image-transitioning');
      card?.classList.remove('sc-card-placeholder-transitioning');
      if (stage.classList.contains('sc-image-active')) this.#syncPhase(stage);
    });
  }

  markReady(stage: HTMLElement): void {
    this.#registered.add(stage);
    const card = cardFor(stage);
    const wasLoading = stage.classList.contains('sc-image-loading');
    if (stage.querySelector('img[src],img[srcset]')) this.#initialized.add(stage);
    this.#cancel(stage);
    this.#setActive(stage, false);

    if (queries.reducedMotion.matches || !wasLoading) {
      this.#settleReady(stage);
      return;
    }

    stage.classList.add('sc-image-loading', 'sc-image-revealing', 'sc-image-transitioning');
    stage.classList.remove('sc-image-ready');
    card?.classList.add(
      'sc-card-placeholder-loading',
      'sc-card-placeholder-revealing',
      'sc-card-placeholder-transitioning',
    );
    card?.classList.remove('sc-card-placeholder-ready');

    this.#animate(stage, REVEAL_DURATION_MS, (elapsed) => {
      const reveal = cubicBezierValue(WIPE, clamp(elapsed / REVEAL_ALPHA_DURATION_MS));
      setAlpha(stage, 1 - reveal, reveal);
    }, () => this.#settleReady(stage));
  }

  release(stage: HTMLElement): void {
    this.#cancel(stage);
    this.#initialized.delete(stage);
    this.#registered.delete(stage);
    stage.classList.remove(
      'sc-image-loading',
      'sc-image-active',
      'sc-image-ready',
      'sc-image-revealing',
      'sc-image-transitioning',
    );
    const card = cardFor(stage);
    card?.classList.remove(
      'sc-card-placeholder-loading',
      'sc-card-placeholder-active',
      'sc-card-placeholder-ready',
      'sc-card-placeholder-revealing',
      'sc-card-placeholder-transitioning',
    );
    clearAlpha(stage);
    removeSharedProperty(stage, PHASE_PROPERTY);
    removeSharedProperty(stage, WAVE_DELAY_PROPERTY);
  }

  destroy(): void {
    for (const stage of [...this.#registered]) this.release(stage);
    this.#coordinator.clear();
    document.documentElement.style.removeProperty(CLOCK_PROPERTY);
  }

  #setActive(stage: HTMLElement, active: boolean): void {
    stage.classList.toggle('sc-image-active', active);
    cardFor(stage)?.classList.toggle('sc-card-placeholder-active', active);
    if (active && !stage.classList.contains('sc-image-transitioning')) this.#syncPhase(stage);
  }

  #syncPhase(stage: HTMLElement): void {
    const waveDelay = Number.parseFloat(stage.style.getPropertyValue(WAVE_DELAY_PROPERTY)) || 0;
    setSharedProperty(stage, PHASE_PROPERTY, phaseDelay(waveDelay));
  }

  #settleReady(stage: HTMLElement): void {
    this.#cancel(stage);
    stage.classList.remove(
      'sc-image-loading',
      'sc-image-active',
      'sc-image-revealing',
      'sc-image-transitioning',
    );
    stage.classList.add('sc-image-ready');
    const card = cardFor(stage);
    card?.classList.remove(
      'sc-card-placeholder-loading',
      'sc-card-placeholder-active',
      'sc-card-placeholder-revealing',
      'sc-card-placeholder-transitioning',
    );
    card?.classList.add('sc-card-placeholder-ready');
    clearAlpha(stage);
    removeSharedProperty(stage, PHASE_PROPERTY);
  }

  #cancel(stage: HTMLElement): void {
    this.#coordinator.cancel(stage);
  }

  #animate(
    stage: HTMLElement,
    duration: number,
    update: (elapsed: number) => void,
    complete: () => void,
  ): void {
    this.#coordinator.start(stage, duration, update, complete);
  }
}
