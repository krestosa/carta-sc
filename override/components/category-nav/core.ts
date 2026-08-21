import { queries, selectors } from '../../core/variables.js';
import { scrollState } from '../../core/state.js';

export const CATEGORY_SELECTORS = {
  select: '.JSgoMenu',
  scroller: '.sc-catalog-categories',
  mobileWrapper: '.fixedTopShop.wtopShopMenuMobile',
  mobileRail: '.topShopMenuMobile',
  mobileScroller: '.topShopMenuMobileScroller',
} as const;

export const CATEGORY_SCROLL = {
  offsetGap: 12,
  currentMarkOffset: 2,
  programmaticGraceMs: 180,
  minDuration: 0.72,
  maxDuration: 1.36,
  distanceScale: 2400,
  distancePower: 0.62,
  settleTolerance: 0.75,
} as const;

export interface ScrollPlan {
  readonly y: number;
  readonly distance: number;
  readonly duration: number;
}

export interface ProgrammaticScrollCallbacks {
  readonly refreshMetrics: () => void;
  readonly releaseSpyHold: () => void;
  readonly scheduleSpy: () => void;
  readonly confirmTarget?: (target: HTMLElement) => void;
}

const confirmationAnimations = new WeakMap<HTMLElement, Animation>();
let offsetCache: number | null = null;

export const desktopCategories = queries.desktop;

export function anchorForHref(href: string | null): HTMLElement | null {
  if (!href?.startsWith('#') || href === '#') return null;
  let id = href.slice(1);
  try { id = decodeURIComponent(id); } catch { /* El hash puede contener escapes legacy inválidos. */ }
  return document.getElementById(id) ?? (document.getElementsByName(id)[0] as HTMLElement | undefined) ?? null;
}

export function isParentCategoryLink(element: Element): element is HTMLAnchorElement {
  return element.matches('a.anchorLink[href^="#"]') &&
    !element.classList.contains('anchorLinkSub') &&
    !element.closest('.topPullDown,.dropdown-menu');
}

export function categoryLinks(root: ParentNode = document): HTMLAnchorElement[] {
  return Array.from(root.querySelectorAll<HTMLAnchorElement>('a.anchorLink[href^="#"]')).filter(isParentCategoryLink);
}

export function subcategoryOwner(link: Element | null): HTMLElement | null {
  if (!link) return null;
  const parentHref = link.getAttribute('data-sc-parent-href');
  if (parentHref) return anchorForHref(parentHref);
  const nested = link.closest('.topPullDown');
  const parent = nested?.closest('.nav-top-li')?.querySelector<HTMLAnchorElement>(':scope > a.anchorLink[href^="#"]');
  return parent ? anchorForHref(parent.getAttribute('href')) : null;
}

export function invalidateCategoryOffset(): void {
  offsetCache = null;
}

function persistentStickyHeight(node: HTMLElement, style: CSSStyleDeclaration, rect: DOMRect): number {
  if (style.position !== 'sticky') return 0;
  const isRail = node.matches(selectors.categoryToolbar) || node.matches(CATEGORY_SELECTORS.mobileWrapper);
  if (!isRail) return rect.top <= CATEGORY_SCROLL.currentMarkOffset && rect.bottom > 0 ? rect.bottom : 0;
  const top = Number.parseFloat(style.top);
  return Math.max(0, (Number.isFinite(top) ? top : 0) + rect.height);
}

export function categoryOffset(): number {
  if (offsetCache !== null) return offsetCache;
  let bottom = 0;
  for (const selector of ['.topBar', '.topShop', selectors.categoryToolbar, CATEGORY_SELECTORS.mobileWrapper]) {
    for (const node of document.querySelectorAll<HTMLElement>(selector)) {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      if (rect.height <= 0 || style.display === 'none' || style.visibility === 'hidden') continue;
      const candidate = style.position === 'fixed' && rect.top <= CATEGORY_SCROLL.currentMarkOffset && rect.bottom > 0
        ? rect.bottom
        : persistentStickyHeight(node, style, rect);
      bottom = Math.max(bottom, candidate);
    }
  }
  offsetCache = Math.ceil(bottom) + CATEGORY_SCROLL.offsetGap;
  return offsetCache;
}

export function closeLegacyCategoryMenus(): void {
  document.querySelectorAll(selectors.legacyPullDownOpen).forEach((node) => node.classList.remove('open'));
  document.querySelectorAll(selectors.legacyMobileOpen).forEach((node) => node.classList.remove('_open'));
}

export function cleanCategoryHash(): void {
  if (!/^#anchor/i.test(location.hash)) return;
  try { history.replaceState(history.state, document.title, location.pathname + location.search); } catch { /* history puede estar restringido. */ }
}

function durationForDistance(distance: number): number {
  const range = CATEGORY_SCROLL.maxDuration - CATEGORY_SCROLL.minDuration;
  const scaled = Math.pow(Math.min(1, distance / CATEGORY_SCROLL.distanceScale), CATEGORY_SCROLL.distancePower);
  return Math.min(CATEGORY_SCROLL.maxDuration, Math.max(CATEGORY_SCROLL.minDuration, CATEGORY_SCROLL.minDuration + scaled * range));
}

function currentPageY(): number {
  return window.pageYOffset || document.documentElement.scrollTop || 0;
}

function targetYFromOffset(target: HTMLElement): number {
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
  const instant = queries.reducedMotion.matches || distance < CATEGORY_SCROLL.currentMarkOffset;
  return { y, distance, duration: instant ? 0 : durationForDistance(distance) };
}

function easing(progress: number): number {
  return progress < 0.5 ? 4 * progress ** 3 : 1 - ((-2 * progress + 2) ** 3) / 2;
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
    .find((heading) => heading.getBoundingClientRect().top >= targetTop - 2) ?? null;
}

export function confirmCategoryTarget(target: HTMLElement): void {
  const heading = associatedHeading(target);
  if (!heading || queries.reducedMotion.matches || typeof heading.animate !== 'function') return;
  confirmationAnimations.get(heading)?.cancel();
  const animation = heading.animate([{ opacity: 0.62 }, { opacity: 1 }], {
    duration: 260,
    easing: 'cubic-bezier(.22,1,.36,1)',
  });
  confirmationAnimations.set(heading, animation);
  const clear = (): void => {
    if (confirmationAnimations.get(heading) === animation) confirmationAnimations.delete(heading);
  };
  animation.onfinish = clear;
  animation.oncancel = clear;
}

export class ProgrammaticCategoryScroll {
  readonly #callbacks: ProgrammaticScrollCallbacks;
  #frame = 0;
  #token = 0;

  constructor(callbacks: ProgrammaticScrollCallbacks) {
    this.#callbacks = callbacks;
  }

  get active(): boolean {
    return scrollState.programmatic;
  }

  scrollTo(target: HTMLElement, plan: ScrollPlan = categoryScrollPlan(target)): void {
    invalidateCategoryOffset();
    this.cancel(false);
    const token = ++this.#token;
    this.#setProgrammatic(true, false);
    if (plan.duration === 0) {
      window.scrollTo(0, categoryTargetY(target));
      this.#finish(token, target);
      return;
    }
    this.#animate(target, token, plan.duration, plan.y);
  }

  interrupt(): void {
    if (scrollState.programmatic) this.cancel(true);
  }

  cancel(userInterrupt: boolean): void {
    this.#token += 1;
    if (this.#frame) cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    if (!userInterrupt) return;
    this.#setProgrammatic(false, false);
    this.#callbacks.releaseSpyHold();
    this.#callbacks.scheduleSpy();
  }

  #setProgrammatic(active: boolean, grace: boolean): void {
    scrollState.programmatic = active;
    scrollState.suppressRevealUntil = active ? Infinity : grace ? performance.now() + CATEGORY_SCROLL.programmaticGraceMs : 0;
  }

  #finish(token: number, target: HTMLElement): void {
    if (token !== this.#token) return;
    this.#frame = requestAnimationFrame(() => {
      if (token !== this.#token) return;
      this.#frame = requestAnimationFrame(() => {
        this.#frame = 0;
        if (token !== this.#token) return;
        const finalY = categoryTargetY(target);
        if (Math.abs(finalY - currentPageY()) > CATEGORY_SCROLL.settleTolerance) window.scrollTo(0, finalY);
        this.#callbacks.refreshMetrics();
        this.#setProgrammatic(false, true);
        this.#callbacks.releaseSpyHold();
        this.#callbacks.scheduleSpy();
        (this.#callbacks.confirmTarget ?? confirmCategoryTarget)(target);
      });
    });
  }

  #animate(target: HTMLElement, token: number, duration: number, destination: number): void {
    const startY = currentPageY();
    const startTime = performance.now();
    const durationMs = duration * 1000;
    const frame = (now: number): void => {
      if (token !== this.#token) return;
      if (offsetCache === null) destination = targetYFromOffset(target);
      const progress = Math.min(1, (now - startTime) / durationMs);
      window.scrollTo(0, startY + (destination - startY) * easing(progress));
      if (progress < 1) this.#frame = requestAnimationFrame(frame);
      else {
        this.#frame = 0;
        this.#finish(token, target);
      }
    };
    this.#frame = requestAnimationFrame(frame);
  }
}
