import { selectors } from '../../core/variables.js';
import { text } from '../../core/utils.js';
import { cloneTemplate } from '../../templates/registry.js';
import {
  TRAITS_LABEL_PREFIX,
  cleanPriceText,
  ensureId,
  traitLabels,
} from './data.js';

let cardSequence = 0;

const cardKey = (card: HTMLElement): string => {
  const existing = card.dataset.scA11yKey;
  if (existing) return existing;

  const hidden = card.querySelector<HTMLInputElement>('.producto-id');
  const source = hidden?.value ? String(hidden.value) : 'item';
  const base = source.replace(/[^a-zA-Z0-9_-]/g, '-') || 'item';
  const key = `${base}-${++cardSequence}`;
  card.dataset.scA11yKey = key;
  return key;
};

export const enhanceCardLink = (link: HTMLElement): void => {
  const card = link.closest<HTMLElement>(selectors.productCard);
  if (!card) return;

  const key = cardKey(card);
  const title = card.querySelector<HTMLElement>(selectors.productTitle);
  const description = card.querySelector<HTMLElement>(selectors.productDescription);
  const currentPrice = card.querySelector('.priceRow .priceHijass, .priceRow .price');
  const previousPrice = card.querySelector('.priceRow .ofertaPrice');

  const titleId = ensureId(title, `sc-product-${key}-title`);
  const descriptionId = description && text(description)
    ? ensureId(description, `sc-product-${key}-desc`)
    : '';
  const currentText = cleanPriceText(currentPrice);
  const previousText = cleanPriceText(previousPrice);
  const traits = traitLabels(card);

  if (currentPrice && currentText) {
    currentPrice.setAttribute(
      'aria-label',
      `${/^\$/.test(currentText) ? 'Precio actual: ' : 'Estado del producto: '}${currentText}`,
    );
  }
  if (previousPrice && previousText) previousPrice.setAttribute('aria-label', `Precio anterior: ${previousText}`);

  let meta = link.querySelector<HTMLElement>('.sc-card-a11y-meta');
  if (!meta) {
    meta = cloneTemplate<HTMLElement>('product-card-a11y-meta');
    link.appendChild(meta);
  }
  meta.id = `sc-product-${key}-meta`;

  const metadata: string[] = [];
  if (currentText) metadata.push(`${/^\$/.test(currentText) ? 'Precio actual ' : 'Estado '}${currentText}`);
  if (previousText) metadata.push(`Precio anterior ${previousText}`);
  if (traits.length) metadata.push(`${TRAITS_LABEL_PREFIX}${traits.join(', ')}`);
  meta.textContent = metadata.length ? `${metadata.join('. ')}.` : '';

  const labelledBy = [titleId, meta.textContent ? meta.id : ''].filter(Boolean);
  link.removeAttribute('aria-label');
  if (labelledBy.length) link.setAttribute('aria-labelledby', labelledBy.join(' '));
  else link.removeAttribute('aria-labelledby');
  if (descriptionId) link.setAttribute('aria-describedby', descriptionId);
  else link.removeAttribute('aria-describedby');
  link.setAttribute('aria-haspopup', 'dialog');
};

export const enhanceHeadingLevels = (): void => {
  let level = 3;
  const selector = [
    `${selectors.productList} ${selectors.sectionTitle}`,
    `${selectors.productList} ${selectors.sectionSubtitle}`,
    selectors.productCards,
  ].join(',');

  document.querySelectorAll<HTMLElement>(selector).forEach((node) => {
    if (node.matches(selectors.sectionTitle)) {
      level = 3;
      return;
    }
    if (node.matches(selectors.sectionSubtitle)) {
      level = 4;
      return;
    }
    node.querySelector(selectors.productTitle)?.setAttribute('aria-level', String(level));
  });
};

export const enhanceProductLinks = (root: ParentNode = document): void => {
  enhanceHeadingLevels();
  root.querySelectorAll<HTMLElement>(selectors.productLink).forEach(enhanceCardLink);
};
