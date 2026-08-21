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
  targetX: number;
  targetWidth: number;
  direction: number;
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
  springMaxDt: 0.032,
  springPositionEpsilon: 0.06,
  springVelocityEpsilon: 0.45,
} as const;

const physicalPixel = (): number => 1 / Math.max(1, devicePixelRatio || 1);
const floorPhysical = (value: number): number => {
  const ratio = Math.max(1, devicePixelRatio || 1);
  return Math.floor(value * ratio + 1e-6) / ratio;
};

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

function springAxis(
  position: number,
  velocity: number,
  target: number,
  deltaTime: number,
  spec: MotionSpringSpec,
): [number, number] {
  const omega = Math.sqrt(spec.stiffness);
  const acceleration = -2 * spec.damping * omega * velocity - spec.stiffness * (position - target);
  velocity += acceleration * deltaTime;
  position += velocity * deltaTime;
  return [position, velocity];
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
    entry.line.style.transform = `translate3d(${entry.state.x}px,0,0) scaleX(${Math.max(1, entry.state.width)})`;
  }

  #stopMove(entry: IndicatorEntry): void {
    if (entry.moveFrame) cancelAnimationFrame(entry.moveFrame);
    entry.moveFrame = 0;
    entry.lastMoveTime = 0;
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
      targetX: 0,
      targetWidth: 1,
      direction: 1,
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
    entry.targetX = x;
    entry.targetWidth = width;
    entry.state.x = x;
    entry.state.width = width;
    entry.velocityStart = 0;
    entry.velocityEnd = 0;
    entry.initialized = true;
    this.#render(entry);
  }

  #settled(entry: IndicatorEntry): boolean {
    const currentEnd = entry.state.x + entry.state.width;
    const targetEnd = entry.targetX + entry.targetWidth;
    return Math.abs(entry.state.x - entry.targetX) < INDICATOR.springPositionEpsilon &&
      Math.abs(currentEnd - targetEnd) < INDICATOR.springPositionEpsilon &&
      Math.abs(entry.velocityStart) < INDICATOR.springVelocityEpsilon &&
      Math.abs(entry.velocityEnd) < INDICATOR.springVelocityEpsilon;
  }

  #step(entry: IndicatorEntry, timestamp: number): void {
    if (!entry.moveFrame) return;
    const deltaTime = entry.lastMoveTime
      ? Math.min(INDICATOR.springMaxDt, Math.max(0.001, (timestamp - entry.lastMoveTime) / 1000))
      : 1 / 60;
    entry.lastMoveTime = timestamp;

    let start = entry.state.x;
    let end = entry.state.x + entry.state.width;
    const targetStart = entry.targetX;
    const targetEnd = entry.targetX + entry.targetWidth;
    const forward = entry.direction >= 0;
    const startSpec = forward ? motionTokens.springs.indicator.soft : motionTokens.springs.indicator.firm;
    const endSpec = forward ? motionTokens.springs.indicator.firm : motionTokens.springs.indicator.soft;

    [start, entry.velocityStart] = springAxis(
      start,
      entry.velocityStart,
      targetStart,
      deltaTime,
      startSpec,
    );
    [end, entry.velocityEnd] = springAxis(
      end,
      entry.velocityEnd,
      targetEnd,
      deltaTime,
      endSpec,
    );

    entry.state.x = Math.min(start, end - 1);
    entry.state.width = Math.max(1, end - start);
    this.#render(entry);

    if (this.#settled(entry)) {
      entry.state.x = entry.targetX;
      entry.state.width = entry.targetWidth;
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
    const from = entry.state.x + entry.state.width / 2;
    const to = x + width / 2;
    entry.targetX = x;
    entry.targetWidth = width;
    entry.direction = to >= from ? 1 : -1;
    entry.initialized = true;
    if (!entry.moveFrame) {
      entry.lastMoveTime = 0;
      entry.moveFrame = requestAnimationFrame((timestamp) => this.#step(entry, timestamp));
    }
  }
}
