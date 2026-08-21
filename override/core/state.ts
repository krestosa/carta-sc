import type { RevealGate, ScrollState } from './types.js';

export const scrollState: ScrollState = {
  programmatic: false,
  suppressRevealUntil: 0,
};

class CatalogRevealGate implements RevealGate {
  readonly #root: HTMLElement;
  #headings = false;
  #cards = false;
  #released = false;

  constructor(root: HTMLElement) {
    this.#root = root;
  }

  get headings(): boolean {
    return this.#headings;
  }

  get cards(): boolean {
    return this.#cards;
  }

  get released(): boolean {
    return this.#released;
  }

  mark(part: 'headings' | 'cards'): void {
    if (part === 'headings') this.#headings = true;
    else this.#cards = true;

    if (this.#headings && this.#cards) this.release();
  }

  release(): void {
    if (this.#released) return;
    this.#released = true;
    this.#root.setAttribute('data-sc-catalog-reveal-ready', 'true');
    this.#root.classList.remove('sc-catalog-reveal-prepaint');
  }
}

export const revealGate: RevealGate = new CatalogRevealGate(document.documentElement);
