import { filterMaskPasses } from './search-filters.js';
import {
  NO_SEARCH_RANK,
  type SearchGroup,
  type SearchHost,
  type SearchItem,
  type SearchSegment,
} from './search-domain.js';
import { rankSearchItem } from './search-ranking.js';

export class SearchResultPresenter {
  #visibleItems: SearchItem[] = [];
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
      this.#orderGroupContent(group, query, epoch);
    }

    this.#reorderHosts(hosts, query);
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
      item.card.style.removeProperty('order');
    }
    for (const group of groups) {
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

    this.#reorderHosts(hosts, '');
    this.#active = false;
    this.#visibleItems = [...searchable];
  }

  clear(): void {
    this.#visibleItems = [];
    this.#epoch = 0;
    this.#active = false;
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

  #orderGroupContent(group: SearchGroup, query: string, epoch: number): void {
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
        .filter((item) => item.matchEpoch === epoch)
        .sort((a, b) => a.rank - b.rank || a.index - b.index);
      if (segment.heading) segment.heading.style.order = String(base);
      items.forEach((item, index) => { item.card.style.order = String(base + index + 1); });
    });
  }

  #reorderHosts(hosts: readonly SearchHost[], query: string): void {
    for (const host of hosts) {
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
}
