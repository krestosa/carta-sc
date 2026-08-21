import { classes, selectors } from '../../core/variables.js';
import {
  activeFilterMask,
  filterKeyFromTarget,
  filterMaskPasses,
  prepareFilterControls,
  syncFilterButtons,
  toggleFilter,
  traitMaskForCard,
} from './search-filters.js';
import {
  NO_SEARCH_RANK,
  createSearchSegment,
  type SearchGroup,
  type SearchHost,
  type SearchItem,
  type SearchNodes,
  type SearchSegment,
} from './search-domain.js';
import { fieldMatches, normalizeSearchText, rankSearchItem } from './search-ranking.js';

export interface CatalogSearchOptions {
  readonly onRestore?: () => void;
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

    const query = normalizeSearchText(value);
    const mask = activeFilterMask(this.#activeFilters);
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
      group.bestRank = NO_SEARCH_RANK;
      for (const segment of group.segments) {
        segment.count = 0;
        segment.bestRank = NO_SEARCH_RANK;
      }
    }

    for (const item of candidates) {
      if (!filterMaskPasses(item.traitMask, mask)) continue;
      const rank = rankSearchItem(item, query, tokens);
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
        bestRank: NO_SEARCH_RANK,
        wasHidden: section.hidden,
        visible: !section.hidden,
      };
      let segment = createSearchSegment(null, 0);
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
          segment = createSearchSegment(child, group.segments.length);
          group.segments.push(segment);
          continue;
        }
        if (!child.matches(selectors.productCard)) continue;

        const title = normalizeSearchText(child.querySelector<HTMLElement>(selectors.productTitle)?.textContent);
        const description = normalizeSearchText(child.querySelector<HTMLElement>(selectors.productDescription)?.textContent);
        const item: SearchItem = {
          card: child,
          title,
          description,
          text: `${title} ${description}`.trim(),
          traitMask: traitMaskForCard(child),
          group,
          segment,
          index: this.#inventory.length,
          wasHidden: child.hidden,
          visible: !child.hidden,
          matchEpoch: 0,
          rank: NO_SEARCH_RANK,
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
      item.rank = NO_SEARCH_RANK;
      item.card.style.removeProperty('order');
    }
    for (const group of this.#groups) {
      group.node.hidden = group.wasHidden;
      group.visible = !group.wasHidden;
      group.count = 0;
      group.bestRank = NO_SEARCH_RANK;
      if (group.titleNode) {
        group.titleNode.hidden = group.titleWasHidden;
        group.titleVisible = !group.titleWasHidden;
        group.titleNode.style.removeProperty('order');
      }
      for (const segment of group.segments) {
        segment.count = 0;
        segment.bestRank = NO_SEARCH_RANK;
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

  #syncFilterButtons(): void {
    const root = this.#nodes?.root;
    if (root) syncFilterButtons(root, this.#activeFilters);
  }

  #prepareFilters(): void {
    const root = this.#nodes?.root;
    if (root) prepareFilterControls(root, this.#activeFilters);
  }

  #toggleFilter(target: EventTarget | null): boolean {
    const root = this.#nodes?.root;
    if (!root) return false;
    const key = filterKeyFromTarget(root, target);
    if (!key) return false;

    toggleFilter(this.#activeFilters, key);
    this.#syncFilterButtons();
    this.#lastState = '';
    this.apply(this.#nodes?.input.value ?? '');
    return true;
  }
}
