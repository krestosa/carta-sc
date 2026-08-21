export interface SearchSegment {
  readonly heading: HTMLElement | null;
  readonly headingWasHidden: boolean;
  readonly index: number;
  readonly items: SearchItem[];
  headingVisible: boolean;
  count: number;
  bestRank: number;
}

export interface SearchHost {
  readonly parent: Node;
  readonly groups: SearchGroup[];
  after: ChildNode | null;
  signature: string;
}

export interface SearchGroup {
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

export interface SearchItem {
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

export interface SearchNodes {
  readonly root: HTMLElement;
  readonly input: HTMLInputElement;
  readonly clear: HTMLElement | null;
  readonly status: HTMLElement | null;
  readonly results: HTMLElement | null;
  readonly empty: HTMLElement | null;
}

export const NO_SEARCH_RANK = 99;

export function createSearchSegment(heading: HTMLElement | null, index: number): SearchSegment {
  return {
    heading,
    headingWasHidden: heading?.hidden ?? false,
    headingVisible: heading ? !heading.hidden : false,
    items: [],
    count: 0,
    bestRank: NO_SEARCH_RANK,
    index,
  };
}
