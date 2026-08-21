import { selectors } from '../core/variables.js';
import { type Cleanup } from '../core/types.js';
import { each, matches } from '../core/utils.js';

const LEGACY_TARGETS = [
  'a[name^="anchor"]',
  '#busquedaJSBox',
  '#busquedaJSBoxResults',
  'a[href*="/pedidosonline"]',
  '.imgShop[style]',
  'select[name="sucursalNews"]',
  'input.newsMail',
  'button.close',
  'a.shopMenuRightIcon',
  'a[href*="facebook.com/sushiclubargentina"]',
  'a[href*="instagram.com/SushiClub_ar"]',
  'a[href*="tiktok.com/@sushiclub_ar"]',
  'a[href*="pinterest.com/sushiclub"]',
].join(',');

const SOCIAL_LINKS = Object.freeze([
  ['a[href*="facebook.com/sushiclubargentina"]', 'Facebook de SushiClub'],
  ['a[href*="instagram.com/SushiClub_ar"]', 'Instagram de SushiClub'],
  ['a[href*="tiktok.com/@sushiclub_ar"]', 'TikTok de SushiClub'],
  ['a[href*="pinterest.com/sushiclub"]', 'Pinterest de SushiClub'],
] as const);

function repairCategoryAnchor(anchor: Element): void {
  const name = anchor.getAttribute('name');
  if (name && anchor.id !== name) anchor.id = name;
}

function setAccessibleName(node: Element, label: string): void {
  if (!node.hasAttribute('aria-label') && !node.hasAttribute('aria-labelledby')) node.setAttribute('aria-label', label);
}

function enhanceBanner(link: Element): void {
  if (!link.querySelector('.bannerShop')) return;
  setAccessibleName(link, 'Pedilo Online — promoción de SushiClub');
  link.querySelectorAll<HTMLImageElement>('.bannerShop img').forEach((image) => image.setAttribute('alt', ''));
}

function cleanProductImageStage(stage: HTMLElement): void {
  for (const property of ['background-image', 'background-size', 'background-position', 'background-repeat']) {
    stage.style.removeProperty(property);
  }
  if (!stage.getAttribute('style')?.trim()) stage.removeAttribute('style');
}

function enhanceSocialLink(link: HTMLAnchorElement): void {
  const match = SOCIAL_LINKS.find(([selector]) => matches(link, selector));
  if (!match) return;
  setAccessibleName(link, match[1]);
  if (link.target === '_blank') link.rel = 'noopener noreferrer';
  link.querySelectorAll<HTMLImageElement>('img').forEach((image) => image.setAttribute('alt', ''));
}

function repairLegacyNode(node: Element): void {
  if (matches(node, 'a[name^="anchor"]')) repairCategoryAnchor(node);
  if (matches(node, '#busquedaJSBox,#busquedaJSBoxResults')) {
    node.remove();
    return;
  }
  if (matches(node, 'a[href*="/pedidosonline"]')) enhanceBanner(node);
  if (node instanceof HTMLElement && matches(node, '.imgShop[style]')) cleanProductImageStage(node);
  if (matches(node, 'select[name="sucursalNews"]')) setAccessibleName(node, 'Espacio preferido');
  if (matches(node, 'input.newsMail')) setAccessibleName(node, 'Email para newsletter');
  if (matches(node, 'button.close')) setAccessibleName(node, 'Cerrar');
  if (matches(node, 'a.shopMenuRightIcon')) setAccessibleName(node, 'Ver carrito');
  if (node instanceof HTMLAnchorElement && SOCIAL_LINKS.some(([selector]) => matches(node, selector))) enhanceSocialLink(node);
}

export function scanLegacyDom(root: Node): void {
  if (root instanceof Element && matches(root, LEGACY_TARGETS)) repairLegacyNode(root);
  if (root instanceof Document || root instanceof DocumentFragment || root instanceof Element) {
    each(root.querySelectorAll<Element>(LEGACY_TARGETS), repairLegacyNode);
  }
}

function normalizeDocumentSemantics(): void {
  const root = document.documentElement;
  if (!root.lang) root.lang = 'es-AR';
  if (document.querySelector('main,[role="main"]')) return;
  document.querySelector(selectors.container)?.setAttribute('role', 'main');
}

export function initializeDomNormalization(): Cleanup {
  let observer: MutationObserver | null = null;

  const start = (): void => {
    normalizeDocumentSemantics();
    scanLegacyDom(document);
    if (!document.body) return;
    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) scanLegacyDom(node);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();

  return () => {
    document.removeEventListener('DOMContentLoaded', start);
    observer?.disconnect();
    observer = null;
  };
}
