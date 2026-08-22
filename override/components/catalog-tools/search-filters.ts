import { traitLabels } from '../product-card/data.js';
import { normalizeSearchText } from './search-ranking.js';

const SPICE_FILTERS = new Set(['poco picante', 'picante', 'muy picante']);
const FILTER_LABELS: Readonly<Record<string, string>> = {
  'poco picante': 'Poco Picante',
  picante: 'Picante',
  'muy picante': 'Muy Picante',
  vegetariano: 'Vegetariano',
};
const TRAIT_BITS: Readonly<Record<string, number>> = {
  'poco picante': 1,
  picante: 2,
  'muy picante': 4,
  vegetariano: 8,
};

function normalizeLegacyTrait(label: unknown): string {
  const key = normalizeSearchText(label);
  return key === 'algo picante' ? 'picante' : key;
}

function cardTraits(card: HTMLElement): string[] {
  const explicit = Array.from(card.querySelectorAll<HTMLElement>('[data-sc-trait]'))
    .map((node) => normalizeSearchText(node.getAttribute('data-sc-trait')))
    .filter(Boolean);
  if (explicit.length > 0) return [...new Set(explicit)];
  return [...new Set(traitLabels(card).map(normalizeLegacyTrait).filter(Boolean))];
}

export function traitMaskForCard(card: HTMLElement): number {
  return cardTraits(card).reduce((mask, trait) => mask | (TRAIT_BITS[trait] ?? 0), 0);
}

export function activeFilterMask(filters: ReadonlySet<string>): number {
  let mask = 0;
  for (const filter of filters) mask |= TRAIT_BITS[filter] ?? 0;
  return mask;
}

export function filterMaskPasses(traitMask: number, mask: number): boolean {
  const spiceMask = mask & 7;
  if (spiceMask && (traitMask & spiceMask) === 0) return false;
  return !(mask & 8) || (traitMask & 8) !== 0;
}

function filterKey(box: HTMLElement): string {
  const explicit = box.querySelector<HTMLElement>('[data-sc-trait]')?.getAttribute('data-sc-trait');
  if (explicit) return normalizeSearchText(explicit);
  return normalizeLegacyTrait(box.querySelector<HTMLElement>('.ref_label')?.textContent);
}

export function syncFilterButtons(root: HTMLElement, filters: ReadonlySet<string>): void {
  for (const button of root.querySelectorAll<HTMLElement>('[data-sc-filter]')) {
    const key = button.getAttribute('data-sc-filter') ?? '';
    const active = filters.has(key);
    button.setAttribute('aria-pressed', String(active));
    button.classList.toggle('is-active', active);
  }
}

export function prepareFilterControls(root: HTMLElement, filters: ReadonlySet<string>): void {
  const strip = root.querySelector<HTMLElement>('.referencias_picor.sc-trait-reference-strip');
  if (!strip) return;

  strip.querySelectorAll('[data-sc-filter="discount"],.sc-filter-chip--discount').forEach((node) => node.remove());
  for (const box of strip.querySelectorAll<HTMLElement>('.refBox')) {
    const key = filterKey(box);
    if (!SPICE_FILTERS.has(key) && key !== 'vegetariano') continue;

    const label = FILTER_LABELS[key] ?? key;
    const labelNode = box.querySelector<HTMLElement>('.ref_label');
    if (labelNode) labelNode.textContent = label;
    box.classList.add('sc-filter-chip');
    box.dataset.scFilter = key;
    box.setAttribute('role', 'button');
    box.tabIndex = 0;
    box.setAttribute('aria-pressed', 'false');
    box.setAttribute('aria-label', `Filtrar por ${label}`);
  }
  syncFilterButtons(root, filters);
}

export function filterKeyFromTarget(root: HTMLElement, target: EventTarget | null): string | null {
  const element = target instanceof Element ? target : null;
  const chip = element?.closest<HTMLElement>('[data-sc-filter]');
  if (!chip || !root.contains(chip)) return null;
  return chip.dataset.scFilter ?? null;
}

export function toggleFilter(filters: Set<string>, key: string): void {
  if (filters.has(key)) filters.delete(key);
  else filters.add(key);
}
