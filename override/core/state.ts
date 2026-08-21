import type { RevealGate, ScrollState } from './types.js';

export const scrollState: ScrollState = {
  programmatic: false,
  suppressRevealUntil: 0,
};

export const revealGate: RevealGate = (() => {
  const root = document.documentElement;
  let headings = false;
  let cards = false;
  let released = false;

  const release = (): void => {
    if (released) return;
    released = true;
    root.setAttribute('data-sc-catalog-reveal-ready', 'true');
    root.classList.remove('sc-catalog-reveal-prepaint');
  };

  const mark = (part: 'headings' | 'cards'): void => {
    if (part === 'headings') headings = true;
    else cards = true;
    if (headings && cards) release();
  };

  return {
    get headings() { return headings; },
    get cards() { return cards; },
    get released() { return released; },
    mark,
    release,
  };
})();
