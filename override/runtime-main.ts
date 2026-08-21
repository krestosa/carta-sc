import { initializeCartMotion } from './components/cart/cart.js';
import { initializeCatalogTools } from './components/catalog-tools/catalog-tools.js';
import { initializeCategoryNavigation } from './components/category-nav/category-nav.js';
import { initializeMobileHeader } from './components/mobile-header/mobile-header.js';
import { initializeProductCards } from './components/product-card/product-card.js';
import { initializeProductCardMotion } from './components/product-card/motion.js';
import { initializeProductModal } from './components/product-modal/product-modal.js';
import { initializeSectionHeadings } from './components/section-heading/section-heading.js';
import { freezeInitialViewport, initializeRenderLifecycle, markInitialViewport, waitForStableLayout } from './core/render-lifecycle.js';
import { revealGate } from './core/state.js';
import { initializeStoragePolicy } from './core/storage-policy.js';
import type { CatalogViewMode, Cleanup } from './core/types.js';
import { initializeContentNormalizer } from './features/content-normalizer/content-normalizer.js';
import { initializeImagePreloader } from './features/image-preloader/image-preloader.js';
import { initializeDomNormalization } from './mutations/dom-normalization.js';
import { initializeHistoryNormalization } from './mutations/history.js';
import { initializeLegacyCategoryHover } from './mutations/legacy-category-hover.js';
import { initializeGlobalUiMotion } from './motion/global-ui.js';
import { motion } from './motion/main.js';
import { templatesReady } from './templates/registry.js';

const VIEW_STORAGE_KEY = 'scCatalogView:v3';
const DEFAULT_VIEW: CatalogViewMode = 'compact';

function rememberedCatalogView(): CatalogViewMode {
  try {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === 'list') return 'list';
    if (stored === 'compact' || stored === 'normal') return 'compact';
  } catch {
    // El almacenamiento puede estar bloqueado; el catálogo conserva su vista predeterminada.
  }
  return DEFAULT_VIEW;
}

function applyRememberedCatalogView(): void {
  const view = rememberedCatalogView();
  document.documentElement.setAttribute('data-sc-catalog-view', view);
  document.body?.setAttribute('data-sc-catalog-view', view);
}

function whenDomReady(): Promise<void> {
  if (document.readyState !== 'loading') return Promise.resolve();
  return new Promise((resolve) => document.addEventListener('DOMContentLoaded', () => resolve(), { once: true }));
}

class ApplicationRuntime {
  readonly #cleanups: Cleanup[] = [];
  #started = false;

  async start(): Promise<void> {
    if (this.#started) return;
    this.#started = true;

    applyRememberedCatalogView();
    initializeRenderLifecycle();
    this.#use(initializeStoragePolicy());
    this.#use(initializeImagePreloader());
    this.#use(initializeDomNormalization());
    this.#use(initializeHistoryNormalization());
    this.#use(initializeLegacyCategoryHover());

    await templatesReady;
    await whenDomReady();

    this.#use(initializeMobileHeader());
    this.#use(initializeSectionHeadings());
    this.#use(initializeContentNormalizer());
    this.#use(initializeCategoryNavigation());
    this.#use(initializeProductCards());
    this.#use(initializeProductModal());
    this.#use(initializeCatalogTools());
    this.#use(initializeProductCardMotion());
    this.#use(initializeCartMotion());

    await motion.prepare();
    markInitialViewport();
    freezeInitialViewport();
    motion.unlock();
    this.#use(initializeGlobalUiMotion());
    revealGate.release();

    await waitForStableLayout();
    motion.refresh(0);
  }

  destroy(): void {
    for (const cleanup of this.#cleanups.splice(0).reverse()) {
      try {
        cleanup();
      } catch (error) {
        console.error('[SushiClub override] Runtime cleanup failed', error);
      }
    }
    this.#started = false;
  }

  #use(cleanup: Cleanup | void): void {
    if (cleanup) this.#cleanups.push(cleanup);
  }
}

const application = new ApplicationRuntime();

application.start().catch((error: unknown) => {
  revealGate.release();
  console.error('[SushiClub override] Error iniciando módulos', error);
});
