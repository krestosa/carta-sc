import { selectors } from '../../core/variables.js';
import { refreshCategoryNavMetrics } from '../category-nav/category-nav.js';
import { positionTraitReferences } from '../product-card/content.js';
import { cloneTemplate } from '../../templates/registry.js';
import { CatalogSearchController } from './search.js';
import { installThemeControl, seedTheme } from './theme-controller.js';
import { installCatalogView, refreshCatalogViewLayout } from './view.js';

const search = new CatalogSearchController({
  onRestore: () => {
    refreshCategoryNavMetrics();
    refreshCatalogViewLayout();
  },
});

let observer: MutationObserver | null = null;
let repairFrame = 0;
let currentRoot: HTMLElement | null = null;
let cleanSearch: (() => void) | null = null;
let cleanTheme: (() => void) | null = null;
let cleanView: (() => void) | null = null;
let initialized = false;

function cleanupRoot(remove: boolean): void {
  cleanSearch?.();
  cleanTheme?.();
  cleanView?.();
  cleanSearch = cleanTheme = cleanView = null;
  if (remove) currentRoot?.remove();
  currentRoot = null;
}

function install(root: HTMLElement): HTMLElement {
  currentRoot = root;
  positionTraitReferences();
  cleanSearch = search.install(root);
  cleanTheme = installThemeControl(root);
  cleanView = installCatalogView(root);
  document.body.classList.add('sc-catalog-tools-ready');
  return root;
}

export function mountCatalogTools(): HTMLElement | null {
  const container = document.querySelector<HTMLElement>(selectors.container);
  if (!container) return null;

  const existing = container.querySelector<HTMLElement>('.sc-catalog-tools');
  if (existing) {
    if (existing !== currentRoot) {
      cleanupRoot(false);
      seedTheme(existing);
      install(existing);
    }
    return existing;
  }

  if (currentRoot) cleanupRoot(false);
  const root = cloneTemplate<HTMLElement>('catalog-tools');
  seedTheme(root);
  const toolbar = container.querySelector<HTMLElement>(selectors.categoryToolbar);
  if (toolbar?.nextSibling) container.insertBefore(root, toolbar.nextSibling);
  else if (toolbar) container.append(root);
  else container.insertBefore(root, container.firstChild);
  return install(root);
}

function repair(): void {
  repairFrame = 0;
  if (!initialized) return;
  if (currentRoot && !document.documentElement.contains(currentRoot)) cleanupRoot(false);
  mountCatalogTools();
}

export function repairCatalogTools(): void {
  if (initialized && !repairFrame) repairFrame = requestAnimationFrame(repair);
}

function structural(node: Node): boolean {
  if (!(node instanceof Element)) return false;
  const selector = `${selectors.container}, ${selectors.categoryToolbar}, .sc-catalog-tools`;
  return node.matches(selector) || Boolean(node.querySelector(selector));
}

function watchStructure(): void {
  if (observer || !document.body) return;
  observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => [...mutation.addedNodes, ...mutation.removedNodes].some(structural))) repairCatalogTools();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

export function initializeCatalogTools(): () => void {
  if (initialized) return destroyCatalogTools;
  initialized = true;
  mountCatalogTools();
  watchStructure();
  return destroyCatalogTools;
}

export function destroyCatalogTools(): void {
  if (!initialized) return;
  initialized = false;
  observer?.disconnect();
  observer = null;
  if (repairFrame) cancelAnimationFrame(repairFrame);
  repairFrame = 0;
  cleanupRoot(true);
  document.body?.classList.remove('sc-catalog-tools-ready');
}

