import { classes, selectors } from '../../core/variables.js';
import { cloneTemplate } from '../../templates/registry.js';
import { CATEGORY_SELECTORS, desktopCategories } from './core.js';

const originalStyles = new Map<HTMLElement, string | null>();
let navigation: HTMLElement | null = null;
let originalParent: Node | null = null;
let originalNextSibling: Node | null = null;
let toolbar: HTMLElement | null = null;

function createToolbar(container: HTMLElement): HTMLElement {
  const node = cloneTemplate<HTMLElement>('category-toolbar');
  container.insertBefore(node, container.firstChild);
  return node;
}

function restoreStyles(): void {
  for (const [link, value] of originalStyles) {
    if (!document.documentElement.contains(link)) continue;
    if (value === null) link.removeAttribute('style');
    else link.setAttribute('style', value);
  }
}

function captureNavigation(): boolean {
  const candidate = document.querySelector<HTMLElement>(`${CATEGORY_SELECTORS.mobileWrapper} .wrapp-nav-tabsTopShop`);
  if (candidate && candidate !== navigation) {
    restoreStyles();
    originalStyles.clear();
    if (navigation && document.documentElement.contains(navigation)) navigation.remove();
    navigation = candidate;
    originalParent = candidate.parentNode;
    originalNextSibling = candidate.nextSibling;
    return true;
  }
  if (navigation && document.documentElement.contains(navigation)) return true;
  restoreStyles();
  originalStyles.clear();
  navigation = candidate;
  originalParent = candidate?.parentNode ?? null;
  originalNextSibling = candidate?.nextSibling ?? null;
  return Boolean(candidate);
}

function normalizeLegacyStyles(root: ParentNode): void {
  for (const link of root.querySelectorAll<HTMLElement>('.nav-top-li > a.anchorLink')) {
    if (!originalStyles.has(link)) originalStyles.set(link, link.getAttribute('style'));
    link.style.removeProperty('font-size');
  }
  for (const link of originalStyles.keys()) {
    if (!document.documentElement.contains(link)) originalStyles.delete(link);
  }
}

function markFirstCatalogSection(container: HTMLElement): void {
  container.querySelectorAll<HTMLElement>(`${selectors.productList}.sc-first-catalog-section`)
    .forEach((node) => node.classList.remove('sc-first-catalog-section'));
  const first = Array.from(container.querySelectorAll<HTMLElement>(selectors.productList))
    .find((node) => Boolean(node.querySelector(`${selectors.productCard},${selectors.sectionTitle}`)));
  first?.classList.add('sc-first-catalog-section');
}

export interface CategoryLayoutCallbacks {
  readonly refreshMetrics: () => void;
  readonly scheduleRail: () => void;
}

export function syncCategoryLayout(callbacks: CategoryLayoutCallbacks): void {
  if (desktopCategories.matches) {
    const container = document.querySelector<HTMLElement>(selectors.container);
    if (!container) return;
    markFirstCatalogSection(container);
    if (!captureNavigation() || !navigation) return;
    if (!toolbar || !document.documentElement.contains(toolbar)) toolbar = createToolbar(container);
    const scroller = toolbar.querySelector<HTMLElement>(CATEGORY_SELECTORS.scroller);
    if (!scroller) return;
    if (navigation.parentNode !== scroller) scroller.append(navigation);
    normalizeLegacyStyles(navigation);
    document.body.classList.add(classes.catalogLayoutReady);
  } else {
    document.body?.classList.remove(classes.catalogLayoutReady);
    document.querySelectorAll<HTMLElement>(`${selectors.productList}.sc-first-catalog-section`)
      .forEach((node) => node.classList.remove('sc-first-catalog-section'));
    captureNavigation();
    if (navigation && originalParent && document.documentElement.contains(originalParent)) {
      if (originalNextSibling?.parentNode === originalParent) originalParent.insertBefore(navigation, originalNextSibling);
      else originalParent.appendChild(navigation);
    }
    restoreStyles();
    toolbar?.remove();
    toolbar = null;
  }
  callbacks.refreshMetrics();
  callbacks.scheduleRail();
}

export function applyCategorySemantics(): void {
  const wrapper = document.querySelector<HTMLElement>(CATEGORY_SELECTORS.mobileWrapper);
  wrapper?.setAttribute('role', 'navigation');
  wrapper?.setAttribute('aria-label', 'Categorías de la carta');
}

export function restoreCategoryLayoutStyles(): void {
  restoreStyles();
}
