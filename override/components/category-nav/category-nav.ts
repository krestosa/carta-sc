import type { Cleanup } from '../../core/types.js';
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

class CategoryNavigationController {
  readonly #rail: CategoryRailController;
  readonly #activeState: CategoryActiveState;
  readonly #scrollSpy: CategoryScrollSpy;
  readonly #programmaticScroll: ProgrammaticCategoryScroll;
  readonly #submenu = new CategorySubmenu();
  readonly #boundScrollers = new Set<HTMLElement>();

  #resizeFrame = 0;
  #structureFrame = 0;
  #motionRefreshFrame = 0;
  #geometryTimer = 0;
  #structureObserver: MutationObserver | null = null;
  #initialized = false;

  constructor() {
    this.#rail = new CategoryRailController({
      invalidateOffset: invalidateCategoryOffset,
      refreshMetrics: () => this.#scrollSpy.refresh(),
    });
    this.#activeState = new CategoryActiveState({
      requestCenter: this.#rail.requestCenter,
      scheduleRail: this.#rail.scheduleRail,
    });
    this.#scrollSpy = new CategoryScrollSpy(this.#activeState);
    this.#programmaticScroll = new ProgrammaticCategoryScroll({
      refreshMetrics: this.#scrollSpy.refresh,
      releaseSpyHold: this.#scrollSpy.release,
      scheduleSpy: this.#scrollSpy.schedule,
    });
  }

  initialize(): Cleanup {
    if (this.#initialized) return this.destroy;
    this.#initialized = true;
    this.#addListeners();
    this.#syncStructure();
    resumeCategoryIndicator();
    this.#watchStructure();
    this.#geometryTimer = window.setTimeout(() => {
      this.#geometryTimer = 0;
      if (!this.#initialized) return;
      applyCategorySemantics();
      this.#submenu.scan();
      this.#refreshGeometry();
    }, motionTokens.geometryRefreshDelay);
    void document.fonts?.ready.then(this.#refreshGeometry).catch(() => undefined);
    return this.destroy;
  }

  destroy = (): void => {
    if (!this.#initialized) return;
    this.#initialized = false;
    this.#removeListeners();
    this.#unbindRailScrollers();
    this.#submenu.destroy();
    this.#structureObserver?.disconnect();
    this.#structureObserver = null;
    this.#cancelScheduledWork();
    this.#rail.cancel();
    this.#scrollSpy.stop();
    this.#programmaticScroll.interrupt();
    pauseCategoryIndicator();
  };

  refreshMetrics(): void {
    this.#scrollSpy.refresh();
  }

  repair(): void {
    this.#scheduleStructure();
  }

  current(): HTMLElement | null {
    return this.#scrollSpy.current();
  }

  setActive(target: HTMLElement | null, animate = true): void {
    this.#activeState.set(target, animate);
  }

  #activateAndScroll(target: HTMLElement, activeTarget: HTMLElement = target): void {
    invalidateCategoryOffset();
    const plan = categoryScrollPlan(target);
    this.#scrollSpy.hold(activeTarget);
    this.#activeState.set(activeTarget, true);
    this.#programmaticScroll.scrollTo(target, plan);
  }

  #onCategory = (event: MouseEvent): void => {
    if (event.defaultPrevented
      || event.button > 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey) return;

    const origin = event.target instanceof Element ? event.target : null;
    const link = origin?.closest<HTMLAnchorElement>('a.anchorLink, a.anchorLinkSub, a.sc-category-submenu-link');
    if (!link) return;

    const submenuLink = link.classList.contains('sc-category-submenu-link');
    if (link.closest('.topPullDown,.dropdown-menu') && !submenuLink) return;
    const inManagedNav = link.closest(selectors.categoryToolbar)
      || link.closest(`${CATEGORY_SELECTORS.mobileWrapper} ${CATEGORY_SELECTORS.mobileRail}`)
      || link.closest('.sc-category-submenu');
    if (!inManagedNav) return;

    const target = anchorForHref(link.getAttribute('href'));
    if (!target) return;
    const owner = submenuLink ? subcategoryOwner(link) : null;
    const hasChildren = !submenuLink && this.#submenu.has(link);
    const compact = !desktopCategories.matches;

    event.preventDefault();
    event.stopImmediatePropagation();
    closeLegacyCategoryMenus();
    cleanCategoryHash();

    if (submenuLink) {
      this.#submenu.close(false);
      this.#activateAndScroll(target, owner ?? target);
      return;
    }
    if (hasChildren && compact) {
      this.#submenu.open(link, true);
      return;
    }
    if (hasChildren) this.#submenu.open(link, true);
    this.#activateAndScroll(target);
  };

  #onSelect = (event: Event): void => {
    const select = event.target instanceof HTMLSelectElement ? event.target : null;
    if (!select?.matches(CATEGORY_SELECTORS.select)) return;
    const target = anchorForHref(select.value);
    if (!target) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    closeLegacyCategoryMenus();
    cleanCategoryHash();
    this.#submenu.close(false);
    this.#activateAndScroll(target);
  };

  #pruneRailScrollers(): void {
    for (const scroller of this.#boundScrollers) {
      if (document.documentElement.contains(scroller)) continue;
      scroller.removeEventListener('scroll', this.#rail.scheduleOverflow);
      this.#boundScrollers.delete(scroller);
    }
  }

  #bindRailScrollers(): void {
    this.#pruneRailScrollers();
    for (const scroller of document.querySelectorAll<HTMLElement>(`${CATEGORY_SELECTORS.scroller},${CATEGORY_SELECTORS.mobileScroller}`)) {
      if (this.#boundScrollers.has(scroller)) continue;
      this.#boundScrollers.add(scroller);
      scroller.addEventListener('scroll', this.#rail.scheduleOverflow, { passive: true });
    }
  }

  #unbindRailScrollers(): void {
    for (const scroller of this.#boundScrollers) {
      scroller.removeEventListener('scroll', this.#rail.scheduleOverflow);
    }
    this.#boundScrollers.clear();
  }

  #refreshGeometry = (): void => {
    if (!this.#initialized) return;
    invalidateCategoryOffset();
    this.#scrollSpy.refresh();
    this.#rail.scheduleRail();
    this.#submenu.schedulePosition();
  };

  #resize = (): void => {
    if (!this.#initialized || this.#resizeFrame) return;
    this.#resizeFrame = requestAnimationFrame(() => {
      this.#resizeFrame = 0;
      this.#refreshGeometry();
    });
  };

  #windowScroll = (): void => {
    this.#rail.scheduleSticky();
    this.#scrollSpy.schedule();
    this.#submenu.schedulePosition();
  };

  #interrupt = (): void => {
    this.#programmaticScroll.interrupt();
    this.#scrollSpy.release();
  };

  #observeStructure(): void {
    if (this.#structureObserver && document.body) {
      this.#structureObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  #refreshMotionSafely(): void {
    if (!this.#initialized || this.#motionRefreshFrame) return;
    this.#motionRefreshFrame = requestAnimationFrame(() => {
      this.#motionRefreshFrame = 0;
      if (!this.#initialized) return;
      this.#structureObserver?.disconnect();
      motion.refresh(0);
      this.#structureObserver?.takeRecords();
      this.#observeStructure();
    });
  }

  #syncStructure = (): void => {
    if (this.#structureFrame) cancelAnimationFrame(this.#structureFrame);
    this.#structureFrame = 0;
    if (!this.#initialized) return;

    invalidateCategoryOffset();
    syncCategoryLayout({
      refreshMetrics: this.#scrollSpy.refresh,
      scheduleRail: this.#rail.scheduleRail,
    });
    applyCategorySemantics();
    this.#submenu.scan();
    this.#bindRailScrollers();
    this.#submenu.schedulePosition();
    this.#structureObserver?.takeRecords();
    this.#refreshMotionSafely();
  };

  #scheduleStructure = (): void => {
    if (this.#initialized && !this.#structureFrame) {
      this.#structureFrame = requestAnimationFrame(this.#syncStructure);
    }
  };

  #structural = (node: Node): boolean => {
    if (!(node instanceof Element)) return false;
    const selector = `${selectors.container}, ${selectors.categoryToolbar}, ${CATEGORY_SELECTORS.mobileWrapper}, .wrapp-nav-tabsTopShop`;
    return node.matches(selector) || Boolean(node.querySelector(selectors.container));
  };

  #watchStructure(): void {
    if (this.#structureObserver || !document.body) return;
    this.#structureObserver = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => [...mutation.addedNodes, ...mutation.removedNodes].some(this.#structural))) {
        this.#scheduleStructure();
      }
    });
    this.#observeStructure();
  }

  #breakpoint = (): void => {
    this.#submenu.close(false);
    this.#syncStructure();
  };

  #addListeners(): void {
    document.addEventListener('click', this.#onCategory, true);
    document.addEventListener('change', this.#onSelect, true);
    document.addEventListener('pointerover', this.#submenu.onPointerOver, true);
    document.addEventListener('pointerout', this.#submenu.onPointerOut, true);
    document.addEventListener('pointerdown', this.#submenu.onOutsidePointer, true);
    document.addEventListener('focusin', this.#submenu.onFocusIn, true);
    document.addEventListener('focusout', this.#submenu.onFocusOut, true);
    document.addEventListener('keydown', this.#submenu.onKeyDown, true);
    window.addEventListener('scroll', this.#windowScroll, { passive: true });
    window.addEventListener('resize', this.#resize, { passive: true });
    window.addEventListener('wheel', this.#interrupt, { passive: true });
    window.addEventListener('touchstart', this.#interrupt, { passive: true });
    desktopCategories.addEventListener('change', this.#breakpoint);
  }

  #removeListeners(): void {
    document.removeEventListener('click', this.#onCategory, true);
    document.removeEventListener('change', this.#onSelect, true);
    document.removeEventListener('pointerover', this.#submenu.onPointerOver, true);
    document.removeEventListener('pointerout', this.#submenu.onPointerOut, true);
    document.removeEventListener('pointerdown', this.#submenu.onOutsidePointer, true);
    document.removeEventListener('focusin', this.#submenu.onFocusIn, true);
    document.removeEventListener('focusout', this.#submenu.onFocusOut, true);
    document.removeEventListener('keydown', this.#submenu.onKeyDown, true);
    window.removeEventListener('scroll', this.#windowScroll);
    window.removeEventListener('resize', this.#resize);
    window.removeEventListener('wheel', this.#interrupt);
    window.removeEventListener('touchstart', this.#interrupt);
    desktopCategories.removeEventListener('change', this.#breakpoint);
  }

  #cancelScheduledWork(): void {
    if (this.#resizeFrame) cancelAnimationFrame(this.#resizeFrame);
    if (this.#structureFrame) cancelAnimationFrame(this.#structureFrame);
    if (this.#motionRefreshFrame) cancelAnimationFrame(this.#motionRefreshFrame);
    if (this.#geometryTimer) clearTimeout(this.#geometryTimer);
    this.#resizeFrame = 0;
    this.#structureFrame = 0;
    this.#motionRefreshFrame = 0;
    this.#geometryTimer = 0;
  }
}

const categoryNavigation = new CategoryNavigationController();

export function initializeCategoryNavigation(): Cleanup {
  return categoryNavigation.initialize();
}

export function destroyCategoryNavigation(): void {
  categoryNavigation.destroy();
}

export function refreshCategoryNavMetrics(): void {
  categoryNavigation.refreshMetrics();
}

export function repairCategoryNavigation(): void {
  categoryNavigation.repair();
}

export function currentCategory(): HTMLElement | null {
  return categoryNavigation.current();
}

export function setActiveCategory(target: HTMLElement | null, animate = true): void {
  categoryNavigation.setActive(target, animate);
}

export {
  anchorForHref,
  categoryLinks,
  isCategoryIndicatorDirty,
  markCategoryIndicatorDirty,
  moveCategoryIndicator,
};
