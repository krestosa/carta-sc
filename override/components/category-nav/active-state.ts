import { categoryLinks, anchorForHref, CATEGORY_SELECTORS } from './core.js';
import { moveCategoryIndicator } from './indicator.js';

export interface CategoryActiveStateOptions {
  readonly requestCenter: (previous: Element | null, target: Element | null) => void;
  readonly scheduleRail: () => void;
}

export class CategoryActiveState {
  readonly #options: CategoryActiveStateOptions;
  #active: HTMLElement | null = null;

  constructor(options: CategoryActiveStateOptions) {
    this.#options = options;
  }

  get current(): HTMLElement | null {
    return this.#active;
  }

  set(target: HTMLElement | null, animate: boolean): void {
    if (!target) return;
    const previous = this.#active;
    const changed = target !== previous;
    this.#active = target;

    for (const link of categoryLinks()) {
      link.closest<HTMLElement>('.nav-top-li')?.classList.remove('active');
      const on = anchorForHref(link.getAttribute('href')) === target;
      link.classList.toggle('sc-motion-current', on);
      if (on) link.setAttribute('aria-current', 'location');
      else if (link.getAttribute('aria-current') === 'location') link.removeAttribute('aria-current');
    }

    document.querySelectorAll<HTMLAnchorElement>('a.anchorLinkSub.sc-motion-current').forEach((link) => {
      link.classList.remove('sc-motion-current');
      link.removeAttribute('aria-current');
    });

    for (const select of document.querySelectorAll<HTMLSelectElement>('select')) {
      if (!select.matches(CATEGORY_SELECTORS.select)) continue;
      const option = Array.from(select.options).find((candidate) => anchorForHref(candidate.value) === target);
      if (option && select.value !== option.value) select.value = option.value;
    }

    moveCategoryIndicator(target, animate && changed);
    if (changed && previous) this.#options.requestCenter(previous, target);
    else this.#options.scheduleRail();
  }
}
