import { selectors } from '../../core/variables.js';
import { text } from '../../core/utils.js';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const IGNORED_TRAITS = new Set(['sin tacc', 'sin gluten', 'gluten free']);

export const TRAITS_LABEL_PREFIX = 'Características: ';

export const cleanPriceText = (node: Element | null): string => text(node).replace(/\s+/g, ' ').trim();

export const ignoredTrait = (label: string): boolean =>
  IGNORED_TRAITS.has(label.trim().toLocaleLowerCase('es-AR'));

export const traitLabels = (card: Element): string[] => {
  const labels = new Set<string>();
  card.querySelectorAll(`${selectors.productTraits} img`).forEach((image) => {
    const label = (
      image.getAttribute('data-original-title')
      ?? image.getAttribute('title')
      ?? image.getAttribute('alt')
      ?? ''
    ).trim();
    if (label && !ignoredTrait(label)) labels.add(label);
  });
  return [...labels];
};

export const imageSource = (card: Element): string => {
  const image = card.querySelector<HTMLImageElement>('.imgShop img, img.productoImageShop');
  if (!image) return '';
  return image.getAttribute('data-sc-src')
    || image.currentSrc
    || image.getAttribute('src')
    || image.getAttribute('data-src')
    || '';
};

export const ensureId = (node: Element | null, id: string): string => {
  if (!node) return '';
  node.id ||= id;
  return node.id;
};

const traitIconName = (label: string): string => {
  switch (label.toLocaleLowerCase('es-AR')) {
    case 'algo picante': return 'poco-picante';
    case 'poco picante': return 'picante';
    case 'muy picante': return 'muy-picante';
    case 'vegetariano': return 'vegetariano';
    default: return '';
  }
};

export const createTraitIcon = (label: string): SVGSVGElement | null => {
  const name = traitIconName(label);
  if (!name) return null;

  const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
  svg.setAttribute('class', `sc-trait-icon sc-trait-icon--${name}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('viewBox', '0 0 24 24');

  const use = document.createElementNS(SVG_NAMESPACE, 'use');
  use.setAttribute('href', `#sc-trait-${name}`);
  svg.appendChild(use);
  return svg;
};

export const appendTraitVisual = (
  target: HTMLElement,
  source: ParentNode,
  label: string,
): Element | null => {
  const icon = createTraitIcon(label);
  if (icon) {
    target.appendChild(icon);
    return icon;
  }

  const legacyImage = [...source.querySelectorAll<HTMLImageElement>('img')].find((image) => {
    const imageLabel = (
      image.getAttribute('data-original-title')
      ?? image.getAttribute('title')
      ?? image.getAttribute('alt')
      ?? ''
    ).trim();
    return text(image) === label || imageLabel === label;
  });
  if (!legacyImage) return null;

  const clone = legacyImage.cloneNode(true) as HTMLImageElement;
  clone.removeAttribute('id');
  target.appendChild(clone);
  return clone;
};

export function buildTraitGroup(card: HTMLElement, className?: string): HTMLElement | null;
export function buildTraitGroup(className: string, labels: string[], source: ParentNode): HTMLSpanElement;
export function buildTraitGroup(
  cardOrClassName: HTMLElement | string,
  classNameOrLabels?: string | string[],
  sourceArg?: ParentNode,
): HTMLElement | null {
  if (typeof cardOrClassName === 'string') {
    const row = document.createElement('span');
    const labels = Array.isArray(classNameOrLabels) ? classNameOrLabels : [];
    row.className = cardOrClassName;
    labels.forEach((label) => appendTraitVisual(row, sourceArg ?? document, label));
    if (labels.length) {
      row.setAttribute('role', 'img');
      row.setAttribute('aria-label', `${TRAITS_LABEL_PREFIX}${labels.join(', ')}`);
    } else {
      row.setAttribute('aria-hidden', 'true');
    }
    return row;
  }

  const labels = traitLabels(cardOrClassName);
  if (!labels.length) return null;
  const source = cardOrClassName.querySelector<HTMLElement>(selectors.productTraits);
  if (!source) return null;

  const group = document.createElement('span');
  group.className = typeof classNameOrLabels === 'string' && classNameOrLabels
    ? classNameOrLabels
    : selectors.productTraits.slice(1);
  group.setAttribute('aria-label', `${TRAITS_LABEL_PREFIX}${labels.join(', ')}`);
  labels.forEach((label) => appendTraitVisual(group, source, label));
  return group;
}
