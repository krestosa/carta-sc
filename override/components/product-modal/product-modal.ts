import { selectors } from '../../core/variables.js';
import { containFocus, lockBackground, trapTab, type BackgroundLock } from './a11y.js';
import { animateModalClose, animateModalOpen, animateModalReopen, cancelModalMotion } from './motion.js';
import { buildProductModal, PRODUCT_MODAL_SELECTORS } from './view.js';

interface ModalSession {
  modal: HTMLElement;
  link: HTMLElement;
  restoreFocus: HTMLElement | null;
  background: BackgroundLock;
}

let active: ModalSession | null = null;
let closing: ModalSession | null = null;
let openFrame = 0;
let initialized = false;

function focus(node: HTMLElement | null): void {
  if (!node || !document.documentElement.contains(node)) return;
  try {
    node.focus({ preventScroll: true });
  } catch {
    node.focus();
  }
}

function cancelOpenFrame(): void {
  if (!openFrame) return;
  cancelAnimationFrame(openFrame);
  openFrame = 0;
}

function removeSession(session: ModalSession, restoreFocus: boolean): void {
  cancelModalMotion(session.modal);
  session.modal.remove();
  document.body.classList.remove('sc-product-modal-open');
  session.background.release();
  if (restoreFocus) focus(session.restoreFocus);
}

function finishClosing(session: ModalSession, restoreFocus: boolean): void {
  if (closing !== session) return;
  closing = null;
  removeSession(session, restoreFocus);
}

function resumeClosingModal(link: HTMLElement): boolean {
  if (!closing || closing.link !== link) return false;
  active = closing;
  closing = null;
  document.body.classList.add('sc-product-modal-open');
  active.modal.classList.add('is-visible');
  animateModalReopen(active.modal, link);
  focus(active.modal.querySelector<HTMLElement>(PRODUCT_MODAL_SELECTORS.close));
  return true;
}

export function closeProductModal(event?: Event): void {
  event?.preventDefault();
  if (!active) return;

  cancelOpenFrame();
  const session = active;
  active = null;
  closing = session;
  animateModalClose(session.modal, () => finishClosing(session, true));
}

export function openProductModal(link: HTMLElement): void {
  if (active) return;
  if (closing) {
    if (resumeClosingModal(link)) return;
    const stale = closing;
    closing = null;
    removeSession(stale, false);
  }

  const modal = buildProductModal(link);
  if (!modal) return;

  document.body.append(modal);
  document.body.classList.add('sc-product-modal-open');
  active = {
    modal,
    link,
    restoreFocus: link,
    background: lockBackground(modal),
  };
  focus(modal.querySelector<HTMLElement>(PRODUCT_MODAL_SELECTORS.close));

  cancelOpenFrame();
  openFrame = requestAnimationFrame(() => {
    openFrame = 0;
    if (active?.modal !== modal) return;
    modal.classList.add('is-visible');
    animateModalOpen(modal, link);
  });
}

function targetElement(event: Event): Element | null {
  return event.target instanceof Element ? event.target : null;
}

function onClick(event: MouseEvent): void {
  const target = targetElement(event);
  const close = target?.closest<HTMLElement>(PRODUCT_MODAL_SELECTORS.close);
  if (close && active?.modal.contains(close)) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    closeProductModal();
    return;
  }

  const link = target?.closest<HTMLElement>(selectors.productLink);
  if (!link) return;
  if ((event.button && event.button !== 0) || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  if (!resumeClosingModal(link)) openProductModal(link);
}

function onMouseDown(event: MouseEvent): void {
  if (!active || event.target !== active.modal) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  closeProductModal();
}

function onKeyDown(event: KeyboardEvent): void {
  if (!active) return;
  if (event.key === 'Escape' || event.key === 'Esc') {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    closeProductModal();
  } else if (event.key === 'Tab') {
    trapTab(active.modal, event, PRODUCT_MODAL_SELECTORS.dialog);
  }
}

function onFocusIn(event: FocusEvent): void {
  containFocus(active?.modal ?? null, event, PRODUCT_MODAL_SELECTORS.dialog);
}

export function initializeProductModal(): () => void {
  if (initialized) return destroyProductModal;
  initialized = true;
  document.addEventListener('click', onClick, true);
  document.addEventListener('mousedown', onMouseDown, true);
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('focusin', onFocusIn);
  return destroyProductModal;
}

export function destroyProductModal(): void {
  if (initialized) {
    initialized = false;
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('mousedown', onMouseDown, true);
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('focusin', onFocusIn);
  }

  cancelOpenFrame();
  const session = active ?? closing;
  active = null;
  closing = null;
  if (session) removeSession(session, true);
  else document.body?.classList.remove('sc-product-modal-open');
}

export function getActiveProductModal(): HTMLElement | null {
  return active?.modal ?? null;
}

export function isProductModalClosing(): boolean {
  return closing !== null;
}

