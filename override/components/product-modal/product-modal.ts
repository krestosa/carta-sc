import { selectors } from '../../core/variables.js';
import { containFocus, lockBackground, trapTab, type BackgroundLock } from './a11y.js';
import { animateModalClose, animateModalOpen, animateModalReopen, cancelModalMotion } from './motion.js';
import { buildProductModal, PRODUCT_MODAL_SELECTORS } from './view.js';

interface ModalSession {
  readonly modal: HTMLElement;
  readonly link: HTMLElement;
  readonly restoreFocus: HTMLElement | null;
  readonly background: BackgroundLock;
}

class ProductModalController {
  #active: ModalSession | null = null;
  #closing: ModalSession | null = null;
  #openFrame = 0;
  #initialized = false;

  initialize(): () => void {
    if (this.#initialized) return this.destroy;
    this.#initialized = true;
    document.addEventListener('click', this.#onClick, true);
    document.addEventListener('mousedown', this.#onMouseDown, true);
    document.addEventListener('keydown', this.#onKeyDown, true);
    document.addEventListener('focusin', this.#onFocusIn);
    return this.destroy;
  }

  destroy = (): void => {
    if (this.#initialized) {
      this.#initialized = false;
      document.removeEventListener('click', this.#onClick, true);
      document.removeEventListener('mousedown', this.#onMouseDown, true);
      document.removeEventListener('keydown', this.#onKeyDown, true);
      document.removeEventListener('focusin', this.#onFocusIn);
    }

    this.#cancelOpenFrame();
    const session = this.#active ?? this.#closing;
    this.#active = null;
    this.#closing = null;
    if (session) this.#removeSession(session, true);
    else document.body?.classList.remove('sc-product-modal-open');
  };

  open(link: HTMLElement): void {
    if (this.#active) return;
    if (this.#closing) {
      if (this.#resumeClosing(link)) return;
      const stale = this.#closing;
      this.#closing = null;
      this.#removeSession(stale, false);
    }

    const modal = buildProductModal(link);
    if (!modal) return;

    document.body.append(modal);
    document.body.classList.add('sc-product-modal-open');
    this.#active = {
      modal,
      link,
      restoreFocus: link,
      background: lockBackground(modal),
    };
    this.#focus(modal.querySelector<HTMLElement>(PRODUCT_MODAL_SELECTORS.close));

    this.#cancelOpenFrame();
    this.#openFrame = requestAnimationFrame(() => {
      this.#openFrame = 0;
      if (this.#active?.modal !== modal) return;
      modal.classList.add('is-visible');
      animateModalOpen(modal, link);
    });
  }

  close(event?: Event): void {
    event?.preventDefault();
    if (!this.#active) return;

    this.#cancelOpenFrame();
    const session = this.#active;
    this.#active = null;
    this.#closing = session;
    animateModalClose(session.modal, () => this.#finishClosing(session, true));
  }

  get activeModal(): HTMLElement | null {
    return this.#active?.modal ?? null;
  }

  get isClosing(): boolean {
    return this.#closing !== null;
  }

  #focus(node: HTMLElement | null): void {
    if (!node || !document.documentElement.contains(node)) return;
    try {
      node.focus({ preventScroll: true });
    } catch {
      node.focus();
    }
  }

  #cancelOpenFrame(): void {
    if (!this.#openFrame) return;
    cancelAnimationFrame(this.#openFrame);
    this.#openFrame = 0;
  }

  #removeSession(session: ModalSession, restoreFocus: boolean): void {
    cancelModalMotion(session.modal);
    session.modal.remove();
    document.body.classList.remove('sc-product-modal-open');
    session.background.release();
    if (restoreFocus) this.#focus(session.restoreFocus);
  }

  #finishClosing(session: ModalSession, restoreFocus: boolean): void {
    if (this.#closing !== session) return;
    this.#closing = null;
    this.#removeSession(session, restoreFocus);
  }

  #resumeClosing(link: HTMLElement): boolean {
    if (!this.#closing || this.#closing.link !== link) return false;
    this.#active = this.#closing;
    this.#closing = null;
    document.body.classList.add('sc-product-modal-open');
    this.#active.modal.classList.add('is-visible');
    animateModalReopen(this.#active.modal, link);
    this.#focus(this.#active.modal.querySelector<HTMLElement>(PRODUCT_MODAL_SELECTORS.close));
    return true;
  }

  #target(event: Event): Element | null {
    return event.target instanceof Element ? event.target : null;
  }

  #onClick = (event: MouseEvent): void => {
    const target = this.#target(event);
    const close = target?.closest<HTMLElement>(PRODUCT_MODAL_SELECTORS.close);
    if (close && this.#active?.modal.contains(close)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      this.close();
      return;
    }

    const link = target?.closest<HTMLElement>(selectors.productLink);
    if (!link) return;
    if ((event.button && event.button !== 0)
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (!this.#resumeClosing(link)) this.open(link);
  };

  #onMouseDown = (event: MouseEvent): void => {
    if (!this.#active || event.target !== this.#active.modal) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.close();
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    if (!this.#active) return;
    if (event.key === 'Escape' || event.key === 'Esc') {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      this.close();
    } else if (event.key === 'Tab') {
      trapTab(this.#active.modal, event, PRODUCT_MODAL_SELECTORS.dialog);
    }
  };

  #onFocusIn = (event: FocusEvent): void => {
    containFocus(this.#active?.modal ?? null, event, PRODUCT_MODAL_SELECTORS.dialog);
  };
}

const productModal = new ProductModalController();

export function closeProductModal(event?: Event): void {
  productModal.close(event);
}

export function openProductModal(link: HTMLElement): void {
  productModal.open(link);
}

export function initializeProductModal(): () => void {
  return productModal.initialize();
}

export function destroyProductModal(): void {
  productModal.destroy();
}

export function getActiveProductModal(): HTMLElement | null {
  return productModal.activeModal;
}

export function isProductModalClosing(): boolean {
  return productModal.isClosing;
}
