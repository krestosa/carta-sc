import { lockBackground, type BackgroundLock } from './a11y.js';
import { animateModalOpen, animateModalReopen, cancelModalMotion } from './motion.js';
import { buildProductModal, PRODUCT_MODAL_SELECTORS } from './view.js';

export interface ProductModalSession {
  readonly modal: HTMLElement;
  readonly link: HTMLElement;
  readonly restoreFocus: HTMLElement | null;
  readonly background: BackgroundLock;
}

export function focusModalElement(node: HTMLElement | null): void {
  if (!node || !document.documentElement.contains(node)) return;
  try {
    node.focus({ preventScroll: true });
  } catch {
    node.focus();
  }
}

export function createProductModalSession(link: HTMLElement): ProductModalSession | null {
  const modal = buildProductModal(link);
  if (!modal) return null;

  document.body.append(modal);
  document.body.classList.add('sc-product-modal-open');
  const session: ProductModalSession = {
    modal,
    link,
    restoreFocus: link,
    background: lockBackground(modal),
  };
  focusModalElement(modal.querySelector<HTMLElement>(PRODUCT_MODAL_SELECTORS.close));
  return session;
}

export function revealProductModalSession(session: ProductModalSession): void {
  session.modal.classList.add('is-visible');
  animateModalOpen(session.modal, session.link);
}

export function reopenProductModalSession(session: ProductModalSession): void {
  document.body.classList.add('sc-product-modal-open');
  session.modal.classList.add('is-visible');
  animateModalReopen(session.modal, session.link);
  focusModalElement(session.modal.querySelector<HTMLElement>(PRODUCT_MODAL_SELECTORS.close));
}

export function removeProductModalSession(session: ProductModalSession, restoreFocus: boolean): void {
  cancelModalMotion(session.modal);
  session.modal.remove();
  document.body.classList.remove('sc-product-modal-open');
  session.background.release();
  if (restoreFocus) focusModalElement(session.restoreFocus);
}
