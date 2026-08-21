import { queries } from '../../core/variables.js';
import { visible } from '../../core/utils.js';
import { motion } from '../../motion/main.js';
import type { MotionHandle } from '../../motion/types.js';
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
  scrollWarpDuration: 0.14,
  scrollSettleDelay: 0.065,
  textInsetMax: 1.25,
  textInsetRatio: 0.025,
  springResponse: 0.34,
  springDamping: 1,
  springMaxDt: 0.032,
  springPositionEpsilon: 0.06,
  springVelocityEpsilon: 0.45,
  springWarpResponse: 18,
} as const;

const entries: IndicatorEntry[] = [];
let dirty = true;

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

function render(entry: IndicatorEntry): void {
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

function stopSettle(entry: IndicatorEntry): void {
  entry.settle?.cancel();
  entry.settle = null;
}

function stopWarp(entry: IndicatorEntry): void {
  stopSettle(entry);
  entry.warpTween?.cancel();
  entry.warpTween = null;
}

function stopMove(entry: IndicatorEntry): void {
  if (entry.moveFrame) cancelAnimationFrame(entry.moveFrame);
  entry.moveFrame = 0;
  entry.lastMoveTime = 0;
}

function stopMotion(entry: IndicatorEntry): void {
  stopMove(entry);
  stopWarp(entry);
}

function unbindScroll(entry: IndicatorEntry): void {
  if (entry.scrollElement && entry.onScroll) entry.scrollElement.removeEventListener('scroll', entry.onScroll);
  entry.scrollElement = null;
  entry.onScroll = null;
  stopSettle(entry);
}

function destroyEntry(entry: IndicatorEntry): void {
  unbindScroll(entry);
  stopMotion(entry);
  entry.line.remove();
}

function maxWarp(width: number): number {
  return Math.min(INDICATOR.maxWarp, Math.max(INDICATOR.minWarp, width * INDICATOR.warpWidthRatio));
}

function tweenWarp(entry: IndicatorEntry, target: number): void {
  entry.warpTween?.cancel();
  const from = entry.state.warp;
  entry.warpTween = motion.engine.tween(INDICATOR.scrollWarpDuration, 'quart.out', (progress) => {
    entry.state.warp = from + (target - from) * progress;
    render(entry);
  }, { onComplete: () => { entry.warpTween = null; } });
}

function pulseScroll(entry: IndicatorEntry, velocity: number): void {
  if (queries.reducedMotion.matches || entry.moveFrame) return;
  const amount = maxWarp(entry.targetWidth || entry.state.width) * clamp(Math.abs(velocity) / INDICATOR.scrollVelocityScale, 0, 1);
  if (amount < 0.2) return;
  entry.direction = velocity > 0 ? 1 : -1;
  tweenWarp(entry, entry.direction * amount);
  stopSettle(entry);
  entry.settle = motion.engine.delay(INDICATOR.scrollSettleDelay, () => {
    entry.settle = null;
    tweenWarp(entry, 0);
  });
}

function bindScroll(entry: IndicatorEntry): void {
  const element = scrollElementFor(entry.root, entry.host);
  if (element === entry.scrollElement) return;
  unbindScroll(entry);
  entry.scrollElement = element;
  if (!element) return;

  entry.scrollX = element.scrollLeft;
  entry.scrollTime = now();
  entry.onScroll = () => {
    const time = now();
    const x = element.scrollLeft;
    const deltaTime = (time - entry.scrollTime) / 1000;
    if (deltaTime > INDICATOR.scrollSampleMin && deltaTime < INDICATOR.scrollSampleMax) {
      pulseScroll(entry, -(x - entry.scrollX) / deltaTime);
    }
    entry.scrollX = x;
    entry.scrollTime = time;
  };
  element.addEventListener('scroll', entry.onScroll, { passive: true });
}

function entryFor(root: HTMLElement): IndicatorEntry {
  const host = mountFor(root);
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const current = entries[index];
    if (!current || current.root !== root) continue;
    if (current.host === host) {
      bindScroll(current);
      return current;
    }
    destroyEntry(current);
    entries.splice(index, 1);
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
    scrollElement: null,
    onScroll: null,
    scrollX: 0,
    scrollTime: 0,
    warpTween: null,
    settle: null,
  };
  entries.push(entry);
  bindScroll(entry);
  return entry;
}

function snap(entry: IndicatorEntry, x: number, width: number): void {
  stopMotion(entry);
  entry.targetX = x;
  entry.targetWidth = width;
  entry.state.x = x;
  entry.state.width = width;
  entry.state.warp = 0;
  entry.velocityX = 0;
  entry.velocityWidth = 0;
  entry.initialized = true;
  render(entry);
}

function springAxis(position: number, velocity: number, target: number, deltaTime: number): [number, number] {
  const omega = (Math.PI * 2) / INDICATOR.springResponse;
  const acceleration = -2 * INDICATOR.springDamping * omega * velocity - omega * omega * (position - target);
  velocity += acceleration * deltaTime;
  position += velocity * deltaTime;
  return [position, velocity];
}

function settled(entry: IndicatorEntry): boolean {
  return Math.abs(entry.state.x - entry.targetX) < INDICATOR.springPositionEpsilon &&
    Math.abs(entry.state.width - entry.targetWidth) < INDICATOR.springPositionEpsilon &&
    Math.abs(entry.velocityX) < INDICATOR.springVelocityEpsilon &&
    Math.abs(entry.velocityWidth) < INDICATOR.springVelocityEpsilon;
}

function step(entry: IndicatorEntry, timestamp: number): void {
  if (!entry.moveFrame) return;
  const deltaTime = entry.lastMoveTime
    ? Math.min(INDICATOR.springMaxDt, Math.max(0.001, (timestamp - entry.lastMoveTime) / 1000))
    : 1 / 60;
  entry.lastMoveTime = timestamp;

  [entry.state.x, entry.velocityX] = springAxis(entry.state.x, entry.velocityX, entry.targetX, deltaTime);
  [entry.state.width, entry.velocityWidth] = springAxis(entry.state.width, entry.velocityWidth, entry.targetWidth, deltaTime);
  entry.state.width = Math.max(1, entry.state.width);

  const centerVelocity = entry.velocityX + entry.velocityWidth * 0.5;
  const warpTarget = clamp(centerVelocity / 900, -1, 1) * maxWarp(entry.state.width);
  const blend = Math.min(1, deltaTime * INDICATOR.springWarpResponse);
  entry.state.warp += (warpTarget - entry.state.warp) * blend;
  render(entry);

  if (settled(entry)) {
    entry.state.x = entry.targetX;
    entry.state.width = entry.targetWidth;
    entry.state.warp = 0;
    entry.velocityX = 0;
    entry.velocityWidth = 0;
    entry.moveFrame = 0;
    entry.lastMoveTime = 0;
    render(entry);
    return;
  }
  entry.moveFrame = requestAnimationFrame((next) => step(entry, next));
}

function animate(entry: IndicatorEntry, x: number, width: number): void {
  if (queries.reducedMotion.matches) {
    snap(entry, x, width);
    return;
  }
  stopWarp(entry);
  const from = entry.state.x + entry.state.width / 2;
  const to = x + width / 2;
  entry.targetX = x;
  entry.targetWidth = width;
  entry.direction = to >= from ? 1 : -1;
  entry.initialized = true;
  if (!entry.moveFrame) {
    entry.lastMoveTime = 0;
    entry.moveFrame = requestAnimationFrame((timestamp) => step(entry, timestamp));
  }
}

export function moveCategoryIndicator(target: Element | null, animateMotion: boolean): void {
  for (const root of visibleRoots(target)) {
    const link = categoryLinks(root).find((candidate) => sameTarget(candidate, target) && visible(candidate));
    if (!link) continue;

    const entry = entryFor(root);
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

    if (!entry.initialized || !animateMotion || queries.reducedMotion.matches) snap(entry, x, width);
    else animate(entry, x, width);
  }
  dirty = false;
}

export function markCategoryIndicatorDirty(): void {
  dirty = true;
}

export function isCategoryIndicatorDirty(): boolean {
  return dirty;
}

export function pauseCategoryIndicator(): void {
  entries.forEach((entry) => {
    unbindScroll(entry);
    stopMotion(entry);
  });
}

export function resumeCategoryIndicator(): void {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (!entry) continue;
    if (!document.documentElement.contains(entry.root) || !document.documentElement.contains(entry.host)) {
      destroyEntry(entry);
      entries.splice(index, 1);
      continue;
    }
    bindScroll(entry);
    render(entry);
  }
}
