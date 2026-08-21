import type { Cleanup } from '../../core/types.js';
import { queries } from '../../core/variables.js';
import { motion } from '../../motion/main.js';
import { scheduleDescriptionMeasure } from '../product-card/content.js';
import {
  ensureCatalogViewIconPresentation,
  stopCatalogViewIconMotion,
  syncCatalogViewControl,
} from './view-icon.js';
import {
  loadCatalogView,
  normalizeCatalogViewMode,
  saveCatalogView,
  selectedCatalogView,
} from './view-state.js';

const rootElement = document.documentElement;

class CatalogViewController {
  #layoutFrame = 0;
  #settleTimer = 0;
  #installationCleanup: Cleanup | null = null;

  sync(): void {
    const root = document.querySelector<HTMLElement>('.sc-catalog-tools');
    if (root) syncCatalogViewControl(root, selectedCatalogView());
  }

  refreshLayout(switching = false): void {
    this.sync();
    this.#cancelLayoutWork();

    this.#layoutFrame = requestAnimationFrame(() => {
      this.#layoutFrame = requestAnimationFrame(() => {
        this.#layoutFrame = 0;
        scheduleDescriptionMeasure();
        motion.refresh(0);
        if (switching) {
          this.#settleTimer = window.setTimeout(() => {
            this.#settleTimer = 0;
            rootElement.classList.remove('sc-catalog-view-switching');
          }, 80);
        }
      });
    });
  }

  apply(root: HTMLElement, requested: string, persist = false): void {
    const mode = normalizeCatalogViewMode(requested) ?? 'compact';
    if (persist) rootElement.classList.add('sc-catalog-view-switching');
    rootElement.setAttribute('data-sc-catalog-view', mode);
    document.body.setAttribute('data-sc-catalog-view', mode);
    root.setAttribute('data-sc-view', mode);
    syncCatalogViewControl(root, mode, persist);
    if (persist) saveCatalogView(mode);
    this.refreshLayout(persist);
  }

  install(root: HTMLElement): Cleanup {
    this.destroy();
    const button = root.querySelector<HTMLButtonElement>('.sc-catalog-view-toggle');
    const host = button?.querySelector<SVGElement>('[data-sc-view-icon]');
    if (!button || !host) return () => undefined;

    ensureCatalogViewIconPresentation(host);
    this.apply(root, loadCatalogView());
    const onClick = (): void => this.apply(
      root,
      selectedCatalogView() === 'compact' ? 'list' : 'compact',
      true,
    );
    const onBreakpoint = (): void => this.refreshLayout();

    button.addEventListener('click', onClick);
    queries.phone.addEventListener('change', onBreakpoint);
    queries.compactWide.addEventListener('change', onBreakpoint);

    const cleanup = (): void => {
      button.removeEventListener('click', onClick);
      queries.phone.removeEventListener('change', onBreakpoint);
      queries.compactWide.removeEventListener('change', onBreakpoint);
    };
    this.#installationCleanup = cleanup;

    return () => {
      if (this.#installationCleanup === cleanup) this.destroy();
    };
  }

  destroy(): void {
    const host = document.querySelector<SVGElement>('.sc-catalog-view-toggle [data-sc-view-icon]');
    if (host) stopCatalogViewIconMotion(host);
    this.#cancelLayoutWork();
    rootElement.classList.remove('sc-catalog-view-switching');

    const cleanup = this.#installationCleanup;
    this.#installationCleanup = null;
    cleanup?.();
  }

  #cancelLayoutWork(): void {
    if (this.#layoutFrame) cancelAnimationFrame(this.#layoutFrame);
    if (this.#settleTimer) clearTimeout(this.#settleTimer);
    this.#layoutFrame = 0;
    this.#settleTimer = 0;
  }
}

const catalogView = new CatalogViewController();

export { selectedCatalogView };

export function syncCatalogView(): void {
  catalogView.sync();
}

export function refreshCatalogViewLayout(switching = false): void {
  catalogView.refreshLayout(switching);
}

export function applyCatalogView(root: HTMLElement, requested: string, persist = false): void {
  catalogView.apply(root, requested, persist);
}

export function destroyCatalogView(): void {
  catalogView.destroy();
}

export function installCatalogView(root: HTMLElement): Cleanup {
  return catalogView.install(root);
}
