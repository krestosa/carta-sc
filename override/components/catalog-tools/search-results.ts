// Explica la responsabilidad de este archivo dentro del código propio y mantiene su lógica en el ámbito que le corresponde.
import { filterMaskPasses } from './search-filters.js';
import {
  NO_SEARCH_RANK,
  type SearchGroup,
  type SearchHost,
  type SearchItem,
  type SearchSegment,
} from './search-domain.js';
import { rankSearchItem } from './search-ranking.js';

const RANK_CACHE_LIMIT = 32;

export class SearchResultPresenter {
  #visibleItems: SearchItem[] = [];
  #rankCache = new Map<string, Map<number, number>>();
  #epoch = 0;
  #active = false;

  get active(): boolean { return this.#active; }

  enter(searchable: readonly SearchItem[], groups: readonly SearchGroup[]): void {
    if (this.#active) return;
    this.#active = true;
    for (const item of searchable) item.visible = !item.wasHidden;
    for (const group of groups) group.visible = !group.wasHidden;
    this.#visibleItems = [...searchable];
  }

  apply(
    candidates: readonly SearchItem[],
    groups: readonly SearchGroup[],
    hosts: readonly SearchHost[],
    query: string,
    filterMask: number,
  ): readonly SearchItem[] {
    const tokens = query ? query.split(' ') : [];
    const visible: SearchItem[] = [];
    const epoch = ++this.#epoch;
    const ranks = this.#ranksFor(query);

    for (const group of groups) {
      group.count = 0;
      group.bestRank = NO_SEARCH_RANK;
      for (const segment of group.segments) {
        segment.count = 0;
        segment.bestRank = NO_SEARCH_RANK;
      }
    }

    for (const item of candidates) {
      if (!filterMaskPasses(item.traitMask, filterMask)) continue;
      let rank = ranks.get(item.index);
      if (rank === undefined) {
        rank = rankSearchItem(item, query, tokens);
        ranks.set(item.index, rank);
      }
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

    for (const group of groups) {
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
      this.#prepareGroupOrder(group, query);
    }

    if (query) {
      for (const item of visible) {
        if (item.group.visible) this.#setMatchedItemOrder(item);
      }
    }

    this.#reorderHosts(hosts, query, true);
    this.#visibleItems = visible;
    return visible;
  }

  restore(
    inventory: readonly SearchItem[],
    searchable: readonly SearchItem[],
    groups: readonly SearchGroup[],
    hosts: readonly SearchHost[],
  ): void {
    for (const item of inventory) {
      item.card.hidden = item.wasHidden;
      item.visible = !item.wasHidden;
      item.matchEpoch = 0;
      item.rank = NO_SEARCH_RANK;
      if (item.card.style.order) item.card.style.removeProperty('order');
    }
    for (const group of groups) {
      group.node.hidden = group.wasHidden;
      group.visible = !group.wasHidden;
      group.count = 0;
      group.bestRank = NO_SEARCH_RANK;
      if (group.titleNode) {
        group.titleNode.hidden = group.titleWasHidden;
        group.titleVisible = !group.titleWasHidden;
        if (group.titleNode.style.order) group.titleNode.style.removeProperty('order');
      }
      for (const segment of group.segments) {
        segment.count = 0;
        segment.bestRank = NO_SEARCH_RANK;
        segment.searchOrderBase = 0;
        if (segment.heading) {
          segment.heading.hidden = segment.headingWasHidden;
          segment.headingVisible = !segment.headingWasHidden;
          if (segment.heading.style.order) segment.heading.style.removeProperty('order');
        }
      }
    }

    this.#reorderHosts(hosts, '', false);
    this.#active = false;
    this.#visibleItems = [...searchable];
  }

  clear(): void {
    this.#visibleItems = [];
    this.#rankCache.clear();
    this.#epoch = 0;
    this.#active = false;
  }

  #ranksFor(query: string): Map<number, number> {
    const cached = this.#rankCache.get(query);
    if (cached) {
      this.#rankCache.delete(query);
      this.#rankCache.set(query, cached);
      return cached;
    }

    const ranks = new Map<number, number>();
    this.#rankCache.set(query, ranks);
    if (this.#rankCache.size > RANK_CACHE_LIMIT) {
      const oldest = this.#rankCache.keys().next().value as string | undefined;
      if (oldest !== undefined) this.#rankCache.delete(oldest);
    }
    return ranks;
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

  #setOrder(node: HTMLElement, order: number): void {
    const value = String(order);
    if (node.style.order !== value) node.style.order = value;
  }

  #prepareGroupOrder(group: SearchGroup, query: string): void {
    if (!query) {
      for (const item of group.items) {
        if (item.card.style.order) item.card.style.removeProperty('order');
      }
      for (const segment of group.segments) {
        segment.searchOrderBase = 0;
        if (segment.heading?.style.order) segment.heading.style.removeProperty('order');
      }
      return;
    }

    const rankStride = group.items.length + 1;
    const segmentStride = rankStride * (NO_SEARCH_RANK + 1);
    const segments = group.segments
      .filter((segment) => segment.count > 0)
      .sort((a, b) => a.bestRank - b.bestRank || a.index - b.index);

    for (const segment of group.segments) {
      if (segment.count === 0) segment.searchOrderBase = 0;
    }
    segments.forEach((segment, position) => {
      const base = (position + 1) * segmentStride;
      segment.searchOrderBase = base;
      if (segment.heading) this.#setOrder(segment.heading, base);
    });
  }

  #setMatchedItemOrder(item: SearchItem): void {
    const group = item.group;
    const firstIndex = group.items[0]?.index ?? item.index;
    const localIndex = item.index - firstIndex;
    const rankStride = group.items.length + 1;
    const order = item.segment.searchOrderBase + 1 + item.rank * rankStride + localIndex;
    this.#setOrder(item.card, order);
  }

  #reorderHosts(hosts: readonly SearchHost[], query: string, markFirstVisible: boolean): void {
    for (const host of hosts) {
      const ordered = query
        ? host.groups.slice().sort((a, b) => {
            if (a.count && b.count) return a.bestRank - b.bestRank || a.index - b.index;
            if (a.count) return -1;
            if (b.count) return 1;
            return a.index - b.index;
          })
        : host.groups.slice().sort((a, b) => a.index - b.index);

      const firstVisible = markFirstVisible
        ? ordered.find((group) => group.visible && !group.node.hidden)
        : undefined;
      for (const group of host.groups) {
        group.node.classList.toggle('sc-search-first-visible', group === firstVisible);
      }

      const signature = `${query ? 'q' : 'o'}:${ordered.map((group) => group.index).join(',')}`;
      if (signature === host.signature) continue;

      const fragment = document.createDocumentFragment();
      ordered.forEach((group) => fragment.append(group.node));
      if (host.after?.parentNode === host.parent) host.parent.insertBefore(fragment, host.after);
      else host.parent.appendChild(fragment);
      host.signature = signature;
    }
  }
}
