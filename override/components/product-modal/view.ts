import { selectors } from '../../core/variables.js';
import { text } from '../../core/utils.js';
import { buildTraitRow, installFlavorRow } from '../product-card/content.js';
import { imageSource, traitLabels } from '../product-card/data.js';
import { cloneTemplate } from '../../templates/registry.js';

export const PRODUCT_MODAL_SELECTORS = {
  dialog: '.sc-product-modal__dialog',
  close: '.sc-product-modal__close',
} as const;

const CART_URL = 'https://www.sushiclub.com.ar/shop_init.php';
let titleSequence = 0;

function required<T extends Element>(root: Element, selector: string): T {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`[SushiClub modal] Falta ${selector}`);
  return node;
}

export function buildProductModal(link: HTMLElement): HTMLElement | null {
  const card = link.closest<HTMLElement>(selectors.productCard);
  if (!card) return null;

  installFlavorRow(link);

  const name = text(card.querySelector(selectors.productTitle));
  const description = text(card.querySelector(selectors.productDescription));
  const source = imageSource(card);
  const titleId = `sc-product-modal-title-${++titleSequence}`;
  const overlay = cloneTemplate<HTMLElement>('product-modal');

  const dialog = required<HTMLElement>(overlay, PRODUCT_MODAL_SELECTORS.dialog);
  const image = required<HTMLImageElement>(overlay, '.sc-product-modal__image');
  const title = required<HTMLElement>(overlay, '.sc-product-modal__title');
  const copy = required<HTMLElement>(overlay, '.sc-product-modal__description');
  const priceSlot = required<HTMLElement>(overlay, '.sc-product-modal__price-slot');
  const cta = required<HTMLAnchorElement>(overlay, '.sc-product-modal__cart-button');

  title.id = titleId;
  dialog.setAttribute('aria-labelledby', titleId);

  if (source) {
    image.loading = 'eager';
    image.fetchPriority = 'high';
    image.src = source;
    image.alt = name;
  } else {
    image.remove();
  }

  const labels = traitLabels(card);
  const traitSource = card.querySelector<HTMLElement>(`${selectors.productTitle} ${selectors.productTraits}`) ?? card;
  const traits = buildTraitRow('sc-product-modal__traits sabores', labels, traitSource);

  title.append(document.createTextNode(name));
  if (description) copy.textContent = description;
  else copy.remove();

  const sourcePrice = card.querySelector<HTMLElement>('.priceRow');
  if (sourcePrice) {
    const price = sourcePrice.cloneNode(true) as HTMLElement;
    price.className = 'sc-product-modal__price-row';
    for (const node of price.querySelectorAll('.sumar,input,button,.sc-product-price-traits')) node.remove();

    const secondary = price.querySelector<HTMLElement>('.sc-product-secondary-meta');
    price.classList.toggle('sc-price-row-has-offer', Boolean(price.querySelector('.ofertaPrice')));
    if (secondary) {
      secondary.classList.add('sc-product-modal__secondary-meta');
      if (traits) secondary.append(traits);
    } else if (traits) {
      price.append(traits);
    }
    priceSlot.replaceWith(price);
  } else {
    priceSlot.remove();
    if (traits) title.prepend(traits);
  }

  cta.href = CART_URL;
  return overlay;
}
