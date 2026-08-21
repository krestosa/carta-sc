import { selectors } from '../../core/variables.js';
import {
  TRAITS_LABEL_PREFIX,
  appendTraitVisual as appendDataTraitVisual,
  createTraitIcon,
  ignoredTrait,
  traitLabels,
} from './data.js';

interface TraitSpec {
  readonly key: string;
  readonly label: string;
  readonly icon: string;
}

type DescriptionState = readonly [card: HTMLElement, clamped: boolean];

const DESCRIPTION_BATCH = 8;
const DESCRIPTION_BUDGET_MS = 4;
const DESCRIPTION_WRITE_BATCH = 24;
const DESCRIPTION_IDLE_TIMEOUT = 1400;

let descriptionStartFrame = 0;
let descriptionMeasureFrame = 0;
let descriptionWriteFrame = 0;
let descriptionIdle = 0;
let descriptionTimer = 0;
let descriptionQueue: HTMLElement[] = [];
let descriptionStates: DescriptionState[] = [];
let descriptionRerun = false;
let descriptionVisibilityObserver: IntersectionObserver | null = null;
let referenceStrip: HTMLElement | null = null;

const observedDescriptionCards = new Set<HTMLElement>();

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

const descriptionNode = (target: Element | null): HTMLElement | null => {
  if (!target) return null;
  if (target.matches(selectors.productDescription)) return target as HTMLElement;
  return target.querySelector<HTMLElement>(selectors.productDescription);
};

export const ensureDescriptionCopy = (target: Element | null): HTMLElement | null => {
  const description = descriptionNode(target);
  if (!description) return null;

  const existing = [...description.children].find((child) => child.classList.contains('sc-description-copy'));
  if (existing instanceof HTMLElement) return existing;

  const copy = document.createElement('span');
  copy.className = 'sc-description-copy';
  while (description.firstChild) copy.appendChild(description.firstChild);
  description.appendChild(copy);
  return copy;
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

const applyDescriptionState = (card: HTMLElement, clamped: boolean): void => {
  const description = card.querySelector<HTMLElement>(selectors.productDescription);
  if (!description) return;
  description.classList.toggle('sc-description-clamped', clamped);
  card.classList.toggle('sc-description-is-clamped', clamped);
};

const measureDescriptionCard = (card: HTMLElement): boolean => {
  const description = card.querySelector<HTMLElement>(selectors.productDescription);
  const copy = ensureDescriptionCopy(description);
  if (!description || !copy) return false;

  const lineHeight = Number.parseFloat(getComputedStyle(copy).lineHeight) || 0;
  return lineHeight > 0 && copy.scrollHeight > lineHeight * 2 + 0.5;
};

const flushDescriptionWrites = (): void => {
  descriptionWriteFrame = 0;
  const batch = descriptionStates.splice(0, DESCRIPTION_WRITE_BATCH);
  batch.forEach(([card, clamped]) => applyDescriptionState(card, clamped));

  if (descriptionStates.length) descriptionWriteFrame = requestAnimationFrame(flushDescriptionWrites);
  else if (descriptionQueue.length) scheduleDescriptionMeasure();
};

const queueDescriptionWrite = (card: HTMLElement, clamped: boolean): void => {
  descriptionStates.push([card, clamped]);
  if (!descriptionWriteFrame) descriptionWriteFrame = requestAnimationFrame(flushDescriptionWrites);
};

const observeDescriptionCard = (card: HTMLElement): void => {
  if (!('IntersectionObserver' in window)) return;
  descriptionVisibilityObserver ??= new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const node = entry.target as HTMLElement;
      observedDescriptionCards.delete(node);
      descriptionVisibilityObserver?.unobserve(node);
      descriptionQueue.push(node);
      scheduleDescriptionMeasure();
    });
  }, { rootMargin: '180px 0px' });

  if (!observedDescriptionCards.has(card)) {
    observedDescriptionCards.add(card);
    descriptionVisibilityObserver.observe(card);
  }
};

const measureDescriptionBatch = (deadline: IdleDeadline | null = null): void => {
  descriptionMeasureFrame = 0;
  descriptionIdle = 0;
  descriptionTimer = 0;
  const start = performance.now();
  let count = 0;

  while (descriptionQueue.length && count < DESCRIPTION_BATCH) {
    if (deadline && deadline.timeRemaining() < 1 && !deadline.didTimeout) break;
    if (performance.now() - start > DESCRIPTION_BUDGET_MS) break;
    const card = descriptionQueue.shift();
    if (!card) continue;
    if (card.hidden || card.offsetParent === null) {
      observeDescriptionCard(card);
      continue;
    }
    queueDescriptionWrite(card, measureDescriptionCard(card));
    count += 1;
  }

  if (descriptionQueue.length) scheduleDescriptionMeasure();
  else if (descriptionRerun) {
    descriptionRerun = false;
    scheduleDescriptionMeasure();
  }
};

export const cancelDescriptionMeasure = (): void => {
  if (descriptionStartFrame) cancelAnimationFrame(descriptionStartFrame);
  if (descriptionMeasureFrame) cancelAnimationFrame(descriptionMeasureFrame);
  if (descriptionWriteFrame) cancelAnimationFrame(descriptionWriteFrame);
  if (descriptionIdle && window.cancelIdleCallback) window.cancelIdleCallback(descriptionIdle);
  if (descriptionTimer) clearTimeout(descriptionTimer);

  descriptionStartFrame = 0;
  descriptionMeasureFrame = 0;
  descriptionWriteFrame = 0;
  descriptionIdle = 0;
  descriptionTimer = 0;
  descriptionQueue = [];
  descriptionStates = [];
  descriptionRerun = false;
};

export const scheduleDescriptionMeasure = (): void => {
  if (descriptionStartFrame || descriptionMeasureFrame || descriptionIdle || descriptionTimer) {
    descriptionRerun = true;
    return;
  }

  descriptionStartFrame = requestAnimationFrame(() => {
    descriptionStartFrame = 0;
    if (!descriptionQueue.length) {
      descriptionQueue = [...document.querySelectorAll<HTMLElement>(selectors.productCards)];
    }
    if (window.requestIdleCallback) {
      descriptionIdle = window.requestIdleCallback(measureDescriptionBatch, { timeout: DESCRIPTION_IDLE_TIMEOUT });
    } else {
      descriptionTimer = window.setTimeout(() => measureDescriptionBatch(), 30);
    }
  });
};

export const installFlavorRows = (root: ParentNode = document): void => {
  installTraitReferences();
  root.querySelectorAll<HTMLElement>(`${selectors.productCard} > ${selectors.productLink}`).forEach(installFlavorRow);
};

export const measureDescriptions = scheduleDescriptionMeasure;
