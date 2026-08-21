import { classes } from '../../core/variables.js';
import {
  activeFilterMask,
  filterKeyFromTarget,
  prepareFilterControls,
  syncFilterButtons,
  toggleFilter,
} from './search-filters.js';
import { SearchCatalogIndex } from './search-catalog.js';
import type { SearchNodes } from './search-domain.js';
import { normalizeSearchText } from './search-ranking.js';
import { SearchResultPresenter } from './search-results.js';

export interface CatalogSearchOptions {
  readonly onRestore?: () => void;
}

export class CatalogSearchController {
  readonly #activeFilters = new Set<string>();
  readonly #onRestore: () => void;
  readonly #catalog = new SearchCatalogIndex();
  readonly #presenter = new SearchResultPresenter();

  #nodes: SearchNodes | null = null;
  #lastState = '';

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
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-sc-filter]')
        : null;
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
      if (this.#presenter.active) this.#restore(true);
      else {
        nodes.root.classList.remove('sc-search-has-value');
        this.#setEmpty(1);
        if (nodes.status) nodes.status.textContent = '';
      }
      return;
    }

    if (!this.#catalog.captured) this.#catalog.capture(nodes.results);
    this.#enterSearchMode();
    this.#lastState = stateKey;
    nodes.root.classList.toggle('sc-search-has-value', Boolean(query));

    const visible = this.#presenter.apply(
      this.#catalog.candidatesFor(query),
      this.#catalog.groups,
      this.#catalog.hosts,
      query,
      mask,
    );
    this.#setEmpty(visible.length);
    if (nodes.status) {
      nodes.status.textContent = visible.length === 1
        ? '1 producto encontrado'
        : `${visible.length} productos encontrados`;
    }
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
    if (this.#presenter.active) this.#restore(false);
    else document.body?.classList.remove(classes.catalogSearching);
    this.#nodes = null;
    this.#lastState = '';
    this.#catalog.clear();
    this.#presenter.clear();
    this.#activeFilters.clear();
  }

  #enterSearchMode(): void {
    if (this.#presenter.active) return;
    document.body.classList.add(classes.catalogSearching);
    this.#presenter.enter(this.#catalog.searchable, this.#catalog.groups);
  }

  #restore(refresh: boolean): void {
    this.#presenter.restore(
      this.#catalog.inventory,
      this.#catalog.searchable,
      this.#catalog.groups,
      this.#catalog.hosts,
    );
    this.#catalog.resetCandidates();
    this.#lastState = '';
    document.body.classList.remove(classes.catalogSearching);
    this.#nodes?.root.classList.remove('sc-search-has-value');
    this.#setEmpty(1);
    if (this.#nodes?.status) this.#nodes.status.textContent = '';
    if (refresh) requestAnimationFrame(this.#onRestore);
  }

  #setEmpty(total: number): void {
    const { results, empty } = this.#nodes ?? {};
    if (!results || !empty) return;
    const isEmpty = total === 0;
    results.hidden = !isEmpty;
    empty.hidden = !isEmpty;
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
