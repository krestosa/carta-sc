import { motionTokens } from '../../core/variables.js';
import { motion } from '../../motion/main.js';
import type { MotionHandle } from '../../motion/types.js';
import { PRODUCT_MODAL_SELECTORS } from './view.js';

const EASING = {
  open: 'cubic-bezier(.3,0,0,1)',
  close: 'cubic-bezier(.3,0,.8,.15)',
  linear: 'linear',
} as const;

interface CancelableMotion {
  cancel(): void;
}

interface ModalMotionState {
  token: number;
  handles: CancelableMotion[];
}

const states = new WeakMap<HTMLElement, ModalMotionState>();

function stateFor(modal: HTMLElement): ModalMotionState {
  const existing = states.get(modal);
  if (existing) return existing;
  const created: ModalMotionState = { token: 0, handles: [] };
  states.set(modal, created);
  return created;
}

function nextToken(modal: HTMLElement): number {
  const state = stateFor(modal);
  state.token += 1;
  return state.token;
}

function isCurrent(modal: HTMLElement, token: number): boolean {
  return stateFor(modal).token === token;
}

function stop(modal: HTMLElement): void {
  const state = stateFor(modal);
  for (const handle of state.handles) handle.cancel();
  state.handles = [];
}

function register(modal: HTMLElement, handles: CancelableMotion[]): void {
  stateFor(modal).handles = handles;
}

function animate(
  target: Element,
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  options: KeyframeAnimationOptions,
): Animation {
  return target.animate(keyframes, { ...options, fill: 'both' });
}

function imageStagePart(dialog: HTMLElement): HTMLElement | null {
  return dialog.querySelector<HTMLElement>('.sc-product-modal__image-stage');
}

function visualParts(dialog: HTMLElement): HTMLElement[] {
  return [
    imageStagePart(dialog),
    dialog.querySelector<HTMLElement>('.sc-product-modal__title'),
    dialog.querySelector<HTMLElement>('.sc-product-modal__description'),
  ].filter((node): node is HTMLElement => Boolean(node));
}

function actionPart(dialog: HTMLElement): HTMLElement | null {
  return dialog.querySelector<HTMLElement>('.sc-product-modal__footer');
}

function imagePart(dialog: HTMLElement): HTMLElement | null {
  return dialog.querySelector<HTMLElement>('.sc-product-modal__image');
}

function clear(modal: HTMLElement, dialog: HTMLElement): void {
  for (const property of ['opacity', 'visibility', 'will-change']) modal.style.removeProperty(property);
  for (const property of ['transform', 'opacity', 'visibility', 'will-change', 'clip-path']) {
    dialog.style.removeProperty(property);
  }
  for (const node of [...visualParts(dialog), actionPart(dialog), imagePart(dialog)]) {
    if (!node) continue;
    node.style.removeProperty('opacity');
    node.style.removeProperty('transform');
    node.style.removeProperty('clip-path');
    node.style.removeProperty('will-change');
  }
}

function finishOpen(modal: HTMLElement, dialog: HTMLElement, token: number): void {
  if (!isCurrent(modal, token)) return;
  stateFor(modal).handles = [];
  clear(modal, dialog);
}

function imageEntrance(dialog: HTMLElement): CancelableMotion[] {
  const stage = imageStagePart(dialog);
  const image = imagePart(dialog);
  if (!stage || !image) return [];

  stage.style.willChange = 'clip-path';
  image.style.willChange = 'transform';
  image.style.transform = 'translate3d(-42px,0,0) scale(1.08)';

  return [
    animate(
      stage,
      [
        { clipPath: 'inset(0 18% 0 18% round 28px)' },
        { clipPath: 'inset(0 0 0 0 round 28px)' },
      ],
      { duration: 500, easing: EASING.open },
    ),
    motion.engine.springTransform(
      image,
      { x: 0, scale: 1 },
      motionTokens.springs.focus,
      { clear: true },
    ),
  ];
}

function openSequence(modal: HTMLElement, dialog: HTMLElement, token: number): void {
  stop(modal);
  modal.style.visibility = 'visible';
  dialog.style.visibility = 'visible';

  const handles: CancelableMotion[] = [
    animate(modal, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, easing: EASING.linear }),
    animate(dialog, [{ transform: 'translateY(-50px)' }, { transform: 'translateY(0)' }], {
      duration: 500,
      easing: EASING.open,
    }),
    animate(dialog, [{ clipPath: 'inset(0 0 65% 0 round 28px)' }, { clipPath: 'inset(0 0 0 0 round 28px)' }], {
      duration: 500,
      easing: EASING.open,
    }),
    animate(dialog, [{ opacity: 0 }, { opacity: 1 }], { duration: 50, easing: EASING.linear }),
  ];

  for (const node of visualParts(dialog)) {
    handles.push(animate(node, [
      { opacity: 0 },
      { opacity: 0, offset: 0.2 },
      { opacity: 1 },
    ], { duration: 250, easing: EASING.linear }));
  }

  const actions = actionPart(dialog);
  if (actions) {
    handles.push(animate(actions, [
      { opacity: 0 },
      { opacity: 0, offset: 0.5 },
      { opacity: 1 },
    ], { duration: 300, easing: EASING.linear }));
  }

  handles.push(...imageEntrance(dialog));

  register(modal, handles);
  const primary = handles[1];
  if (primary instanceof Animation) {
    primary.finished.then(() => finishOpen(modal, dialog, token)).catch(() => undefined);
  }
}

export function cancelModalMotion(modal: HTMLElement | null): void {
  if (!modal) return;
  nextToken(modal);
  stop(modal);
}

export function animateModalOpen(modal: HTMLElement | null, _source: HTMLElement | null): void {
  if (!modal) return;
  const dialog = modal.querySelector<HTMLElement>(PRODUCT_MODAL_SELECTORS.dialog);
  if (!dialog) return;
  const token = nextToken(modal);

  if (motion.reduced()) {
    clear(modal, dialog);
    return;
  }

  openSequence(modal, dialog, token);
}

export function animateModalReopen(modal: HTMLElement | null, _source: HTMLElement | null): void {
  if (!modal) return;
  const dialog = modal.querySelector<HTMLElement>(PRODUCT_MODAL_SELECTORS.dialog);
  if (!dialog) return;
  const token = nextToken(modal);

  if (motion.reduced()) {
    clear(modal, dialog);
    return;
  }

  openSequence(modal, dialog, token);
}

export function animateModalClose(modal: HTMLElement | null, done?: () => void): void {
  if (!modal) {
    done?.();
    return;
  }

  const dialog = modal.querySelector<HTMLElement>(PRODUCT_MODAL_SELECTORS.dialog);
  if (!dialog) {
    done?.();
    return;
  }

  const token = nextToken(modal);
  if (motion.reduced()) {
    stop(modal);
    done?.();
    return;
  }

  stop(modal);
  const handles: CancelableMotion[] = [
    animate(modal, [{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: EASING.linear }),
    animate(dialog, [{ transform: 'translateY(0)' }, { transform: 'translateY(-50px)' }], {
      duration: 150,
      easing: EASING.close,
    }),
    animate(dialog, [{ clipPath: 'inset(0 0 0 0 round 28px)' }, { clipPath: 'inset(0 0 65% 0 round 28px)' }], {
      duration: 150,
      easing: EASING.close,
    }),
    animate(dialog, [{ opacity: 1 }, { opacity: 0 }], {
      delay: 100,
      duration: 50,
      easing: EASING.linear,
    }),
  ];

  for (const node of visualParts(dialog)) {
    handles.push(animate(node, [{ opacity: 1 }, { opacity: 0 }], {
      duration: 100,
      easing: EASING.linear,
    }));
  }

  const actions = actionPart(dialog);
  if (actions) {
    handles.push(animate(actions, [{ opacity: 1 }, { opacity: 0 }], {
      duration: 100,
      easing: EASING.linear,
    }));
  }

  register(modal, handles);
  const primary = handles[1];
  if (primary instanceof Animation) {
    primary.finished.then(() => {
      if (!isCurrent(modal, token)) return;
      stateFor(modal).handles = [];
      done?.();
    }).catch(() => undefined);
  }
}
