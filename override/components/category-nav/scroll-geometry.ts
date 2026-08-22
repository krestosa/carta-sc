import { queries, motionTokens, selectors } from '../../core/variables.js';
import { motion } from '../../motion/main.js';
import type { MotionHandle } from '../../motion/types.js';
import { CATEGORY_SCROLL, CATEGORY_SELECTORS } from './config.js';

export interface ScrollPlan {
  readonly y: number;
  readonly distance: number;
  readonly instant: boolean;
}

const confirmationMotions = new WeakMap<HTMLElement, MotionHandle>();
let offsetCache: number | null = null;

export function invalidateCategoryOffset(): void {
  offsetCache = null;
}

export function categoryOffsetIsDirty(): boolean {
  return offsetCache === null;
}

function persistentStickyHeight(
  node: HTMLElement,
  style: CSSStyleDeclaration,
  rect: DOMRect,
): number {
  if (style.position !== 'sticky') return 0;
  const isRail = node.matches(selectors.categoryToolbar)
    || node.matches(CATEGORY_SELECTORS.mobileWrapper);
  if (!isRail) {
    return rect.top <= CATEGORY_SCROLL.currentMarkOffset && rect.bottom > 0 ? rect.bottom : 0;
  }
  const top = Number.parseFloat(style.top);
  return Math.max(0, (Number.isFinite(top) ? top : 0) + rect.height);
}

export function categoryOffset(): number {
  if (offsetCache !== null) return offsetCache;

  let bottom = 0;
  const stickySelectors = [
    '.topBar',
    '.topShop',
    selectors.categoryToolbar,
    CATEGORY_SELECTORS.mobileWrapper,
  ];
  for (const selector of stickySelectors) {
    for (const node of document.querySelectorAll<HTMLElement>(selector)) {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      if (rect.height <= 0 || style.display === 'none' || style.visibility === 'hidden') continue;

      const candidate = style.position === 'fixed'
        && rect.top <= CATEGORY_SCROLL.currentMarkOffset
        && rect.bottom > 0
        ? rect.bottom
        : persistentStickyHeight(node, style, rect);
      bottom = Math.max(bottom, candidate);
    }
  }

  offsetCache = Math.ceil(bottom) + CATEGORY_SCROLL.offsetGap;
  return offsetCache;
}

export function currentPageY(): number {
  return window.pageYOffset || document.documentElement.scrollTop || 0;
}

export function targetYFromOffset(target: HTMLElement): number {
  const y = target.getBoundingClientRect().top + currentPageY() - categoryOffset();
  const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
  return Math.max(0, Math.min(max, y));
}

export function categoryTargetY(target: HTMLElement): number {
  invalidateCategoryOffset();
  return targetYFromOffset(target);
}

export function categoryScrollPlan(target: HTMLElement): ScrollPlan {
  const y = categoryTargetY(target);
  const distance = Math.abs(y - currentPageY());
  return {
    y,
    distance,
    instant: queries.reducedMotion.matches || distance < CATEGORY_SCROLL.currentMarkOffset,
  };
}

function associatedHeading(target: HTMLElement): HTMLElement | null {
  const headingSelector = `${selectors.sectionTitle},${selectors.sectionSubtitle}`;
  if (target.matches(headingSelector)) return target;

  let sibling = target.nextElementSibling;
  for (let steps = 0; sibling && steps < 5; steps += 1, sibling = sibling.nextElementSibling) {
    if (sibling.matches(headingSelector)) return sibling as HTMLElement;
    if (sibling.matches(selectors.productCard)) break;
  }

  const parent = target.parentElement;
  if (!parent) return null;
  const targetTop = target.getBoundingClientRect().top;
  return Array.from(parent.querySelectorAll<HTMLElement>(headingSelector))
    .find((heading) => heading.getBoundingClientRect().top >= targetTop - 2)
    ?? null;
}

export function confirmCategoryTarget(target: HTMLElement): void {
  const heading = associatedHeading(target);
  if (!heading || queries.reducedMotion.matches) return;

  confirmationMotions.get(heading)?.cancel();
  heading.style.opacity = '0.62';
  const handle = motion.engine.opacity(heading, 1, {
    duration: motionTokens.durations.medium1,
    ease: motionTokens.easings.decelerate,
    clear: true,
    onComplete: () => {
      if (confirmationMotions.get(heading) === handle) confirmationMotions.delete(heading);
    },
  });
  confirmationMotions.set(heading, handle);
}
