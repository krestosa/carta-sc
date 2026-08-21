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
  frame: number;
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

function setAlpha(stage: HTMLElement, cover: number, content: number): void {
  stage.style.setProperty(COVER_ALPHA_PROPERTY, String(clamp(cover)));
  stage.style.setProperty(CONTENT_ALPHA_PROPERTY, String(clamp(content)));
}

function clearAlpha(stage: HTMLElement): void {
  stage.style.removeProperty(COVER_ALPHA_PROPERTY);
  stage.style.removeProperty(CONTENT_ALPHA_PROPERTY);
}

function visibleWaveEntries(stages: readonly HTMLElement[]): WaveEntry[] {
  const entries: WaveEntry[] = [];
  for (const stage of stages) {
    const card = stage.closest<HTMLElement>('.productoShop');
    if (!card || card.hidden) continue;
    const rect = card.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    entries.push({ stage, top: rect.top, left: rect.left });
  }
  return entries.sort((a, b) => Math.abs(a.top - b.top) > ROW_TOLERANCE_PX
    ? a.top - b.top
    : a.left - b.left);
}

export function synchronizeImagePlaceholderCycle(): void {
  document.documentElement.style.setProperty(CLOCK_PROPERTY, phaseDelay());
}

export class ImagePlaceholderMotion {
  readonly #initialized = new WeakSet<HTMLElement>();
  readonly #states = new Map<HTMLElement, StageMotionState>();

  synchronize(stages: readonly HTMLElement[]): void {
    synchronizeImagePlaceholderCycle();
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
      entry.stage.style.setProperty(WAVE_DELAY_PROPERTY, `${delay}ms`);
      if (entry.stage.classList.contains('sc-image-active')) this.#syncPhase(entry.stage);
      column += 1;
    }
  }

  markLoading(stage: HTMLElement, active: boolean): void {
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
    this.#setActive(stage, active);

    if (queries.reducedMotion.matches || firstLoading || (!wasReady && !wasRevealing)) {
      stage.classList.remove('sc-image-transitioning');
      clearAlpha(stage);
      return;
    }

    stage.classList.add('sc-image-transitioning');
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
      if (stage.classList.contains('sc-image-active')) this.#syncPhase(stage);
    });
  }

  markReady(stage: HTMLElement): void {
    const wasLoading = stage.classList.contains('sc-image-loading');
    if (stage.querySelector('img[src],img[srcset]')) this.#initialized.add(stage);
    this.#cancel(stage);
    stage.classList.remove('sc-image-active');

    if (queries.reducedMotion.matches || !wasLoading) {
      this.#settleReady(stage);
      return;
    }

    stage.classList.add('sc-image-loading', 'sc-image-revealing', 'sc-image-transitioning');
    stage.classList.remove('sc-image-ready');

    this.#animate(stage, REVEAL_DURATION_MS, (elapsed) => {
      const reveal = cubicBezierValue(WIPE, clamp(elapsed / REVEAL_ALPHA_DURATION_MS));
      setAlpha(stage, 1 - reveal, reveal);
    }, () => this.#settleReady(stage));
  }

  release(stage: HTMLElement): void {
    this.#cancel(stage);
    this.#initialized.delete(stage);
    stage.classList.remove(
      'sc-image-loading',
      'sc-image-active',
      'sc-image-ready',
      'sc-image-revealing',
      'sc-image-transitioning',
    );
    clearAlpha(stage);
    stage.style.removeProperty(PHASE_PROPERTY);
    stage.style.removeProperty(WAVE_DELAY_PROPERTY);
  }

  destroy(): void {
    for (const stage of [...this.#states.keys()]) this.release(stage);
    this.#states.clear();
    document.documentElement.style.removeProperty(CLOCK_PROPERTY);
  }

  #setActive(stage: HTMLElement, active: boolean): void {
    stage.classList.toggle('sc-image-active', active);
    if (active && !stage.classList.contains('sc-image-transitioning')) this.#syncPhase(stage);
  }

  #syncPhase(stage: HTMLElement): void {
    const waveDelay = Number.parseFloat(stage.style.getPropertyValue(WAVE_DELAY_PROPERTY)) || 0;
    stage.style.setProperty(PHASE_PROPERTY, phaseDelay(waveDelay));
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
    clearAlpha(stage);
    stage.style.removeProperty(PHASE_PROPERTY);
  }

  #cancel(stage: HTMLElement): void {
    const state = this.#states.get(stage);
    if (!state) return;
    state.token += 1;
    if (state.frame) cancelAnimationFrame(state.frame);
    this.#states.delete(stage);
  }

  #animate(
    stage: HTMLElement,
    duration: number,
    update: (elapsed: number) => void,
    complete: () => void,
  ): void {
    const state: StageMotionState = { token: 1, frame: 0 };
    const token = state.token;
    const startedAt = performance.now();
    this.#states.set(stage, state);

    const frame = (now: number): void => {
      const current = this.#states.get(stage);
      if (!current || current !== state || current.token !== token) return;

      const elapsed = Math.min(duration, Math.max(0, now - startedAt));
      update(elapsed);
      if (elapsed >= duration) {
        this.#states.delete(stage);
        complete();
        return;
      }
      current.frame = requestAnimationFrame(frame);
    };

    update(0);
    state.frame = requestAnimationFrame(frame);
  }
}
