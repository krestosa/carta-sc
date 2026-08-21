import { selectors } from '../../core/variables.js';
import {
  TRAITS_LABEL_PREFIX,
  appendTraitVisual as appendDataTraitVisual,
  createTraitIcon,
  ignoredTrait,
  traitLabels,
} from './data.js';
import {
  cancelDescriptionMeasure,
  ensureDescriptionCopy,
  measureDescriptions,
  scheduleDescriptionMeasure,
} from './description.js';

interface TraitSpec {
  readonly key: string;
  readonly label: string;
  readonly icon: string;
}

export { cancelDescriptionMeasure, ensureDescriptionCopy, measureDescriptions, scheduleDescriptionMeasure };

let referenceStrip: HTMLElement | null = null;

const traitKey = (label: string): string => label.trim().toLocaleLowerCase('es-AR');

const traitSpec = (label: string): TraitSpec => {
  const key = traitKey(label);
  switch (key) {
    case 'poco picante': return { key, label: 'Poco Picante', icon: 'algo picante' };
    case 'algo picante':
    case 'picante': return { key: 'picante', label: 'Picante', icon: 'poco picante' };
    case 'muy picante': return { key, label: 'Muy Picante', icon: key };
    case 'vegetariano': return { key, label: 'Vegetariano', icon: key };
    default: return { key, label: label.trim(), icon: key };
  }
};

const markTrait = <T extends Element | null>(node: T, key: string): T => {
  node?.setAttribute('data-sc-trait', key);
  return node;
};

const appendTraitVisual = (target: HTMLElement, source: ParentNode, label: string): Element | null => {
  const spec = traitSpec(label);
  const icon = createTraitIcon(spec.icon);
  if (icon) {
    target.appendChild(markTrait(icon, spec.key));
    return icon;
  }
  return markTrait(appendDataTraitVisual(target, source, label), spec.key);
};

export const clearFlavorRows = (root: ParentNode = document): void => {
  root.querySelectorAll('.sc-product-secondary-meta').forEach((group) => {
    const offer = group.querySelector('.ofertaPrice');
    const parent = group.parentNode;
    if (!parent) return;
    if (offer) parent.insertBefore(offer, group);
    group.remove();
  });
  root.querySelectorAll('.sc-product-flavors,.sc-product-price-traits').forEach((row) => row.remove());
};

export const positionTraitReferences = (): void => {
  const strip = referenceStrip ?? document.querySelector<HTMLElement>('.referencias_picor');
  const tools = document.querySelector<HTMLElement>('.sc-catalog-tools');
  if (!strip) return;

  referenceStrip = strip;
  strip.classList.add('sc-trait-reference-strip');
  const spacer = strip.previousElementSibling;
  if (spacer && !spacer.textContent?.trim() && spacer.querySelector('br')) {
    spacer.classList.add('sc-trait-reference-legacy-spacer');
  }

  if (!tools) return;
  const results = tools.querySelector('.sc-catalog-search-results');
  if (strip.parentNode !== tools || strip.nextElementSibling !== results) {
    tools.insertBefore(strip, results ?? null);
  }
};

export const installTraitReferences = (): void => {
  document.querySelectorAll('.referencias_picor .refBox').forEach((box) => {
    const labelNode = box.querySelector<HTMLElement>('.ref_label');
    const image = box.querySelector<HTMLImageElement>('.imgRef img');
    const host = box.querySelector<HTMLElement>('.imgRef');
    const label = (labelNode?.textContent ?? image?.getAttribute('data-original-title') ?? '').trim();
    const spec = traitSpec(label);

    if (ignoredTrait(label)) {
      box.remove();
      return;
    }
    if (labelNode) labelNode.textContent = spec.label;
    if (!host) return;

    const icon = createTraitIcon(spec.icon);
    if (icon) {
      host.textContent = '';
      host.appendChild(markTrait(icon, spec.key));
    }
  });
  positionTraitReferences();
};

export const buildTraitRow = (
  className: string,
  labels: string[],
  source: ParentNode,
): HTMLSpanElement => {
  const row = document.createElement('span');
  const accessible = new Set<string>();
  row.className = className;

  labels.forEach((label) => {
    const spec = traitSpec(label);
    appendTraitVisual(row, source, label);
    accessible.add(spec.label);
  });

  if (accessible.size) {
    row.setAttribute('role', 'img');
    row.setAttribute('aria-label', `${TRAITS_LABEL_PREFIX}${[...accessible].join(', ')}`);
  } else {
    row.setAttribute('aria-hidden', 'true');
  }
  return row;
};

export const installFlavorRow = (link: HTMLElement | null): void => {
  if (!link) return;
  ensureDescriptionCopy(link);
  clearFlavorRows(link);

  const title = link.querySelector<HTMLElement>(selectors.productTitle);
  const source = title?.querySelector<HTMLElement>(selectors.productTraits) ?? null;
  const priceRow = link.querySelector<HTMLElement>('.priceRow');
  if (source) source.setAttribute('aria-hidden', 'true');
  if (!priceRow) return;

  const labels = traitLabels(link);
  const visualSource: ParentNode = source ?? link;
  const offer = priceRow.querySelector<HTMLElement>('.ofertaPrice');
  let secondary: HTMLSpanElement | null = null;

  if (offer) {
    secondary = document.createElement('span');
    secondary.className = 'sc-product-secondary-meta';
    priceRow.insertBefore(secondary, offer);
    secondary.appendChild(offer);
  }

  if (labels.length) {
    (secondary ?? priceRow).appendChild(buildTraitRow('sc-product-price-traits sabores', labels, visualSource));
  }
};

export const installFlavorRows = (root: ParentNode = document): void => {
  installTraitReferences();
  root.querySelectorAll<HTMLElement>(`${selectors.productCard} > ${selectors.productLink}`).forEach(installFlavorRow);
};
