import { motionTokens, queries } from '../../core/variables.js';
import { visible } from '../../core/utils.js';
import type { MotionSpringSpec } from '../../motion/types.js';
import { cloneTemplate } from '../../templates/registry.js';
import { anchorForHref, categoryLinks, CATEGORY_SELECTORS } from './core.js';

interface IndicatorState {
  x: number;
  width: number;
}

interface IndicatorEntry {
  readonly root: HTMLElement;
  readonly host: HTMLElement;
  readonly line: HTMLElement;
  readonly state: IndicatorState;
  targetStart: number;
  targetEnd: number;
  startSpec: MotionSpringSpec;
  endSpec: MotionSpringSpec;
  startDeadline: number;
  endDeadline: number;
  initialized: boolean;
  visible: boolean;
  moveFrame: number;
  lastMoveTime: number;
  velocityStart: number;
  velocityEnd: number;
}

const INDICATOR = {
  minWidth: 6,
  textInsetMax: 1.25,
  textInsetRatio: 0.025,
  visibilityThreshold: 0.4,
} as const;

const pixelRatio = (): number => Math.max(1, devicePixelRatio || 1);
const physicalPixel = (): number => 1 / pixelRatio();
const floorPhysical = (value: number): number => Math.floor(value * pixelRatio() + 1e-6) / pixelRatio();
const roundPhysical = (value: number): number => Math.round(value * pixelRatio()) / pixelRatio();

function mountFor(root: HTMLElement): HTMLElement {
  return root.closest<HTMLElement>(CATEGORY_SELECTORS.mobileScroller) ?? root;
}

function visualBounds(link: HTMLElement): DOMRect {
  const fallback = link.getBoundingClientRect();
  try {
    const range = document.createRange();
    range.selectNodeContents(link);
    const bounds = range.getBoundingClientRect();
    if (bounds.width > 1 && bounds.height > 0) return bounds;
  } catch {
    // Algunos nodos legacy no admiten Range; el rect del enlace es suficiente.
  }
  return fallback;
}

function sameTarget(link: HTMLAnchorElement, target: Element | null): boolean {
  const resolved = anchorForHref(link.getAttribute('href'));
  return resolved === target || Boolean(resolved && target && resolved.id && target.id && resolved.id === target.id);
}

function visibleRoots(target: Element | null): HTMLElement[] {
  const roots = new Set<HTMLElement>();
  for (const link of categoryLinks()) {
    if (!sameTarget(link, target) || !visible(link)) continue;
    const root = link.closest<HTMLElement>('.nav-tabsTopShop,.nav-tabs');
    if (root) roots.add(root);
  }
  return Array.from(roots);
}

function criticalSpringAxis(
  position: number,
  velocity: number,
  target: number,
  deltaTime: number,
  spec: MotionSpringSpec,
): [number, number] {
  const omega = Math.sqrt(spec.stiffness);
  const displacement = position - target;
  const coefficient = velocity + omega * displacement;
  const decay = Math.exp(-omega * deltaTime);
  const nextDisplacement = (displacement + coefficient * deltaTime) * decay;
  const nextVelocity = (velocity - omega * coefficient * deltaTime) * decay;
  return [target + nextDisplacement, nextVelocity];
}

function criticalSpringDurationMs(
  position: number,
  velocity: number,
  target: number,
  spec: MotionSpringSpec,
): number {
  const threshold = INDICATOR.visibilityThreshold;
  const displacement = (position - target) / threshold;
  const normalizedVelocity = velocity / threshold;
  if (displacement === 0 && normalizedVelocity === 0) return 0;

  const root = -Math.sqrt(spec.stiffness);
  const initialPosition = Math.abs(displacement);
  const initialVelocity = displacement < 0 ? -normalizedVelocity : normalizedVelocity;
  const c1 = initialPosition;
  const c2 = initialVelocity - root * c1;
  const delta = 1;

  const t1 = Math.log(Math.abs(delta / c1)) / root;
  const guess = Math.log(Math.abs(delta / c2));
  let t2 = guess;
  for (let iteration = 0; iteration <= 5; iteration += 1) {
    t2 = guess - Math.log(Math.abs(t2 / root));
  }
  t2 /= root;

  let current = !Number.isFinite(t1) ? t2 : !Number.isFinite(t2) ? t1 : Math.max(t1, t2);
  const inflectionTime = -(root * c1 + c2) / (root * c2);
  const inflectionValue = (c1 + c2 * inflectionTime) * Math.exp(root * inflectionTime);

  let signedDelta: number;
  if (!Number.isFinite(inflectionTime) || inflectionTime <= 0) {
    signedDelta = -delta;
  } else if (-inflectionValue < delta) {
    if (c2 < 0 && c1 > 0) current = 0;
    signedDelta = -delta;
  } else {
    current = -(2 / root) - c1 / c2;
    signedDelta = delta;
  }

  if (!Number.isFinite(current)) return 0;
  let difference = Number.POSITIVE_INFINITY;
  for (let iteration = 0; difference > 0.001 && iteration < 100; iteration += 1) {
    const previous = current;
    const exponential = Math.exp(root * current);
    const value = (c1 + c2 * current) * exponential + signedDelta;
    const derivative = (c2 * (root * current + 1) + c1 * root) * exponential;
    if (!Number.isFinite(derivative) || Math.abs(derivative) < 1e-9) break;
    current -= value / derivative;
    if (!Number.isFinite(current)) return 0;
    difference = Math.abs(previous - current);
  }

  return Math.max(0, Math.floor(current * 1000));
}

export class CategoryIndicatorController {
  readonly #entries: IndicatorEntry[] = [];
  #dirty = true;

  move(target: Element | null, animateMotion: boolean): void {
    for (const root of visibleRoots(target)) {
      const link = categoryLinks(root).find((candidate) => sameTarget(candidate, target) && visible(candidate));
      if (!link) continue;

      const entry = this.#entryFor(root);
      const linkRect = visualBounds(link);
      let x: number;
      let width: number;

      if (entry.host.matches(CATEGORY_SELECTORS.mobileScroller)) {
        const hostRect = entry.host.getBoundingClientRect();
        x = entry.host.scrollLeft + (linkRect.left - hostRect.left);
        width = linkRect.width;
      } else {
        const rootRect = root.getBoundingClientRect();
        const measuredScale = root.offsetWidth && rootRect.width ? rootRect.width / root.offsetWidth : 1;
        const scale = Number.isFinite(measuredScale) && measuredScale > 0 ? measuredScale : 1;
        x = (linkRect.left - rootRect.left) / scale + root.scrollLeft;
        width = linkRect.width / scale;
      }

      const inset = Math.min(INDICATOR.textInsetMax, Math.max(0, width * INDICATOR.textInsetRatio));
      x += inset;
      width = Math.max(INDICATOR.minWidth, width - inset * 2);
      if (entry.host.matches(CATEGORY_SELECTORS.mobileScroller)) {
        const right = floorPhysical(x + width) - physicalPixel();
        width = Math.max(INDICATOR.minWidth, right - x);
      }

      if (!entry.initialized || !animateMotion || queries.reducedMotion.matches) this.#snap(entry, x, width);
      else this.#animate(entry, x, width);
    }
    this.#dirty = false;
  }

  markDirty(): void { this.#dirty = true; }
  isDirty(): boolean { return this.#dirty; }

  pause(): void {
    for (const entry of this.#entries) this.#stopMove(entry);
  }

  resume(): void {
    for (let index = this.#entries.length - 1; index >= 0; index -= 1) {
      const entry = this.#entries[index];
      if (!entry) continue;
      if (!document.documentElement.contains(entry.root) || !document.documentElement.contains(entry.host)) {
        this.#destroyEntry(entry);
        this.#entries.splice(index, 1);
        continue;
      }
      this.#render(entry);
    }
  }

  #render(entry: IndicatorEntry): void {
    if (!entry.visible) {
      entry.line.style.opacity = '1';
      entry.visible = true;
    }
    const start = roundPhysical(entry.state.x);
    const end = roundPhysical(entry.state.x + entry.state.width);
    const width = Math.max(physicalPixel(), end - start);
    entry.line.style.transform = `translate3d(${start}px,0,0) scaleX(${width})`;
  }

  #stopMove(entry: IndicatorEntry): void {
    if (entry.moveFrame) cancelAnimationFrame(entry.moveFrame);
    entry.moveFrame = 0;
    entry.lastMoveTime = 0;
    entry.startDeadline = 0;
    entry.endDeadline = 0;
  }

  #destroyEntry(entry: IndicatorEntry): void {
    this.#stopMove(entry);
    entry.line.remove();
  }

  #entryFor(root: HTMLElement): IndicatorEntry {
    const host = mountFor(root);
    for (let index = this.#entries.length - 1; index >= 0; index -= 1) {
      const current = this.#entries[index];
      if (!current || current.root !== root) continue;
      if (current.host === host) return current;
      this.#destroyEntry(current);
      this.#entries.splice(index, 1);
    }

    const line = cloneTemplate<HTMLElement>('category-indicator');
    host.classList.add('sc-category-motion-root');
    host.append(line);
    if (host.matches(CATEGORY_SELECTORS.mobileScroller)) line.style.setProperty('bottom', '0', 'important');

    const entry: IndicatorEntry = {
      root,
      host,
      line,
      state: { x: 0, width: 1 },
      targetStart: 0,
      targetEnd: 1,
      startSpec: motionTokens.springs.indicator.firm,
      endSpec: motionTokens.springs.indicator.firm,
      startDeadline: 0,
      endDeadline: 0,
      initialized: false,
      visible: false,
      moveFrame: 0,
      lastMoveTime: 0,
      velocityStart: 0,
      velocityEnd: 0,
    };
    this.#entries.push(entry);
    return entry;
  }

  #snap(entry: IndicatorEntry, x: number, width: number): void {
    this.#stopMove(entry);
    entry.targetStart = x;
    entry.targetEnd = x + width;
    entry.state.x = x;
    entry.state.width = width;
    entry.velocityStart = 0;
    entry.velocityEnd = 0;
    entry.initialized = true;
    this.#render(entry);
  }

  #advance(entry: IndicatorEntry, timestamp: number): void {
    const deltaTime = entry.lastMoveTime
      ? Math.max(0, (timestamp - entry.lastMoveTime) / 1000)
      : 0;
    entry.lastMoveTime = timestamp;
    if (deltaTime <= 0) return;

    let start = entry.state.x;
    let end = entry.state.x + entry.state.width;

    if (entry.startDeadline) {
      if (timestamp >= entry.startDeadline) {
        start = entry.targetStart;
        entry.velocityStart = 0;
        entry.startDeadline = 0;
      } else {
        [start, entry.velocityStart] = criticalSpringAxis(
          start,
          entry.velocityStart,
          entry.targetStart,
          deltaTime,
          entry.startSpec,
        );
      }
    }

    if (entry.endDeadline) {
      if (timestamp >= entry.endDeadline) {
        end = entry.targetEnd;
        entry.velocityEnd = 0;
        entry.endDeadline = 0;
      } else {
        [end, entry.velocityEnd] = criticalSpringAxis(
          end,
          entry.velocityEnd,
          entry.targetEnd,
          deltaTime,
          entry.endSpec,
        );
      }
    }

    entry.state.x = start;
    entry.state.width = end - start;
  }

  #step(entry: IndicatorEntry, timestamp: number): void {
    if (!entry.moveFrame) return;
    this.#advance(entry, timestamp);
    this.#render(entry);

    if (!entry.startDeadline && !entry.endDeadline) {
      entry.state.x = entry.targetStart;
      entry.state.width = entry.targetEnd - entry.targetStart;
      entry.velocityStart = 0;
      entry.velocityEnd = 0;
      entry.moveFrame = 0;
      entry.lastMoveTime = 0;
      this.#render(entry);
      return;
    }
    entry.moveFrame = requestAnimationFrame((next) => this.#step(entry, next));
  }

  #animate(entry: IndicatorEntry, x: number, width: number): void {
    if (queries.reducedMotion.matches) {
      this.#snap(entry, x, width);
      return;
    }

    const now = performance.now();
    if (entry.moveFrame && entry.lastMoveTime) this.#advance(entry, now);

    const newStart = x;
    const newEnd = x + width;

    if (entry.targetEnd !== newEnd) {
      entry.endSpec = entry.targetEnd < newEnd
        ? motionTokens.springs.indicator.firm
        : motionTokens.springs.indicator.soft;
      entry.targetEnd = newEnd;
      entry.endDeadline = now + criticalSpringDurationMs(
        entry.state.x + entry.state.width,
        entry.velocityEnd,
        newEnd,
        entry.endSpec,
      );
    }

    if (entry.targetStart !== newStart) {
      entry.startSpec = entry.targetStart < newStart
        ? motionTokens.springs.indicator.soft
        : motionTokens.springs.indicator.firm;
      entry.targetStart = newStart;
      entry.startDeadline = now + criticalSpringDurationMs(
        entry.state.x,
        entry.velocityStart,
        newStart,
        entry.startSpec,
      );
    }

    entry.initialized = true;
    if (!entry.startDeadline && !entry.endDeadline) {
      entry.state.x = entry.targetStart;
      entry.state.width = entry.targetEnd - entry.targetStart;
      this.#render(entry);
      return;
    }
    if (!entry.moveFrame) {
      entry.lastMoveTime = now;
      entry.moveFrame = requestAnimationFrame((timestamp) => this.#step(entry, timestamp));
    }
  }
}
