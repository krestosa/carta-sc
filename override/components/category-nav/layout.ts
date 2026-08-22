import { classes, selectors } from '../../core/variables.js';
import { cloneTemplate } from '../../templates/registry.js';
import { CATEGORY_SELECTORS, desktopCategories } from './core.js';

export interface CategoryLayoutCallbacks {
  readonly refreshMetrics: () => void;
  readonly scheduleRail: () => void;
}

class CategoryLayoutController {
  readonly #originalStyles = new Map<HTMLElement, string | null>();
  #navigation: HTMLElement | null = null;
  #originalParent: Node | null = null;
  #originalNextSibling: Node | null = null;
  #toolbar: HTMLElement | null = null;

  sync(callbacks: CategoryLayoutCallbacks): void {
    if (desktopCategories.matches) this.#syncDesktop();
    else this.#syncCompact();
    callbacks.refreshMetrics();
    callbacks.scheduleRail();
  }

  applySemantics(): void {
    const wrapper = document.querySelector<HTMLElement>(CATEGORY_SELECTORS.mobileWrapper);
    wrapper?.setAttribute('role', 'navigation');
    wrapper?.setAttribute('aria-label', 'Categorías de la carta');
  }

  restoreStyles(): void {
    for (const [link, value] of this.#originalStyles) {
      if (!document.documentElement.contains(link)) continue;
      if (value === null) link.removeAttribute('style');
      else link.setAttribute('style', value);
    }
  }

  #syncDesktop(): void {
    const container = document.querySelector<HTMLElement>(selectors.container);
    if (!container) return;

    this.#markFirstCatalogSection(container);
    if (!this.#captureNavigation() || !this.#navigation) return;
    if (!this.#toolbar || !document.documentElement.contains(this.#toolbar)) {
      this.#toolbar = this.#createToolbar(container);
    }

    const scroller = this.#toolbar.querySelector<HTMLElement>(CATEGORY_SELECTORS.scroller);
    if (!scroller) return;
    if (this.#navigation.parentNode !== scroller) scroller.append(this.#navigation);
    this.#normalizeLegacyStyles(this.#navigation);
    document.body.classList.add(classes.catalogLayoutReady);
  }

  #syncCompact(): void {
    document.body?.classList.remove(classes.catalogLayoutReady);
    document.querySelectorAll<HTMLElement>(`${selectors.productList}.sc-first-catalog-section`)
      .forEach((node) => node.classList.remove('sc-first-catalog-section'));

    this.#captureNavigation();
    if (this.#navigation && this.#originalParent && document.documentElement.contains(this.#originalParent)) {
      if (this.#originalNextSibling?.parentNode === this.#originalParent) {
        this.#originalParent.insertBefore(this.#navigation, this.#originalNextSibling);
      } else {
        this.#originalParent.appendChild(this.#navigation);
      }
    }
    this.restoreStyles();
    this.#toolbar?.remove();
    this.#toolbar = null;
  }

  #createToolbar(container: HTMLElement): HTMLElement {
    const node = cloneTemplate<HTMLElement>('category-toolbar');
    container.insertBefore(node, container.firstChild);
    return node;
  }

  #captureNavigation(): boolean {
    const candidate = document.querySelector<HTMLElement>(`${CATEGORY_SELECTORS.mobileWrapper} .wrapp-nav-tabsTopShop`);
    if (candidate && candidate !== this.#navigation) {
      this.restoreStyles();
      this.#originalStyles.clear();
      if (this.#navigation && document.documentElement.contains(this.#navigation)) this.#navigation.remove();
      this.#navigation = candidate;
      this.#originalParent = candidate.parentNode;
      this.#originalNextSibling = candidate.nextSibling;
      return true;
    }

    if (this.#navigation && document.documentElement.contains(this.#navigation)) return true;
    this.restoreStyles();
    this.#originalStyles.clear();
    this.#navigation = candidate;
    this.#originalParent = candidate?.parentNode ?? null;
    this.#originalNextSibling = candidate?.nextSibling ?? null;
    return Boolean(candidate);
  }

  #normalizeLegacyStyles(root: ParentNode): void {
    for (const link of root.querySelectorAll<HTMLElement>('.nav-top-li > a.anchorLink')) {
      if (!this.#originalStyles.has(link)) this.#originalStyles.set(link, link.getAttribute('style'));
      link.style.removeProperty('font-size');
    }
    for (const link of this.#originalStyles.keys()) {
      if (!document.documentElement.contains(link)) this.#originalStyles.delete(link);
    }
  }

  #markFirstCatalogSection(container: HTMLElement): void {
    container.querySelectorAll<HTMLElement>(`${selectors.productList}.sc-first-catalog-section`)
      .forEach((node) => node.classList.remove('sc-first-catalog-section'));
    const first = Array.from(container.querySelectorAll<HTMLElement>(selectors.productList))
      .find((node) => Boolean(node.querySelector(`${selectors.productCard},${selectors.sectionTitle}`)));
    first?.classList.add('sc-first-catalog-section');
  }
}

const categoryLayout = new CategoryLayoutController();

export function syncCategoryLayout(callbacks: CategoryLayoutCallbacks): void {
  categoryLayout.sync(callbacks);
}

export function applyCategorySemantics(): void {
  categoryLayout.applySemantics();
}

export function restoreCategoryLayoutStyles(): void {
  categoryLayout.restoreStyles();
}
