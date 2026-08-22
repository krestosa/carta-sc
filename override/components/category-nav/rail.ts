import { classes, selectors } from '../../core/variables.js';
import { CATEGORY_SELECTORS, desktopCategories } from './core.js';
import { hideRailOverflow, syncRailOverflow } from './rail-controls.js';
import { centerActiveCategory, revealActiveCategory } from './rail-position.js';
import { setStickyState } from './sticky-state.js';

interface RailNodes {
  readonly desktop: HTMLElement | null;
  readonly wrapper: HTMLElement | null;
  readonly rail: HTMLElement | null;
  readonly desktopScroller: HTMLElement | null;
  readonly mobileScroller: HTMLElement | null;
}

export interface CategoryRailCallbacks {
  readonly invalidateOffset: () => void;
  readonly refreshMetrics: () => void;
}

const STICKY_TOLERANCE = 0.5;

export class CategoryRailController {
  readonly #callbacks: CategoryRailCallbacks;
  #railFrame = 0;
  #measureFrame = 0;
  #measureFrame2 = 0;
  #overflowDirty = true;
  #stickyDirty = true;
  #mobileInitialized = false;
  #desktopTop: number | null = null;
  #mobileTop: number | null = null;
  #nodeCache: RailNodes | null = null;

  constructor(callbacks: CategoryRailCallbacks) {
    this.#callbacks = callbacks;
  }

  scheduleRail = (): void => {
    this.#nodeCache = null;
    this.#overflowDirty = true;
    this.#stickyDirty = true;
    this.#scheduleMeasure();
  };

  scheduleOverflow = (): void => {
    this.#overflowDirty = true;
    this.#scheduleFrame();
  };

  scheduleSticky = (): void => this.#scheduleFrame();

  requestCenter = (previous: Element | null, target: Element | null): void => {
    if (document.body.classList.contains(classes.catalogSearching)) {
      this.scheduleOverflow();
      return;
    }
    const nodes = this.#nodes();
    if (desktopCategories.matches) {
      if (nodes.desktopScroller) revealActiveCategory(nodes.desktopScroller, previous, target);
    } else if (nodes.mobileScroller) {
      centerActiveCategory(nodes.mobileScroller);
    }
    this.scheduleOverflow();
  };

  cancel(): void {
    if (this.#railFrame) cancelAnimationFrame(this.#railFrame);
    if (this.#measureFrame) cancelAnimationFrame(this.#measureFrame);
    if (this.#measureFrame2) cancelAnimationFrame(this.#measureFrame2);
    this.#railFrame = 0;
    this.#measureFrame = 0;
    this.#measureFrame2 = 0;
    this.#nodeCache = null;
    this.#desktopTop = null;
    this.#mobileTop = null;
  }

  #connected(node: Node | null): boolean {
    return !node || document.documentElement.contains(node);
  }

  #nodes(): RailNodes {
    if (this.#nodeCache && Object.values(this.#nodeCache).every((node) => this.#connected(node))) return this.#nodeCache;
    const desktop = document.querySelector<HTMLElement>(selectors.categoryToolbar);
    const wrapper = document.querySelector<HTMLElement>(CATEGORY_SELECTORS.mobileWrapper);
    const rail = wrapper?.querySelector<HTMLElement>(CATEGORY_SELECTORS.mobileRail) ?? null;
    this.#nodeCache = {
      desktop,
      wrapper,
      rail,
      desktopScroller: desktop?.querySelector<HTMLElement>(CATEGORY_SELECTORS.scroller) ?? null,
      mobileScroller: rail?.querySelector<HTMLElement>(CATEGORY_SELECTORS.mobileScroller) ?? null,
    };
    return this.#nodeCache;
  }

  #pageTop(node: HTMLElement): number {
    let top = 0;
    for (let current: HTMLElement | null = node; current; current = current.offsetParent as HTMLElement | null) top += current.offsetTop;
    return top;
  }

  #stableTop(node: HTMLElement | null, cached: number | null): number | null {
    if (!node) return null;
    if (cached !== null && node.classList.contains('sc-is-stuck')) return cached;
    return this.#pageTop(node);
  }

  #onStickyChange = (): void => {
    this.#callbacks.invalidateOffset();
    this.#callbacks.refreshMetrics();
  };

  #measureSticky = (): void => {
    this.#measureFrame = 0;
    this.#measureFrame2 = 0;
    if (!this.#stickyDirty) return;
    const { desktop, wrapper } = this.#nodes();
    this.#desktopTop = this.#stableTop(desktop, this.#desktopTop);
    this.#mobileTop = this.#stableTop(wrapper, this.#mobileTop);
    this.#stickyDirty = false;
    this.#scheduleFrame();
  };

  #scheduleMeasure(): void {
    if (this.#measureFrame || this.#measureFrame2) return;
    this.#measureFrame = requestAnimationFrame(() => {
      this.#measureFrame = 0;
      this.#measureFrame2 = requestAnimationFrame(this.#measureSticky);
    });
  }

  #render = (): void => {
    this.#railFrame = 0;
    const { desktop, wrapper, rail, desktopScroller, mobileScroller } = this.#nodes();
    const y = window.pageYOffset || document.documentElement.scrollTop || 0;

    if (desktop) {
      if (this.#overflowDirty) syncRailOverflow(desktop, desktopScroller, this.scheduleOverflow);
      if (!this.#stickyDirty && this.#desktopTop !== null) {
        setStickyState(desktop, desktopCategories.matches && y > 0 && y + STICKY_TOLERANCE >= this.#desktopTop, this.#onStickyChange);
      }
    }

    if (rail) {
      if (desktopCategories.matches) {
        if (this.#overflowDirty) hideRailOverflow(rail);
      } else {
        if (!this.#mobileInitialized && mobileScroller) {
          mobileScroller.scrollLeft = 0;
          this.#mobileInitialized = true;
        }
        if (this.#overflowDirty) syncRailOverflow(rail, mobileScroller, this.scheduleOverflow);
      }
    }

    if (wrapper && !this.#stickyDirty && this.#mobileTop !== null) {
      setStickyState(wrapper, !desktopCategories.matches && y > 0 && y + STICKY_TOLERANCE >= this.#mobileTop, this.#onStickyChange);
    }
    this.#overflowDirty = false;
  };

  #scheduleFrame(): void {
    if (!this.#railFrame) this.#railFrame = requestAnimationFrame(this.#render);
  }
}
