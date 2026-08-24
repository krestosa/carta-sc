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

function appendSvgPath(svg: SVGSVGElement, d: string): void {
  const path = document.createElementNS(SVG_NAMESPACE, 'path');
  path.setAttribute('d', d);
  svg.appendChild(path);
}

export const createTraitIcon = (label: string): SVGSVGElement | null => {
  const name = traitIconName(label);
  if (!name) return null;

  const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
  svg.setAttribute('class', `sc-trait-icon sc-trait-icon--${name}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  switch (name) {
    case 'poco-picante':
      appendSvgPath(svg, 'M12.2 3.3c.4 2.2-.6 3.4-1.8 4.7-1.3 1.4-2.5 3-2.5 5.5a4.6 4.6 0 0 0 9.2 0c0-1.8-.8-3.2-1.8-4.4-.9-1.1-1.9-2.3-3.1-5.8Z');
      appendSvgPath(svg, 'M12 11.1c-.9 1-1.7 2-1.7 3.3a2.2 2.2 0 0 0 4.4 0c0-.9-.4-1.7-1-2.5-.4-.5-.9-1.1-1.3-2');
      break;
    case 'picante':
      appendSvgPath(svg, 'M13.2 2.7c.5 2.7-.7 4.1-2.1 5.6-1.5 1.6-2.9 3.4-2.9 6.2a5.3 5.3 0 0 0 10.6 0c0-2.1-.9-3.7-2.1-5.1-1-1.3-2.2-2.7-3.5-6.7Z');
      appendSvgPath(svg, 'M12.6 10.7c-1.1 1.2-2 2.4-2 3.9a2.6 2.6 0 0 0 5.2 0c0-1.1-.5-2-1.1-2.9-.5-.6-1-1.3-1.5-2.3');
      break;
    case 'muy-picante':
      appendSvgPath(svg, 'M8.5 4.2c.3 1.8-.5 2.9-1.5 4-1.1 1.2-2.1 2.5-2.1 4.7a3.9 3.9 0 0 0 7.8 0c0-1.6-.7-2.8-1.6-3.9-.8-.9-1.6-2-2.6-4.8Z');
      appendSvgPath(svg, 'M16.5 2.7c.4 2.2-.6 3.4-1.7 4.7-1.3 1.4-2.4 3-2.4 5.5a4.5 4.5 0 0 0 9 0c0-1.8-.8-3.2-1.8-4.4-.9-1.1-1.8-2.3-3.1-5.8Z');
      break;
    case 'vegetariano':
      appendSvgPath(svg, 'M19.8 4.2C13 4.1 8.5 6 6.6 9.6c-1.5 2.9-.8 6.3 1.7 8.1 2.8 2 6.7 1.3 8.8-1.6 2.4-3.3 2.7-7.5 2.7-11.9Z');
      appendSvgPath(svg, 'M5.1 20.1c2.5-4.4 5.8-7.6 10.7-10.1');
      break;
  }

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
