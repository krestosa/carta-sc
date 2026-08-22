import { animateModalClose } from './motion.js';
import { ProductModalInteractions } from './interactions.js';
import {
  createProductModalSession,
  removeProductModalSession,
  reopenProductModalSession,
  revealProductModalSession,
  type ProductModalSession,
} from './session.js';

export class ProductModalController {
  #active: ProductModalSession | null = null;
  #closing: ProductModalSession | null = null;
  #openFrame = 0;
  #initialized = false;
  readonly #interactions = new ProductModalInteractions(this);

  initialize(): () => void {
    if (this.#initialized) return this.destroy;
    this.#initialized = true;
    this.#interactions.bind();
    return this.destroy;
  }

  destroy = (): void => {
    if (this.#initialized) {
      this.#initialized = false;
      this.#interactions.unbind();
    }

    this.#cancelOpenFrame();
    const session = this.#active ?? this.#closing;
    this.#active = null;
    this.#closing = null;
    if (session) removeProductModalSession(session, true);
    else document.body?.classList.remove('sc-product-modal-open');
  };

  open(link: HTMLElement): void {
    if (this.#active) return;
    if (this.#closing) {
      if (this.#resumeClosing(link)) return;
      const stale = this.#closing;
      this.#closing = null;
      removeProductModalSession(stale, false);
    }

    const session = createProductModalSession(link);
    if (!session) return;
    this.#active = session;

    this.#cancelOpenFrame();
    this.#openFrame = requestAnimationFrame(() => {
      this.#openFrame = 0;
      if (this.#active !== session) return;
      revealProductModalSession(session);
    });
  }

  close(): void {
    if (!this.#active) return;
    this.#cancelOpenFrame();

    const session = this.#active;
    this.#active = null;
    this.#closing = session;
    animateModalClose(session.modal, () => this.#finishClosing(session));
  }

  get activeModal(): HTMLElement | null {
    return this.#active?.modal ?? null;
  }

  get isClosing(): boolean {
    return this.#closing !== null;
  }

  #cancelOpenFrame(): void {
    if (!this.#openFrame) return;
    cancelAnimationFrame(this.#openFrame);
    this.#openFrame = 0;
  }

  #finishClosing(session: ProductModalSession): void {
    if (this.#closing !== session) return;
    this.#closing = null;
    removeProductModalSession(session, true);
  }

  #resumeClosing(link: HTMLElement): boolean {
    const session = this.#closing;
    if (!session || session.link !== link) return false;
    this.#closing = null;
    this.#active = session;
    reopenProductModalSession(session);
    return true;
  }
}
