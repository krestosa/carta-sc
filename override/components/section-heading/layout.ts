import { selectors } from '../../core/variables.js';

interface HeadingLayoutState {
  originalHtml: string | null;
  lines: HTMLElement[];
}

export const SECTION_RULE_PROPERTY = '--sc-section-rule-scale';

export class SectionHeadingLayout {
  readonly #states = new WeakMap<HTMLElement, HeadingLayoutState>();

  targets(): HTMLElement[] {
    return Array.from(
      document.querySelectorAll<HTMLElement>('.listadoShop .titleShopSeccion > div, .listadoShop .subTitleShopSeccion'),
    ).filter((element) => Boolean(element.textContent?.replace(/\s+/g, ' ').trim()));
  }

  headingUnit(node: Element | null): HTMLElement | null {
    if (!node) return null;
    if (node.matches(selectors.sectionSubtitle)) return node as HTMLElement;
    return node.matches(selectors.sectionTitle)
      ? node.querySelector<HTMLElement>(':scope > div')
      : null;
  }

  hostFor(element: HTMLElement): HTMLElement {
    return this.isSectionTitleChild(element) && element.parentElement ? element.parentElement : element;
  }

  renderable(element: HTMLElement): boolean {
    const host = this.hostFor(element);
    return !host.hidden && host.offsetParent !== null && host.getBoundingClientRect().height > 0;
  }

  capture(element: HTMLElement): void {
    const state = this.#stateFor(element);
    state.originalHtml ??= element.innerHTML;
  }

  prepareHost(element: HTMLElement): void {
    if (!this.isSectionTitleChild(element)) return;
    element.classList.add('sc-section-rule-host');
    element.removeAttribute('aria-label');
    element.style.setProperty(SECTION_RULE_PROPERTY, '0');
  }

  cleanupHost(element: HTMLElement): void {
    element.classList.remove('sc-section-rule-host');
    element.style.removeProperty(SECTION_RULE_PROPERTY);
  }

  lines(element: HTMLElement): readonly HTMLElement[] {
    return this.#stateFor(element).lines;
  }

  splitLines(element: HTMLElement): readonly HTMLElement[] {
    const state = this.#stateFor(element);
    if (state.originalHtml === null) state.originalHtml = element.innerHTML;
    else element.innerHTML = state.originalHtml;

    const content = element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    if (!content) {
      state.lines = [];
      return [element];
    }

    const words = content.split(' ');
    const probe = document.createDocumentFragment();
    const wordNodes = words.map((word, index) => {
      const span = document.createElement('span');
      span.className = 'sc-section-word-probe';
      span.textContent = word;
      span.style.display = 'inline-block';
      span.style.whiteSpace = 'pre';
      probe.append(span);
      if (index < words.length - 1) probe.append(document.createTextNode(' '));
      return span;
    });

    element.textContent = '';
    element.append(probe);

    const groups: string[][] = [];
    let lastTop: number | null = null;
    for (const node of wordNodes) {
      const top = node.getBoundingClientRect().top;
      if (lastTop === null || Math.abs(top - lastTop) > 1) {
        groups.push([]);
        lastTop = top;
      }
      groups.at(-1)?.push(node.textContent ?? '');
    }

    element.textContent = '';
    const fragment = document.createDocumentFragment();
    const lines = groups.map((group) => {
      const mask = document.createElement('span');
      const line = document.createElement('span');
      mask.className = 'sc-section-text-mask';
      line.className = 'sc-section-text-line';
      line.textContent = group.join(' ');
      mask.append(line);
      fragment.append(mask);
      return line;
    });
    element.append(fragment);
    state.lines = lines;
    return lines;
  }

  restore(element: HTMLElement): void {
    const state = this.#stateFor(element);
    if (state.originalHtml !== null) element.innerHTML = state.originalHtml;
    state.lines = [];
  }

  clearLineStyles(element: HTMLElement): void {
    for (const line of this.#stateFor(element).lines) {
      line.style.removeProperty('transform');
      line.style.removeProperty('opacity');
      line.style.removeProperty('visibility');
      line.style.removeProperty('will-change');
    }
    if (this.isSectionTitleChild(element)) element.style.removeProperty(SECTION_RULE_PROPERTY);
  }

  isSectionTitleChild(element: HTMLElement): boolean {
    return Boolean(element.parentElement?.classList.contains(selectors.sectionTitle.slice(1)));
  }

  #stateFor(element: HTMLElement): HeadingLayoutState {
    const existing = this.#states.get(element);
    if (existing) return existing;
    const created: HeadingLayoutState = { originalHtml: null, lines: [] };
    this.#states.set(element, created);
    return created;
  }
}
