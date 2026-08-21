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

class CategorySubmenu {
  #host: HTMLElement | null = null;
  #parent: HTMLAnchorElement | null = null;
  #pinned = false;
  #closeTimer = 0;
  #positionFrame = 0;
  #scroller: HTMLElement | null = null;

  links(parent: HTMLAnchorElement | null): HTMLAnchorElement[] {
    const source = parent?.closest<HTMLElement>('.nav-top-li')?.querySelector<HTMLElement>('.topPullDown .topPullChild');
    if (!source) return [];
    return Array.from(source.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'))
      .filter((link) => Boolean(anchorForHref(link.getAttribute('href'))));
  }

  has(parent: HTMLAnchorElement | null): boolean {
    return this.links(parent).length > 0;
  }

  scan(): void {
    for (const link of document.querySelectorAll<HTMLAnchorElement>('.nav-top-li > a.anchorLink[href^="#"]')) {
      const item = link.closest<HTMLElement>('.nav-top-li');
      const hasChildren = this.has(link);
      item?.classList.toggle('sc-has-subcategories', hasChildren);
      if (hasChildren) {
        link.setAttribute('aria-haspopup', 'menu');
        link.setAttribute('aria-controls', 'sc-category-submenu');
        if (link !== this.#parent) link.setAttribute('aria-expanded', 'false');
      } else {
        link.removeAttribute('aria-haspopup');
        link.removeAttribute('aria-controls');
        link.removeAttribute('aria-expanded');
      }
    }
    if (this.#parent && !document.documentElement.contains(this.#parent)) this.close(false);
  }

  open(parent: HTMLAnchorElement, pin = true): boolean {
    if (!this.has(parent)) return false;
    this.#clearCloseTimer();
    const same = parent === this.#parent;
    if (!same && this.#parent) this.#setExpanded(this.#parent, false);
    this.#parent = parent;
    this.#pinned = pin || (same && this.#pinned);

    const host = this.#render(parent);
    this.#setExpanded(parent, true);
    parent.setAttribute('aria-controls', host.id);
    host.classList.add('sc-category-submenu-open');
    host.setAttribute('aria-hidden', 'false');
    this.#bindScroller(parent);
    this.schedulePosition();
    return true;
  }

  close(restoreFocus: boolean): void {
    this.#clearCloseTimer();
    this.#clearPositionFrame();
    this.#unbindScroller();
    this.#host?.classList.remove('sc-category-submenu-open');
    this.#host?.setAttribute('aria-hidden', 'true');

    const parent = this.#parent;
    this.#parent = null;
    this.#pinned = false;
    if (parent) this.#setExpanded(parent, false);
    if (restoreFocus && parent && document.documentElement.contains(parent)) parent.focus();
  }

  destroy(): void {
    this.close(false);
    this.#host?.remove();
    this.#host = null;
  }

  schedulePosition = (): void => {
    if (this.#host?.classList.contains('sc-category-submenu-open') && !this.#positionFrame) {
      this.#positionFrame = requestAnimationFrame(this.#position);
    }
  };

  parentFromEvent(event: Event): HTMLAnchorElement | null {
    const target = event.target instanceof Element ? event.target : null;
    const link = target?.closest<HTMLAnchorElement>('.nav-top-li > a.anchorLink[href^="#"]') ?? null;
    return link && this.has(link) ? link : null;
  }

  onPointerOver = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') return;
    const parent = this.parentFromEvent(event);
    if (!parent || (this.#pinned && this.#parent && this.#parent !== parent)) return;
    this.open(parent, false);
  };

  onPointerOut = (event: PointerEvent): void => {
    if (event.pointerType === 'touch' || this.#pinned) return;
    const parent = this.parentFromEvent(event);
    if (!parent || parent !== this.#parent) return;
    const next = event.relatedTarget;
    if (next instanceof Node && (parent.closest<HTMLElement>('.nav-top-li')?.contains(next) || this.#host?.contains(next))) return;
    this.#scheduleClose();
  };

  onFocusIn = (event: FocusEvent): void => {
    const parent = this.parentFromEvent(event);
    if (parent && !this.#pinned) this.open(parent, false);
  };

  onFocusOut = (event: FocusEvent): void => {
    if (this.#pinned || !this.#parent) return;
    const next = event.relatedTarget;
    if (next instanceof Node && (this.#host?.contains(next) || this.#parent.closest<HTMLElement>('.nav-top-li')?.contains(next))) return;
    this.#scheduleClose();
  };

  onOutsidePointer = (event: PointerEvent): void => {
    if (!this.#parent || !(event.target instanceof Node)) return;
    if (this.#host?.contains(event.target) || this.#parent.closest<HTMLElement>('.nav-top-li')?.contains(event.target)) return;
    this.close(false);
  };

  onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this.#parent) return;
    event.preventDefault();
    this.close(true);
  };

  #ensureHost(): HTMLElement {
    if (this.#host && document.documentElement.contains(this.#host)) return this.#host;
    const host = document.createElement('div');
    host.id = 'sc-category-submenu';
    host.className = 'sc-category-submenu';
    host.setAttribute('role', 'menu');
    host.setAttribute('aria-hidden', 'true');
    const list = document.createElement('div');
    list.className = 'sc-category-submenu-list';
    host.append(list);
    document.body.append(host);
    host.addEventListener('pointerenter', this.#clearCloseTimer);
    host.addEventListener('pointerleave', () => { if (!this.#pinned) this.#scheduleClose(); });
    this.#host = host;
    return host;
  }

  #render(parent: HTMLAnchorElement): HTMLElement {
    const host = this.#ensureHost();
    const list = host.querySelector<HTMLElement>('.sc-category-submenu-list');
    if (!list) return host;
    list.textContent = '';
    const parentHref = parent.getAttribute('href') ?? '';
    for (const source of this.links(parent)) {
      const link = document.createElement('a');
      link.className = 'sc-category-submenu-link';
      link.setAttribute('role', 'menuitem');
      link.href = source.getAttribute('href') ?? '';
      link.dataset.scParentHref = parentHref;
      link.textContent = source.textContent?.trim() ?? '';
      list.append(link);
    }
    host.setAttribute('aria-label', `Subcategorías de ${parent.textContent?.trim() ?? ''}`);
    return host;
  }

  #setExpanded(parent: HTMLAnchorElement, expanded: boolean): void {
    parent.closest<HTMLElement>('.nav-top-li')?.classList.toggle('sc-submenu-open', expanded);
    parent.setAttribute('aria-expanded', String(expanded));
  }

  #bindScroller(parent: HTMLAnchorElement): void {
    this.#unbindScroller();
    this.#scroller = parent.closest<HTMLElement>(`${CATEGORY_SELECTORS.scroller},${CATEGORY_SELECTORS.mobileScroller}`);
    this.#scroller?.addEventListener('scroll', this.schedulePosition, { passive: true });
  }

  #unbindScroller(): void {
    this.#scroller?.removeEventListener('scroll', this.schedulePosition);
    this.#scroller = null;
  }

  #position = (): void => {
    this.#positionFrame = 0;
    const host = this.#host;
    const parent = this.#parent;
    if (!host || !parent || !host.classList.contains('sc-category-submenu-open')) return;
    if (!document.documentElement.contains(parent)) {
      this.close(false);
      return;
    }

    const rect = parent.getBoundingClientRect();
    const railRect = parent.closest<HTMLElement>(`${selectors.categoryToolbar},${CATEGORY_SELECTORS.mobileWrapper}`)?.getBoundingClientRect();
    const gap = 7;
    const edge = 12;
    const width = host.offsetWidth;
    const height = host.offsetHeight;
    const left = Math.max(edge, Math.min(rect.left, innerWidth - width - edge));
    let top = (railRect?.bottom ?? rect.bottom) + gap;
    let above = false;
    if (top + height > innerHeight - edge && rect.top - height - gap >= edge) {
      top = rect.top - height - gap;
      above = true;
    }
    top = Math.max(edge, top);
    host.style.left = `${Math.round(left)}px`;
    host.style.top = `${Math.round(top)}px`;
    const originX = Math.max(12, Math.min(Math.max(12, width - 12), rect.left + rect.width / 2 - left));
    host.style.setProperty('--sc-submenu-origin-x', `${Math.round(originX)}px`);
    host.style.setProperty('--sc-submenu-origin-y', above ? `${Math.round(height)}px` : '0px');
  };

  #clearCloseTimer = (): void => {
    if (this.#closeTimer) clearTimeout(this.#closeTimer);
    this.#closeTimer = 0;
  };

  #clearPositionFrame(): void {
    if (this.#positionFrame) cancelAnimationFrame(this.#positionFrame);
    this.#positionFrame = 0;
  }

  #scheduleClose(): void {
    this.#clearCloseTimer();
    this.#closeTimer = window.setTimeout(() => {
      this.#closeTimer = 0;
      if (!this.#pinned) this.close(false);
    }, 110);
  }
}

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
  const select = event.target instanceof HTMLSelectElement ? event.target : null;
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
