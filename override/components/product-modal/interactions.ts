import { selectors } from '../../core/variables.js';
import { containFocus, trapTab } from './a11y.js';
import { PRODUCT_MODAL_SELECTORS } from './view.js';

export interface ProductModalInteractionHost {
  readonly activeModal: HTMLElement | null;
  open(link: HTMLElement): void;
  close(): void;
}

export class ProductModalInteractions {
  readonly #host: ProductModalInteractionHost;
  #bound = false;

  constructor(host: ProductModalInteractionHost) {
    this.#host = host;
  }

  bind(): void {
    if (this.#bound) return;
    this.#bound = true;
    document.addEventListener('click', this.#onClick, true);
    document.addEventListener('mousedown', this.#onMouseDown, true);
    document.addEventListener('keydown', this.#onKeyDown, true);
    document.addEventListener('focusin', this.#onFocusIn);
  }

  unbind(): void {
    if (!this.#bound) return;
    this.#bound = false;
    document.removeEventListener('click', this.#onClick, true);
    document.removeEventListener('mousedown', this.#onMouseDown, true);
    document.removeEventListener('keydown', this.#onKeyDown, true);
    document.removeEventListener('focusin', this.#onFocusIn);
  }

  #target(event: Event): Element | null {
    return event.target instanceof Element ? event.target : null;
  }

  #onClick = (event: MouseEvent): void => {
    const target = this.#target(event);
    const activeModal = this.#host.activeModal;
    const close = target?.closest<HTMLElement>(PRODUCT_MODAL_SELECTORS.close);
    if (close && activeModal?.contains(close)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      this.#host.close();
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
    this.#host.open(link);
  };

  #onMouseDown = (event: MouseEvent): void => {
    const activeModal = this.#host.activeModal;
    if (!activeModal || event.target !== activeModal) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.#host.close();
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    const activeModal = this.#host.activeModal;
    if (!activeModal) return;

    if (event.key === 'Escape' || event.key === 'Esc') {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      this.#host.close();
      return;
    }

    if (event.key === 'Tab') trapTab(activeModal, event, PRODUCT_MODAL_SELECTORS.dialog);
  };

  #onFocusIn = (event: FocusEvent): void => {
    containFocus(this.#host.activeModal, event, PRODUCT_MODAL_SELECTORS.dialog);
  };
}
