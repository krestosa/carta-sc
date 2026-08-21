import { classes, selectors } from '../../core/variables.js';
import { traitLabels } from '../product-card/data.js';

interface SearchSegment {
  readonly heading: HTMLElement | null;
  readonly headingWasHidden: boolean;
  readonly index: number;
  readonly items: SearchItem[];
  headingVisible: boolean;
  count: number;
  bestRank: number;
}

interface SearchHost {
  readonly parent: Node;
  readonly groups: SearchGroup[];
  after: ChildNode | null;
  signature: string;
}

interface SearchGroup {
  readonly node: HTMLElement;
  readonly host: SearchHost;
  readonly index: number;
  readonly segments: SearchSegment[];
  readonly items: SearchItem[];
  readonly wasHidden: boolean;
  titleNode: HTMLElement | null;
  titleWasHidden: boolean;
  titleVisible: boolean;
  count: number;
  bestRank: number;
  visible: boolean;
}

interface SearchItem {
  readonly card: HTMLElement;
  readonly title: string;
  readonly description: string;
  readonly text: string;
  readonly traitMask: number;
  readonly group: SearchGroup;
  readonly segment: SearchSegment;
  readonly index: number;
  readonly wasHidden: boolean;
  visible: boolean;
  matchEpoch: number;
  rank: number;
}

interface SearchNodes {
  readonly root: HTMLElement;
  readonly input: HTMLInputElement;
  readonly clear: HTMLElement | null;
  readonly status: HTMLElement | null;
  readonly results: HTMLElement | null;
  readonly empty: HTMLElement | null;
}

export interface CatalogSearchOptions {
  readonly onRestore?: () => void;
}

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

function normalize(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function normalizeLegacyTrait(label: unknown): string {
  const key = normalize(label);
  return key === 'algo picante' ? 'picante' : key;
}

function cardTraits(card: HTMLElement): string[] {
  const explicit = Array.from(card.querySelectorAll<HTMLElement>('[data-sc-trait]'))
    .map((node) => normalize(node.getAttribute('data-sc-trait')))
    .filter(Boolean);
  if (explicit.length > 0) return [...new Set(explicit)];
  return [...new Set(traitLabels(card).map(normalizeLegacyTrait).filter(Boolean))];
}

function traitsMask(traits: readonly string[]): number {
  return traits.reduce((mask, trait) => mask | (TRAIT_BITS[trait] ?? 0), 0);
}

function makeSegment(heading: HTMLElement | null, index: number): SearchSegment {
  return {
    heading,
    headingWasHidden: heading?.hidden ?? false,
    headingVisible: heading ? !heading.hidden : false,
    items: [],
    count: 0,
    bestRank: 99,
    index,
  };
}

function fieldMatches(text: string, query: string, tokens: readonly string[]): boolean {
  return text.includes(query) || tokens.every((token) => text.includes(token));
}

function rankItem(item: SearchItem, query: string, tokens: readonly string[]): number {
  if (!query) return 0;
  if (item.title === query) return 0;
  if (item.title.startsWith(query)) return 1;
  if (item.title.includes(query)) return 2;
  if (fieldMatches(item.title, query, tokens)) return 3;
  if (item.description === query) return 4;
  if (item.description.startsWith(query)) return 5;
  if (item.description.includes(query)) return 6;
  if (fieldMatches(item.description, query, tokens)) return 7;
  return fieldMatches(item.text, query, tokens) ? 8 : -1;
}

export class CatalogSearchController {
  readonly #activeFilters = new Set<string>();
  readonly #onRestore: () => void;

  #nodes: SearchNodes | null = null;
  #inventory: SearchItem[] = [];
  #searchable: SearchItem[] = [];
  #groups: SearchGroup[] = [];
  #hosts: SearchHost[] = [];
  #visibleItems: SearchItem[] = [];
  #queryCandidates: SearchItem[] = [];
  #lastQuery = '';
  #lastState = '';
  #epoch = 0;
  #captured = false;
  #active = false;

  constructor(options: CatalogSearchOptions = {}) {
    this.#onRestore = options.onRestore ?? (() => undefined);
  }

  get filters(): readonly string[] {
    return Array.from(this.#activeFilters);
  }

  install(root: HTMLElement): () => void {
    this.destroy();
    const input = root.querySelector<HTMLInputElement>('.sc-catalog-search-input');
    if (!input) return () => undefined;

    this.#nodes = {
      root,
      input,
      clear: root.querySelector<HTMLElement>('.sc-catalog-search-clear'),
      status: root.querySelector<HTMLElement>('.sc-catalog-search-status'),
      results: root.querySelector<HTMLElement>('.sc-catalog-search-results'),
      empty: root.querySelector<HTMLElement>('.sc-catalog-search-empty-message'),
    };
    root.querySelectorAll('.sc-sort-control').forEach((node) => node.remove());

    const onInput = (): void => {
      this.#lastState = '';
      this.apply(input.value);
      this.#syncClear();
    };
    const onInputKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || !input.value) return;
      event.preventDefault();
      this.clear(true);
    };
    const onRootClick = (event: MouseEvent): void => {
      const target = event.target instanceof Element ? event.target : null;
      const clear = target?.closest<HTMLElement>('.sc-catalog-search-clear');
      if (clear && root.contains(clear)) {
        event.preventDefault();
        event.stopPropagation();
        this.clear(true);
        return;
      }
      if (this.#toggleFilter(event.target)) event.preventDefault();
    };
    const onRootKeyDown = (event: KeyboardEvent): void => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-sc-filter]') : null;
      if (!target || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      this.#toggleFilter(target);
    };

    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onInputKeyDown);
    root.addEventListener('click', onRootClick);
    root.addEventListener('keydown', onRootKeyDown);

    this.#syncClear();
    requestAnimationFrame(() => {
      if (this.#nodes?.root !== root) return;
      this.#prepareFilters();
      this.#syncClear();
    });

    return () => {
      if (this.#nodes?.root !== root) return;
      input.removeEventListener('input', onInput);
      input.removeEventListener('keydown', onInputKeyDown);
      root.removeEventListener('click', onRootClick);
      root.removeEventListener('keydown', onRootKeyDown);
      this.destroy();
    };
  }

  apply(value: unknown): void {
    const nodes = this.#nodes;
    if (!nodes) return;

    const query = normalize(value);
    const mask = this.#filterMask();
    const hasMode = Boolean(query) || mask !== 0;
    const stateKey = `${query}|${mask}`;
    if (stateKey === this.#lastState) return;

    if (!hasMode) {
      this.#lastState = stateKey;
      if (this.#active) this.#restore(true);
      else {
        nodes.root.classList.remove('sc-search-has-value');
        this.#setEmpty(1);
        if (nodes.status) nodes.status.textContent = '';
      }
      return;
    }

    this.#captureIfNeeded();
    this.#enterSearchMode();
    this.#lastState = stateKey;
    nodes.root.classList.toggle('sc-search-has-value', Boolean(query));

    const candidates = this.#candidatesFor(query);
    const tokens = query ? query.split(' ') : [];
    const visible: SearchItem[] = [];
    const epoch = ++this.#epoch;

    for (const group of this.#groups) {
      group.count = 0;
      group.bestRank = 99;
      for (const segment of group.segments) {
        segment.count = 0;
        segment.bestRank = 99;
      }
    }

    for (const item of candidates) {
      if (!this.#filtersPass(item, mask)) continue;
      const rank = rankItem(item, query, tokens);
      if (rank < 0) continue;
      item.rank = rank;
      item.matchEpoch = epoch;
      visible.push(item);
      item.group.count += 1;
      item.group.bestRank = Math.min(item.group.bestRank, rank);
      item.segment.count += 1;
      item.segment.bestRank = Math.min(item.segment.bestRank, rank);
    }

    for (const item of this.#visibleItems) {
      if (item.matchEpoch !== epoch && item.visible) {
        item.card.hidden = true;
        item.visible = false;
      }
    }
    for (const item of visible) {
      if (!item.visible) {
        item.card.hidden = false;
        item.visible = true;
      }
    }

    for (const group of this.#groups) {
      const show = !group.wasHidden && group.count > 0;
      if (group.visible !== show) {
        group.node.hidden = !show;
        group.visible = show;
      }
      if (!show) continue;
      this.#setHeadingHidden(group.titleNode, false, group, 'titleVisible');
      for (const segment of group.segments) {
        this.#setHeadingHidden(segment.heading, segment.count === 0, segment, 'headingVisible');
      }
      this.#orderGroupContent(group, query);
    }

    this.#reorderHosts(query);
    this.#visibleItems = visible;
    this.#setEmpty(visible.length);
    if (nodes.status) nodes.status.textContent = visible.length === 1 ? '1 producto encontrado' : `${visible.length} productos encontrados`;
  }

  clear(focusInput = false): void {
    const nodes = this.#nodes;
    if (!nodes) return;
    nodes.input.value = '';
    this.#lastState = '';
    this.apply('');
    this.#syncClear();
    if (focusInput) nodes.input.focus();
  }

  destroy(): void {
    if (this.#active) this.#restore(false);
    else document.body?.classList.remove(classes.catalogSearching);
    this.#nodes = null;
    this.#inventory = [];
    this.#searchable = [];
    this.#groups = [];
    this.#hosts = [];
    this.#visibleItems = [];
    this.#queryCandidates = [];
    this.#lastQuery = '';
    this.#lastState = '';
    this.#captured = false;
    this.#active = false;
    this.#activeFilters.clear();
  }

  #hostFor(parent: Node): SearchHost {
    const existing = this.#hosts.find((host) => host.parent === parent);
    if (existing) return existing;
    const host: SearchHost = { parent, groups: [], after: null, signature: '' };
    this.#hosts.push(host);
    return host;
  }

  #captureIfNeeded(): void {
    if (this.#captured || !this.#nodes) return;

    const nodes = this.#nodes;
    this.#inventory = [];
    this.#searchable = [];
    this.#groups = [];
    this.#hosts = [];
    this.#visibleItems = [];
    this.#queryCandidates = [];
    this.#lastQuery = '';
    nodes.results?.querySelectorAll('.sc-catalog-search-group:not([data-sc-search-group-prototype])').forEach((node) => node.remove());

    for (const section of document.querySelectorAll<HTMLElement>(`${selectors.container} ${selectors.productList}`)) {
      if (section.closest('.sc-catalog-search-results')) continue;
      section.classList.add('sc-search-source');
      const parent = section.parentNode;
      if (!parent) continue;

      const host = this.#hostFor(parent);
      const group: SearchGroup = {
        node: section,
        host,
        index: this.#groups.length,
        titleNode: null,
        titleWasHidden: false,
        titleVisible: false,
        segments: [],
        items: [],
        count: 0,
        bestRank: 99,
        wasHidden: section.hidden,
        visible: !section.hidden,
      };
      let segment = makeSegment(null, 0);
      group.segments.push(segment);
      this.#groups.push(group);
      host.groups.push(group);

      for (const child of Array.from(section.children)) {
        if (!(child instanceof HTMLElement)) continue;
        if (child.matches(selectors.sectionTitle)) {
          group.titleNode = child;
          group.titleWasHidden = child.hidden;
          group.titleVisible = !child.hidden;
          continue;
        }
        if (child.matches(selectors.sectionSubtitle)) {
          segment = makeSegment(child, group.segments.length);
          group.segments.push(segment);
          continue;
        }
        if (!child.matches(selectors.productCard)) continue;

        const title = normalize(child.querySelector<HTMLElement>(selectors.productTitle)?.textContent);
        const description = normalize(child.querySelector<HTMLElement>(selectors.productDescription)?.textContent);
        const item: SearchItem = {
          card: child,
          title,
          description,
          text: `${title} ${description}`.trim(),
          traitMask: traitsMask(cardTraits(child)),
          group,
          segment,
          index: this.#inventory.length,
          wasHidden: child.hidden,
          visible: !child.hidden,
          matchEpoch: 0,
          rank: 99,
        };
        this.#inventory.push(item);
        group.items.push(item);
        segment.items.push(item);
        if (!item.wasHidden) {
          this.#searchable.push(item);
          this.#visibleItems.push(item);
        }
      }
    }

    for (const host of this.#hosts) {
      host.after = host.groups.at(-1)?.node.nextSibling ?? null;
      host.signature = `o:${host.groups.map((group) => group.index).join(',')}`;
    }
    this.#queryCandidates = this.#searchable;
    this.#captured = true;
  }

  #filterMask(): number {
    let mask = 0;
    for (const filter of this.#activeFilters) mask |= TRAIT_BITS[filter] ?? 0;
    return mask;
  }

  #filtersPass(item: SearchItem, mask: number): boolean {
    const spiceMask = mask & 7;
    if (spiceMask && (item.traitMask & spiceMask) === 0) return false;
    return !(mask & 8) || (item.traitMask & 8) !== 0;
  }

  #candidatesFor(query: string): SearchItem[] {
    if (!query) {
      this.#lastQuery = '';
      this.#queryCandidates = this.#searchable;
      return this.#queryCandidates;
    }
    if (query === this.#lastQuery) return this.#queryCandidates;

    const source = this.#lastQuery && query.length > this.#lastQuery.length && query.startsWith(this.#lastQuery)
      ? this.#queryCandidates
      : this.#searchable;
    const tokens = query.split(' ');
    this.#queryCandidates = source.filter((item) => fieldMatches(item.text, query, tokens));
    this.#lastQuery = query;
    return this.#queryCandidates;
  }

  #setEmpty(total: number): void {
    const { results, empty } = this.#nodes ?? {};
    if (!results || !empty) return;
    const isEmpty = total === 0;
    results.hidden = !isEmpty;
    empty.hidden = !isEmpty;
  }

  #setHeadingHidden(
    node: HTMLElement | null,
    hidden: boolean,
    owner: SearchGroup | SearchSegment,
    key: 'titleVisible' | 'headingVisible',
  ): void {
    if (!node) return;
    if (key === 'titleVisible' && 'titleVisible' in owner) {
      if (owner.titleVisible === !hidden) return;
      node.hidden = hidden;
      owner.titleVisible = !hidden;
    } else if (key === 'headingVisible' && 'headingVisible' in owner) {
      if (owner.headingVisible === !hidden) return;
      node.hidden = hidden;
      owner.headingVisible = !hidden;
    }
  }

  #orderGroupContent(group: SearchGroup, query: string): void {
    if (!query) {
      group.items.forEach((item) => item.card.style.removeProperty('order'));
      group.segments.forEach((segment) => segment.heading?.style.removeProperty('order'));
      return;
    }

    const segments = group.segments
      .filter((segment) => segment.count > 0)
      .sort((a, b) => a.bestRank - b.bestRank || a.index - b.index);
    segments.forEach((segment, position) => {
      const base = 1000 + position * 1000;
      const items = segment.items
        .filter((item) => item.matchEpoch === this.#epoch)
        .sort((a, b) => a.rank - b.rank || a.index - b.index);
      if (segment.heading) segment.heading.style.order = String(base);
      items.forEach((item, index) => { item.card.style.order = String(base + index + 1); });
    });
  }

  #reorderHosts(query: string): void {
    for (const host of this.#hosts) {
      const ordered = query
        ? host.groups.slice().sort((a, b) => {
            if (a.count && b.count) return a.bestRank - b.bestRank || a.index - b.index;
            if (a.count) return -1;
            if (b.count) return 1;
            return a.index - b.index;
          })
        : host.groups.slice().sort((a, b) => a.index - b.index);
      const signature = `${query ? 'q' : 'o'}:${ordered.map((group) => group.index).join(',')}`;
      if (signature === host.signature) continue;

      const fragment = document.createDocumentFragment();
      ordered.forEach((group) => fragment.append(group.node));
      if (host.after?.parentNode === host.parent) host.parent.insertBefore(fragment, host.after);
      else host.parent.appendChild(fragment);
      host.signature = signature;
    }
  }

  #enterSearchMode(): void {
    if (this.#active) return;
    this.#active = true;
    document.body.classList.add(classes.catalogSearching);
    this.#inventory.forEach((item) => { item.visible = !item.wasHidden; });
    this.#groups.forEach((group) => { group.visible = !group.wasHidden; });
    this.#visibleItems = this.#searchable.slice();
  }

  #restore(refresh: boolean): void {
    for (const item of this.#inventory) {
      item.card.hidden = item.wasHidden;
      item.visible = !item.wasHidden;
      item.matchEpoch = 0;
      item.rank = 99;
      item.card.style.removeProperty('order');
    }
    for (const group of this.#groups) {
      group.node.hidden = group.wasHidden;
      group.visible = !group.wasHidden;
      group.count = 0;
      group.bestRank = 99;
      if (group.titleNode) {
        group.titleNode.hidden = group.titleWasHidden;
        group.titleVisible = !group.titleWasHidden;
        group.titleNode.style.removeProperty('order');
      }
      for (const segment of group.segments) {
        segment.count = 0;
        segment.bestRank = 99;
        if (segment.heading) {
          segment.heading.hidden = segment.headingWasHidden;
          segment.headingVisible = !segment.headingWasHidden;
          segment.heading.style.removeProperty('order');
        }
      }
    }

    this.#reorderHosts('');
    this.#active = false;
    this.#lastState = '';
    this.#lastQuery = '';
    this.#queryCandidates = this.#searchable;
    this.#visibleItems = this.#searchable.slice();
    document.body.classList.remove(classes.catalogSearching);
    this.#nodes?.root.classList.remove('sc-search-has-value');
    this.#setEmpty(1);
    if (this.#nodes?.status) this.#nodes.status.textContent = '';
    if (refresh) requestAnimationFrame(this.#onRestore);
  }

  #syncClear(): void {
    if (this.#nodes?.clear) this.#nodes.clear.hidden = !this.#nodes.input.value;
  }

  #filterKey(box: HTMLElement): string {
    const explicit = box.querySelector<HTMLElement>('[data-sc-trait]')?.getAttribute('data-sc-trait');
    if (explicit) return normalize(explicit);
    return normalizeLegacyTrait(box.querySelector<HTMLElement>('.ref_label')?.textContent);
  }

  #syncFilterButtons(): void {
    const root = this.#nodes?.root;
    if (!root) return;
    for (const button of root.querySelectorAll<HTMLElement>('[data-sc-filter]')) {
      const key = button.getAttribute('data-sc-filter') ?? '';
      const active = this.#activeFilters.has(key);
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('is-active', active);
    }
  }

  #prepareFilters(): void {
    const root = this.#nodes?.root;
    if (!root) return;
    const strip = root.querySelector<HTMLElement>('.referencias_picor.sc-trait-reference-strip');
    if (!strip) return;

    strip.querySelectorAll('[data-sc-filter="discount"],.sc-filter-chip--discount').forEach((node) => node.remove());
    for (const box of strip.querySelectorAll<HTMLElement>('.refBox')) {
      const key = this.#filterKey(box);
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
    this.#syncFilterButtons();
  }

  #toggleFilter(target: EventTarget | null): boolean {
    const root = this.#nodes?.root;
    const element = target instanceof Element ? target : null;
    const chip = element?.closest<HTMLElement>('[data-sc-filter]');
    if (!root || !chip || !root.contains(chip)) return false;
    const key = chip.dataset.scFilter;
    if (!key) return false;

    if (this.#activeFilters.has(key)) this.#activeFilters.delete(key);
    else this.#activeFilters.add(key);
    this.#syncFilterButtons();
    this.#lastState = '';
    this.apply(this.#nodes?.input.value ?? '');
    return true;
  }
}
