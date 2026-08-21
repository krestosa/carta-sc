import { selectors } from '../../core/variables.js';
import { applyEditorialCase, cleanTitlePeriods, CONTENT_LOCALE, type EditorialState } from './rules.js';

export interface EditorialOptions {
  skip?: string;
  removePeriods?: boolean;
}

export const CONTENT_HOST_SELECTOR = [
  selectors.sectionTitle,
  selectors.sectionSubtitle,
  `${selectors.productCard} ${selectors.productTitle}`,
  `${selectors.productCard} ${selectors.productDescription}`,
].join(',');

const SKIPPED_TEXT_ANCESTORS = 'script,style';
const TYPOGRAPHY_PROPERTIES = [
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'text-transform',
  'letter-spacing',
  'line-height',
] as const;

function editableTextNodes(root: Element, skipSelector?: string): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || parent.closest(SKIPPED_TEXT_ANCESTORS) || (skipSelector && parent.closest(skipSelector))) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node instanceof Text) nodes.push(node);
  }
  return nodes;
}

function normalizeUppercase(root: Element): void {
  for (const node of editableTextNodes(root)) {
    const current = node.nodeValue ?? '';
    const next = cleanTitlePeriods(current).toLocaleUpperCase(CONTENT_LOCALE);
    if (next !== current) node.nodeValue = next;
  }
}

function normalizeEditorial(root: Element, options: EditorialOptions = {}): void {
  const state: EditorialState = { sentenceStart: true, words: 0 };
  for (const node of editableTextNodes(root, options.skip)) {
    const current = node.nodeValue ?? '';
    const next = applyEditorialCase(current, state, options.removePeriods ?? false);
    if (next !== current) node.nodeValue = next;
  }
}

function unwrapTypography(description: Element): void {
  for (const node of description.querySelectorAll<HTMLElement>('b,strong')) {
    const parent = node.parentNode;
    if (!parent) continue;
    while (node.firstChild) parent.insertBefore(node.firstChild, node);
    node.remove();
  }

  for (const node of description.querySelectorAll<HTMLElement>('[style]')) {
    for (const property of TYPOGRAPHY_PROPERTIES) node.style.removeProperty(property);
    if (!node.getAttribute('style')?.trim()) node.removeAttribute('style');
  }
}

export function normalizeContentHost(host: Element | null | undefined): void {
  if (!host?.isConnected) return;

  if (host.matches(`${selectors.sectionTitle},${selectors.sectionSubtitle}`)) {
    normalizeUppercase(host);
    return;
  }

  if (host.matches(`${selectors.productCard} ${selectors.productTitle}`)) {
    normalizeEditorial(host, { skip: selectors.productTraits, removePeriods: true });
    return;
  }

  if (host.matches(`${selectors.productCard} ${selectors.productDescription}`)) {
    unwrapTypography(host);
    normalizeEditorial(host);
  }
}

export function normalizeCatalogueContent(): void {
  document.querySelectorAll<Element>(CONTENT_HOST_SELECTOR).forEach(normalizeContentHost);
}

export function collectContentHosts(node: Node | null | undefined, target: Set<Element>): void {
  const element = node instanceof Element ? node : node?.parentElement;
  if (!element) return;

  const containingHost = element.closest(CONTENT_HOST_SELECTOR);
  if (containingHost) target.add(containingHost);
  element.querySelectorAll<Element>(CONTENT_HOST_SELECTOR).forEach((host) => target.add(host));
}
