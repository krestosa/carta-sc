import type { Cleanup } from '../../core/types.js';
import { selectors } from '../../core/variables.js';
import { cloneTemplate } from '../../templates/registry.js';
import { refreshCategoryNavMetrics } from '../category-nav/category-nav.js';
import { positionTraitReferences } from '../product-card/content.js';
import { CatalogSearchController } from './search.js';
import { installThemeControl, seedTheme } from './theme-controller.js';
import { installCatalogView, refreshCatalogViewLayout } from './view.js';

class CatalogToolsController {
  readonly #search = new CatalogSearchController({
    onRestore: () => {
      refreshCategoryNavMetrics();
      refreshCatalogViewLayout();
    },
  });

  #observer: MutationObserver | null = null;
  #repairFrame = 0;
  #root: HTMLElement | null = null;
  #rootCleanups: Cleanup[] = [];
  #initialized = false;

  initialize(): Cleanup {
    if (this.#initialized) return this.destroy;
    this.#initialized = true;
    this.mount();
    this.#watchStructure();
    return this.destroy;
  }

  destroy = (): void => {
    if (!this.#initialized) return;
    this.#initialized = false;
    this.#observer?.disconnect();
    this.#observer = null;
    if (this.#repairFrame) cancelAnimationFrame(this.#repairFrame);
    this.#repairFrame = 0;
    this.#cleanupRoot(true);
    document.body?.classList.remove('sc-catalog-tools-ready');
  };

  mount(): HTMLElement | null {
    const container = document.querySelector<HTMLElement>(selectors.container);
    if (!container) return null;

    const existing = container.querySelector<HTMLElement>('.sc-catalog-tools');
    if (existing) {
      if (existing !== this.#root) {
        this.#cleanupRoot(false);
        seedTheme(existing);
        this.#install(existing);
      }
      return existing;
    }

    if (this.#root) this.#cleanupRoot(false);
    const root = cloneTemplate<HTMLElement>('catalog-tools');
    seedTheme(root);
    const toolbar = container.querySelector<HTMLElement>(selectors.categoryToolbar);
    if (toolbar?.nextSibling) container.insertBefore(root, toolbar.nextSibling);
    else if (toolbar) container.append(root);
    else container.insertBefore(root, container.firstChild);
    return this.#install(root);
  }

  repair = (): void => {
    if (!this.#initialized || this.#repairFrame) return;
    this.#repairFrame = requestAnimationFrame(() => {
      this.#repairFrame = 0;
      if (!this.#initialized) return;
      if (this.#root && !document.documentElement.contains(this.#root)) this.#cleanupRoot(false);
      this.mount();
    });
  };

  #install(root: HTMLElement): HTMLElement {
    this.#root = root;
    positionTraitReferences();
    this.#rootCleanups = [
      this.#search.install(root),
      installThemeControl(root),
      installCatalogView(root),
    ];
    document.body.classList.add('sc-catalog-tools-ready');
    return root;
  }

  #cleanupRoot(remove: boolean): void {
    for (const cleanup of this.#rootCleanups.splice(0).reverse()) cleanup();
    if (remove) this.#root?.remove();
    this.#root = null;
  }

  #watchStructure(): void {
    if (this.#observer || !document.body) return;
    this.#observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => [...mutation.addedNodes, ...mutation.removedNodes].some(this.#structural))) {
        this.repair();
      }
    });
    this.#observer.observe(document.body, { childList: true, subtree: true });
  }

  #structural = (node: Node): boolean => {
    if (!(node instanceof Element)) return false;
    const selector = `${selectors.container}, ${selectors.categoryToolbar}, .sc-catalog-tools`;
    return node.matches(selector) || Boolean(node.querySelector(selector));
  };
}

const catalogTools = new CatalogToolsController();

export function mountCatalogTools(): HTMLElement | null {
  return catalogTools.mount();
}

export function repairCatalogTools(): void {
  catalogTools.repair();
}

export function initializeCatalogTools(): Cleanup {
  return catalogTools.initialize();
}

export function destroyCatalogTools(): void {
  catalogTools.destroy();
}
