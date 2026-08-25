// Documenta la responsabilidad de search catalog dentro del componente catalog tools y mantiene esa lógica en su propietario.
import { selectors } from '../../core/variables.js';
import { traitMaskForCard } from './search-filters.js';
import {
  NO_SEARCH_RANK,
  createSearchSegment,
  type SearchGroup,
  type SearchHost,
  type SearchItem,
} from './search-domain.js';
import { fieldMatches, normalizeSearchText } from './search-ranking.js';

const QUERY_CACHE_LIMIT = 32;

export class SearchCatalogIndex {
  #inventory: SearchItem[] = [];
  #searchable: SearchItem[] = [];
  #groups: SearchGroup[] = [];
  #hosts: SearchHost[] = [];
  #queryCandidates: SearchItem[] = [];
  #queryCache = new Map<string, SearchItem[]>();
  #lastQuery = '';
  #captured = false;

  get captured(): boolean { return this.#captured; }
  get inventory(): readonly SearchItem[] { return this.#inventory; }
  get searchable(): readonly SearchItem[] { return this.#searchable; }
  get groups(): readonly SearchGroup[] { return this.#groups; }
  get hosts(): readonly SearchHost[] { return this.#hosts; }

  capture(results: HTMLElement | null): void {
    if (this.#captured) return;
    this.clear();
    results?.querySelectorAll('.sc-catalog-search-group:not([data-sc-search-group-prototype])')
      .forEach((node) => node.remove());

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
        if (!item.wasHidden) this.#searchable.push(item);
      }
    }

    for (const host of this.#hosts) {
      host.after = host.groups.at(-1)?.node.nextSibling ?? null;
      host.signature = `o:${host.groups.map((group) => group.index).join(',')}`;
    }
    this.#queryCandidates = this.#searchable;
    this.#captured = true;
  }

  candidatesFor(query: string): readonly SearchItem[] {
    if (!query) {
      this.#lastQuery = '';
      this.#queryCandidates = this.#searchable;
      return this.#queryCandidates;
    }
    if (query === this.#lastQuery) return this.#queryCandidates;

    const cached = this.#queryCache.get(query);
    if (cached) {
      this.#queryCache.delete(query);
      this.#queryCache.set(query, cached);
      this.#lastQuery = query;
      this.#queryCandidates = cached;
      return cached;
    }

    let source: readonly SearchItem[] = this.#searchable;
    if (this.#lastQuery && query.length > this.#lastQuery.length && query.startsWith(this.#lastQuery)) {
      source = this.#queryCandidates;
    } else {
      for (let end = query.length - 1; end > 0; end -= 1) {
        const prefix = this.#queryCache.get(query.slice(0, end));
        if (prefix) {
          source = prefix;
          break;
        }
      }
    }

    const tokens = query.split(' ');
    const next = source.filter((item) => fieldMatches(item.text, query, tokens));
    this.#queryCandidates = next;
    this.#lastQuery = query;
    this.#rememberQuery(query, next);
    return next;
  }

  resetCandidates(): void {
    this.#lastQuery = '';
    this.#queryCandidates = this.#searchable;
  }

  clear(): void {
    this.#inventory = [];
    this.#searchable = [];
    this.#groups = [];
    this.#hosts = [];
    this.#queryCandidates = [];
    this.#queryCache.clear();
    this.#lastQuery = '';
    this.#captured = false;
  }

  #rememberQuery(query: string, items: SearchItem[]): void {
    if (this.#queryCache.has(query)) this.#queryCache.delete(query);
    this.#queryCache.set(query, items);
    if (this.#queryCache.size <= QUERY_CACHE_LIMIT) return;
    const oldest = this.#queryCache.keys().next().value as string | undefined;
    if (oldest) this.#queryCache.delete(oldest);
  }

  #hostFor(parent: Node): SearchHost {
    const existing = this.#hosts.find((host) => host.parent === parent);
    if (existing) return existing;
    const host: SearchHost = { parent, groups: [], after: null, signature: '' };
    this.#hosts.push(host);
    return host;
  }
}
