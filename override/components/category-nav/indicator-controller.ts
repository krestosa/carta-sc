import { motionTokens, queries } from '../../core/variables.js';
import { visible } from '../../core/utils.js';
import { motion } from '../../motion/main.js';
import type { MotionHandle, MotionSpringSpec } from '../../motion/types.js';
import { cloneTemplate } from '../../templates/registry.js';
import { anchorForHref, categoryLinks, CATEGORY_SELECTORS } from './core.js';

interface IndicatorState {
  x: number;
  width: number;
  warp: number;
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
  velocityX: number;
  velocityWidth: number;
  velocityWarp: number;
  scrollElement: HTMLElement | null;
  onScroll: (() => void) | null;
  scrollX: number;
  scrollTime: number;
  warpTween: MotionHandle | null;
  settle: MotionHandle | null;
}

const INDICATOR = {
  minWidth: 6,
  maxWarp: 11,
  minWarp: 4.5,
  warpWidthRatio: 0.13,
  leadingShare: 0.92,
  trailingShare: 0.08,
  scrollSampleMin: 0.003,
  scrollSampleMax: 0.16,
  scrollVelocityScale: 700,
  scrollSettleDelay: motionTokens.durations.short1,
  textInsetMax: 1.25,
  textInsetRatio: 0.025,
  springMaxDt: 0.032,
  springPositionEpsilon: 0.06,
  springVelocityEpsilon: 0.45,
} as const;

const now = (): number => performance.now();
const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
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

function scrollElementFor(root: HTMLElement, host: HTMLElement): HTMLElement | null {
  return root.closest<HTMLElement>(`${CATEGORY_SELECTORS.mobileScroller},${CATEGORY_SELECTORS.scroller}`) ??
    (host.scrollWidth > host.clientWidth + 1 ? host : null);
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

function maxWarp(width: number): number {
  return Math.min(INDICATOR.maxWarp, Math.max(INDICATOR.minWarp, width * INDICATOR.warpWidthRatio));
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
    for (const entry of this.#entries) {
      this.#unbindScroll(entry);
      this.#stopMotion(entry);
    }
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
      this.#bindScroll(entry);
      this.#render(entry);
    }
  }

  #render(entry: IndicatorEntry): void {
    const stretch = Math.abs(entry.state.warp);
    let left = entry.state.x;
    const width = entry.state.width + stretch;
    left -= stretch * (entry.state.warp >= 0 ? INDICATOR.trailingShare : INDICATOR.leadingShare);
    if (!entry.visible) {
      entry.line.style.opacity = '1';
      entry.visible = true;
    }
    entry.line.style.transform = `translate3d(${left}px,0,0) scaleX(${Math.max(1, width)})`;
  }

  #stopSettle(entry: IndicatorEntry): void {
    entry.settle?.cancel();
    entry.settle = null;
  }

  #stopWarp(entry: IndicatorEntry): void {
    this.#stopSettle(entry);
    entry.warpTween?.cancel();
    entry.warpTween = null;
  }

  #stopMove(entry: IndicatorEntry): void {
    if (entry.moveFrame) cancelAnimationFrame(entry.moveFrame);
    entry.moveFrame = 0;
    entry.lastMoveTime = 0;
  }

  #stopMotion(entry: IndicatorEntry): void {
    this.#stopMove(entry);
    this.#stopWarp(entry);
  }

  #unbindScroll(entry: IndicatorEntry): void {
    if (entry.scrollElement && entry.onScroll) entry.scrollElement.removeEventListener('scroll', entry.onScroll);
    entry.scrollElement = null;
    entry.onScroll = null;
    this.#stopSettle(entry);
  }

  #destroyEntry(entry: IndicatorEntry): void {
    this.#unbindScroll(entry);
    this.#stopMotion(entry);
    entry.line.remove();
  }

  #springWarp(entry: IndicatorEntry, target: number): void {
    entry.warpTween?.cancel();
    const from = entry.state.warp;
    entry.warpTween = motion.engine.spring(motionTokens.springs.effects.fast, (progress) => {
      entry.state.warp = from + (target - from) * progress;
      this.#render(entry);
    }, { onComplete: () => { entry.warpTween = null; } });
  }

  #pulseScroll(entry: IndicatorEntry, velocity: number): void {
    if (queries.reducedMotion.matches || entry.moveFrame) return;
    const amount = maxWarp(entry.targetWidth || entry.state.width) * clamp(Math.abs(velocity) / INDICATOR.scrollVelocityScale, 0, 1);
    if (amount < 0.2) return;
    entry.direction = velocity > 0 ? 1 : -1;
    this.#springWarp(entry, entry.direction * amount);
    this.#stopSettle(entry);
    entry.settle = motion.engine.delay(INDICATOR.scrollSettleDelay, () => {
      entry.settle = null;
      this.#springWarp(entry, 0);
    });
  }

  #bindScroll(entry: IndicatorEntry): void {
    const element = scrollElementFor(entry.root, entry.host);
    if (element === entry.scrollElement) return;
    this.#unbindScroll(entry);
    entry.scrollElement = element;
    if (!element) return;

    entry.scrollX = element.scrollLeft;
    entry.scrollTime = now();
    entry.onScroll = () => {
      const time = now();
      const x = element.scrollLeft;
      const deltaTime = (time - entry.scrollTime) / 1000;
      if (deltaTime > INDICATOR.scrollSampleMin && deltaTime < INDICATOR.scrollSampleMax) {
        this.#pulseScroll(entry, -(x - entry.scrollX) / deltaTime);
      }
      entry.scrollX = x;
      entry.scrollTime = time;
    };
    element.addEventListener('scroll', entry.onScroll, { passive: true });
  }

  #entryFor(root: HTMLElement): IndicatorEntry {
    const host = mountFor(root);
    for (let index = this.#entries.length - 1; index >= 0; index -= 1) {
      const current = this.#entries[index];
      if (!current || current.root !== root) continue;
      if (current.host === host) {
        this.#bindScroll(current);
        return current;
      }
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
      state: { x: 0, width: 1, warp: 0 },
      targetX: 0,
      targetWidth: 1,
      direction: 1,
      initialized: false,
      visible: false,
      moveFrame: 0,
      lastMoveTime: 0,
      velocityX: 0,
      velocityWidth: 0,
      velocityWarp: 0,
      scrollElement: null,
      onScroll: null,
      scrollX: 0,
      scrollTime: 0,
      warpTween: null,
      settle: null,
    };
    this.#entries.push(entry);
    this.#bindScroll(entry);
    return entry;
  }

  #snap(entry: IndicatorEntry, x: number, width: number): void {
    this.#stopMotion(entry);
    entry.targetX = x;
    entry.targetWidth = width;
    entry.state.x = x;
    entry.state.width = width;
    entry.state.warp = 0;
    entry.velocityX = 0;
    entry.velocityWidth = 0;
    entry.velocityWarp = 0;
    entry.initialized = true;
    this.#render(entry);
  }

  #settled(entry: IndicatorEntry): boolean {
    return Math.abs(entry.state.x - entry.targetX) < INDICATOR.springPositionEpsilon &&
      Math.abs(entry.state.width - entry.targetWidth) < INDICATOR.springPositionEpsilon &&
      Math.abs(entry.velocityX) < INDICATOR.springVelocityEpsilon &&
      Math.abs(entry.velocityWidth) < INDICATOR.springVelocityEpsilon;
  }

  #step(entry: IndicatorEntry, timestamp: number): void {
    if (!entry.moveFrame) return;
    const deltaTime = entry.lastMoveTime
      ? Math.min(INDICATOR.springMaxDt, Math.max(0.001, (timestamp - entry.lastMoveTime) / 1000))
      : 1 / 60;
    entry.lastMoveTime = timestamp;

    [entry.state.x, entry.velocityX] = springAxis(
      entry.state.x,
      entry.velocityX,
      entry.targetX,
      deltaTime,
      motionTokens.springs.spatial.default,
    );
    [entry.state.width, entry.velocityWidth] = springAxis(
      entry.state.width,
      entry.velocityWidth,
      entry.targetWidth,
      deltaTime,
      motionTokens.springs.spatial.default,
    );
    entry.state.width = Math.max(1, entry.state.width);

    const centerVelocity = entry.velocityX + entry.velocityWidth * 0.5;
    const warpTarget = clamp(centerVelocity / 900, -1, 1) * maxWarp(entry.state.width);
    [entry.state.warp, entry.velocityWarp] = springAxis(
      entry.state.warp,
      entry.velocityWarp,
      warpTarget,
      deltaTime,
      motionTokens.springs.effects.fast,
    );
    this.#render(entry);

    if (this.#settled(entry)) {
      entry.state.x = entry.targetX;
      entry.state.width = entry.targetWidth;
      entry.state.warp = 0;
      entry.velocityX = 0;
      entry.velocityWidth = 0;
      entry.velocityWarp = 0;
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
    this.#stopWarp(entry);
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
