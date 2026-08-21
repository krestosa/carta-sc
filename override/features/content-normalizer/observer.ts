import { selectors } from '../../core/variables.js';
import { collectContentHosts, CONTENT_HOST_SELECTOR, normalizeContentHost } from './dom.js';

export class ContentMutationObserver {
  #observer: MutationObserver | null = null;
  #frame = 0;
  readonly #pending = new Set<Element>();

  observe(): void {
    this.disconnect();
    const root = document.querySelector(selectors.container) ?? document.body;
    if (!root) return;

    this.#observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        this.#collectContainingHost(mutation.target);
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) collectContentHosts(node, this.#pending);
        }
      }
      if (this.#pending.size) this.#schedule();
    });
    this.#observer.observe(root, { subtree: true, childList: true, characterData: true });
  }

  disconnect(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    if (this.#frame) cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#pending.clear();
  }

  #collectContainingHost(node: Node): void {
    const element = node instanceof Element ? node : node.parentElement;
    const host = element?.closest(CONTENT_HOST_SELECTOR);
    if (host) this.#pending.add(host);
  }

  #schedule(): void {
    if (this.#frame) return;
    this.#frame = requestAnimationFrame(() => this.#flush());
  }

  #flush(): void {
    this.#frame = 0;
    const hosts = [...this.#pending];
    this.#pending.clear();
    hosts.forEach(normalizeContentHost);
    this.#observer?.takeRecords();
  }
}
