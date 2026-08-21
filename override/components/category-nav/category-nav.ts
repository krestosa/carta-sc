import { motionTokens, selectors } from '../../core/variables.js';
import { motion } from '../../motion/main.js';
import { CategoryActiveState } from './active-state.js';
import {
  anchorForHref,
  categoryScrollPlan,
  categoryLinks,
  cleanCategoryHash,
  closeLegacyCategoryMenus,
  CATEGORY_SELECTORS,
  desktopCategories,
  invalidateCategoryOffset,
  ProgrammaticCategoryScroll,
  subcategoryOwner,
} from './core.js';
import {
  isCategoryIndicatorDirty,
  markCategoryIndicatorDirty,
  moveCategoryIndicator,
  pauseCategoryIndicator,
  resumeCategoryIndicator,
} from './indicator.js';
import { applyCategorySemantics, syncCategoryLayout } from './layout.js';
import { CategoryRailController } from './rail.js';
import { CategoryScrollSpy } from './scroll-spy.js';
import { CategorySubmenu } from './submenu.js';

let scrollSpy: CategoryScrollSpy;
const rail = new CategoryRailController({
  invalidateOffset: invalidateCategoryOffset,
  refreshMetrics: () => scrollSpy.refresh(),
});
const activeState = new CategoryActiveState({
  requestCenter: rail.requestCenter,
  scheduleRail: rail.scheduleRail,
});
scrollSpy = new CategoryScrollSpy(activeState);
const programmaticScroll = new ProgrammaticCategoryScroll({
  refreshMetrics: scrollSpy.refresh,
  releaseSpyHold: scrollSpy.release,
  scheduleSpy: scrollSpy.schedule,
});
const submenu = new CategorySubmenu();

const boundScrollers = new Set<HTMLElement>();
let resizeFrame = 0;
let structureFrame = 0;
let motionRefreshFrame = 0;
let geometryTimer = 0;
let structureObserver: MutationObserver | null = null;
let initialized = false;

function activateAndScroll(target: HTMLElement, activeTarget: HTMLElement = target): void {
  invalidateCategoryOffset();
  const plan = categoryScrollPlan(target);
  scrollSpy.hold(activeTarget);
  activeState.set(activeTarget, true);
  programmaticScroll.scrollTo(target, plan);
}

function onCategory(event: MouseEvent): void {
  if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const origin = event.target instanceof Element ? event.target : null;
  const link = origin?.closest<HTMLAnchorElement>('a.anchorLink, a.anchorLinkSub, a.sc-category-submenu-link');
  if (!link) return;

  const submenuLink = link.classList.contains('sc-category-submenu-link');
  if (link.closest('.topPullDown,.dropdown-menu') && !submenuLink) return;
  const inManagedNav = link.closest(selectors.categoryToolbar) ||
    link.closest(`${CATEGORY_SELECTORS.mobileWrapper} ${CATEGORY_SELECTORS.mobileRail}`) ||
    link.closest('.sc-category-submenu');
  if (!inManagedNav) return;

  const target = anchorForHref(link.getAttribute('href'));
  if (!target) return;
  const owner = submenuLink ? subcategoryOwner(link) : null;
  const hasChildren = !submenuLink && submenu.has(link);
  const compact = !desktopCategories.matches;

  event.preventDefault();
  event.stopImmediatePropagation();
  closeLegacyCategoryMenus();
  cleanCategoryHash();

  if (submenuLink) {
    submenu.close(false);
    activateAndScroll(target, owner ?? target);
    return;
  }
  if (hasChildren && compact) {
    submenu.open(link, true);
    return;
  }
  if (hasChildren) submenu.open(link, true);
  activateAndScroll(target);
}

function onSelect(event: Event): void {
  const select = event.target instanceof HTMlSelectElement ? event.target : null;
  if (!select?.matches(CATEGORY_SELECTORS.select)) return;
  const target = anchorForHref(select.value);
  if (!target) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  closeLegacyCategoryMenus();
  cleanCategoryHash();
  submenu.close(false);
  activateAndScroll(target);
}

function pruneRailScrollers(): void {
  for (const scroller of boundScrollers) {
    if (document.documentElement.contains(scroller)) continue;
    scroller.removeEventListener('scroll', rail.scheduleOverflow);
    boundScrollers.delete(scroller);
  }
}

function bindRailScrollers(): void {
  pruneRailScrollers();
  for (const scroller of document.querySelectorAll<HTMLElement>(`${CATEGORY_SELECTORS.scroller},${CATEGORY_SELECTORS.mobileScroller}`)) {
    if (boundScrollers.has(scroller)) continue;
    boundScrollers.add(scroller);
    scroller.addEventListener('scroll', rail.scheduleOverflow, { passive: true });
  }
}

function unbindRailScrollers(): void {
  for (const scroller of boundScrollers) scroller.removeEventListener('scroll', rail.scheduleOverflow);
  boundScrollers.clear();
}

function refreshGeometry(): void {
  if (!initialized) return;
  invalidateCategoryOffset();
  scrollSpy.refresh();
  rail.scheduleRail();
  submenu.schedulePosition();
}

function runResize(): void {
  resizeFrame = 0;
  refreshGeometry();
}

function resize(): void {
  if (initialized && !resizeFrame) resizeFrame = requestAnimationFrame(runResize);
}

function windowScroll(): void {
  rail.scheduleSticky();
  scrollSpy.schedule();
  submenu.schedulePosition();
}

function interrupt(): void {
  programmaticScroll.interrupt();
  scrollSpy.release();
}

function observeStructure(): void {
  if (structureObserver && document.body) structureObserver.observe(document.body, { childList: true, subtree: true });
}

function refreshMotionSafely(): void {
  if (!initialized || motionRefreshFrame) return;
  motionRefreshFrame = requestAnimationFrame(() => {
    motionRefreshFrame = 0;
    if (!initialized) return;
    structureObserver?.disconnect();
    motion.refresh(0);
    structureObserver?.takeRecords();
    observeStructure();
  });
}

function syncStructure(): void {
  if (structureFrame) cancelAnimationFrame(structureFrame);
  structureFrame = 0;
  if (!initialized) return;
  invalidateCategoryOffset();
  syncCategoryLayout({ refreshMetrics: scrollSpy.refresh, scheduleRail: rail.scheduleRail });
  applyCategorySemantics();
  submenu.scan();
  bindRailScrollers();
  submenu.schedulePosition();
  structureObserver?.takeRecords();
  refreshMotionSafely();
}

function scheduleStructure(): void {
  if (initialized && !structureFrame) structureFrame = requestAnimationFrame(syncStructure);
}

function structural(node: Node): boolean {
  if (!(node instanceof Element)) return false;
  const selector = `${selectors.container}, ${selectors.categoryToolbar}, ${CATEGORY_SELECTORS.mobileWrapper}, .wrapp-nav-tabsTopShop`;
  return node.matches(selector) || Boolean(node.querySelector(selectors.container));
}

function watchStructure(): void {
  if (structureObserver || !document.body) return;
  structureObserver = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => [...mutation.addedNodes, ...mutation.removedNodes].some(structural))) scheduleStructure();
  });
  observeStructure();
}

function breakpoint(): void {
  submenu.close(false);
  syncStructure();
}

function addListeners(): void {
  document.addEventListener('click', onCategory, true);
  document.addEventListener('change', onSelect, true);
  document.addEventListener('pointerover', submenu.onPointerOver, true);
  document.addEventListener('pointerout', submenu.onPointerOut, true);
  document.addEventListener('pointerdown', submenu.onOutsidePointer, true);
  document.addEventListener('focusin', submenu.onFocusIn, true);
  document.addEventListener('focusout', submenu.onFocusOut, true);
  document.addEventListener('keydown', submenu.onKeyDown, true);
  window.addEventListener('scroll', windowScroll, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('wheel', interrupt, { passive: true });
  window.addEventListener('touchstart', interrupt, { passive: true });
  desktopCategories.addEventListener('change', breakpoint);
}

function removeListeners(): void {
  document.removeEventListener('click', onCategory, true);
  document.removeEventListener('change', onSelect, true);
  document.removeEventListener('pointerover', submenu.onPointerOver, true);
  document.removeEventListener('pointerout', submenu.onPointerOut, true);
  document.removeEventListener('pointerdown', submenu.onOutsidePointer, true);
  document.removeEventListener('focusin', submenu.onFocusIn, true);
  document.removeEventListener('focusout', submenu.onFocusOut, true);
  document.removeEventListener('keydown', submenu.onKeyDown, true);
  window.removeEventListener('scroll', windowScroll);
  window.removeEventListener('resize', resize);
  window.removeEventListener('wheel', interrupt);
  window.removeEventListener('touchstart', interrupt);
  desktopCategories.removeEventListener('change', breakpoint);
}

export function initializeCategoryNavigation(): () => void {
  if (initialized) return destroyCategoryNavigation;
  initialized = true;
  addListeners();
  syncStructure();
  resumeCategoryIndicator();
  watchStructure();
  geometryTimer = window.setTimeout(() => {
    geometryTimer = 0;
    if (!initialized) return;
    applyCategorySemantics();
    submenu.scan();
    refreshGeometry();
  }, motionTokens.geometryRefreshDelay);
  void document.fonts?.ready.then(refreshGeometry).catch(() => undefined);
  return destroyCategoryNavigation;
}

export function destroyCategoryNavigation(): void {
  if (!initialized) return;
  initialized = false;
  removeListeners();
  unbindRailScrollers();
  submenu.destroy();
  structureObserver?.disconnect();
  structureObserver = null;
  if (resizeFrame) cancelAnimationFrame(resizeFrame);
  if (structureFrame) cancelAnimationFrame(structureFrame);
  if (motionRefreshFrame) cancelAnimationFrame(motionRefreshFrame);
  if (geometryTimer) clearTimeout(geometryTimer);
  resizeFrame = structureFrame = motionRefreshFrame = geometryTimer = 0;
  rail.cancel();
  scrollSpy.stop();
  programmaticScroll.interrupt();
  pauseCategoryIndicator();
}

export function refreshCategoryNavMetrics(): void {
  scrollSpy.refresh();
}

export function repairCategoryNavigation(): void {
  scheduleStructure();
}

export function currentCategory(): HTMLElement | null {
  return scrollSpy.current();
}

export function setActiveCategory(target: HTMLElement | null, animate = true): void {
  activeState.set(target, animate);
}

export { markCategoryIndicatorDirty, moveCategoryIndicator, isCategoryIndicatorDirty, categoryLinks, anchorForHref };
