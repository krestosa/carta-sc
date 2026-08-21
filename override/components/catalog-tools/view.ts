import { queries } from '../../core/variables.js';
import { motion } from '../../motion/main.js';
import { scheduleDescriptionMeasure } from '../product-card/content.js';
import {
  bindCatalogViewIconMicroInteraction,
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
let layoutFrame = 0;
let settleTimer = 0;
let installationCleanup: (() => void) | null = null;

export { selectedCatalogView };

export function syncCatalogView(): void {
  const root = document.querySelector<HTMLElement>('.sc-catalog-tools');
  if (root) syncCatalogViewControl(root, selectedCatalogView());
}

export function refreshCatalogViewLayout(switching = false): void {
  syncCatalogView();
  if (layoutFrame) cancelAnimationFrame(layoutFrame);
  if (settleTimer) clearTimeout(settleTimer);

  layoutFrame = requestAnimationFrame(() => {
    layoutFrame = requestAnimationFrame(() => {
      layoutFrame = 0;
      scheduleDescriptionMeasure();
      motion.refresh(0);
      if (switching) {
        settleTimer = window.setTimeout(() => {
          settleTimer = 0;
          rootElement.classList.remove('sc-catalog-view-switching');
        }, 80);
      }
    });
  });
}

export function applyCatalogView(root: HTMLElement, requested: string, persist = false): void {
  const mode = normalizeCatalogViewMode(requested) ?? 'compact';
  if (persist) rootElement.classList.add('sc-catalog-view-switching');
  rootElement.setAttribute('data-sc-catalog-view', mode);
  document.body.setAttribute('data-sc-catalog-view', mode);
  root.setAttribute('data-sc-view', mode);
  syncCatalogViewControl(root, mode, persist);
  if (persist) saveCatalogView(mode);
  refreshCatalogViewLayout(persist);
}

export function destroyCatalogView(): void {
  const host = document.querySelector<SVGElement>('.sc-catalog-view-toggle [data-sc-view-icon]');
  if (host) stopCatalogViewIconMotion(host);
  if (layoutFrame) cancelAnimationFrame(layoutFrame);
  if (settleTimer) clearTimeout(settleTimer);
  layoutFrame = 0;
  settleTimer = 0;
  rootElement.classList.remove('sc-catalog-view-switching');
  const cleanup = installationCleanup;
  installationCleanup = null;
  cleanup?.();
}

export function installCatalogView(root: HTMLElement): () => void {
  destroyCatalogView();
  const button = root.querySelector<HTMLButtonElement>('.sc-catalog-view-toggle');
  const host = button?.querySelector<SVGElement>('[data-sc-view-icon]');
  if (!button || !host) return () => undefined;

  ensureCatalogViewIconPresentation(host);
  applyCatalogView(root, loadCatalogView());
  const cleanMicroInteraction = bindCatalogViewIconMicroInteraction(button, host);
  const onClick = (): void => applyCatalogView(
    root,
    selectedCatalogView() === 'compact' ? 'list' : 'compact',
    true,
  );
  const onBreakpoint = (): void => refreshCatalogViewLayout();

  button.addEventListener('click', onClick);
  queries.phone.addEventListener('change', onBreakpoint);
  queries.compactWide.addEventListener('change', onBreakpoint);

  installationCleanup = () => {
    cleanMicroInteraction();
    button.removeEventListener('click', onClick);
    queries.phone.removeEventListener('change', onBreakpoint);
    queries.compactWide.removeEventListener('change', onBreakpoint);
  };
  const ownedCleanup = installationCleanup;
  return () => {
    if (installationCleanup === ownedCleanup) destroyCatalogView();
  };
}
