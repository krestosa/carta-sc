import { motionTokens } from '../../core/variables.js';
import { motion } from '../../motion/main.js';
import { PRODUCT_MODAL_SELECTORS } from './view.js';

const TIMING = {
  open: 220,
  close: 150,
} as const;

const OFFSET = {
  open: 20,
  close: -10,
} as const;

const EASING = {
  open: 'cubic-bezier(0.2,0,0,1)',
  close: 'cubic-bezier(0.3,0,1,1)',
  linear: 'linear',
} as const;

const BACKDROP = {
  clear: 'rgba(0,0,0,0)',
  dimmed: 'rgba(0,0,0,.32)',
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
  const handles = state.handles;
  state.handles = [];
  for (const handle of handles) handle.cancel();
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

function imagePart(dialog: HTMLElement): HTMLElement | null {
  return dialog.querySelector<HTMLElement>('.sc-product-modal__image');
}

function clear(modal: HTMLElement, dialog: HTMLElement): void {
  for (const property of ['background-color', 'visibility', 'will-change']) {
    modal.style.removeProperty(property);
  }
  for (const property of ['transform', 'opacity', 'visibility', 'will-change']) {
    dialog.style.removeProperty(property);
  }

  const stage = imageStagePart(dialog);
  if (stage) {
    stage.style.removeProperty('clip-path');
    stage.style.removeProperty('will-change');
  }

  const image = imagePart(dialog);
  if (image) {
    image.style.removeProperty('transform');
    image.style.removeProperty('will-change');
  }
}

function finishOpen(modal: HTMLElement, dialog: HTMLElement, token: number): void {
  if (!isCurrent(modal, token)) return;
  stop(modal);
  clear(modal, dialog);
}

function imageEntrance(
  dialog: HTMLElement,
  onComplete: () => void,
): CancelableMotion[] {
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
      { duration: TIMING.open, easing: EASING.open },
    ),
    motion.engine.springTransform(
      image,
      { x: 0, scale: 1 },
      motionTokens.springs.focus,
      { clear: true, onComplete },
    ),
  ];
}

function openSequence(modal: HTMLElement, dialog: HTMLElement, token: number): void {
  stop(modal);
  modal.style.visibility = 'visible';
  dialog.style.visibility = 'visible';

  const backdrop = animate(
    modal,
    [
      { backgroundColor: BACKDROP.clear },
      { backgroundColor: BACKDROP.dimmed },
    ],
    { duration: TIMING.open, easing: EASING.linear },
  );
  const surfaceOpacity = animate(
    dialog,
    [{ opacity: 0 }, { opacity: 1 }],
    { duration: TIMING.open, easing: EASING.open },
  );
  const surfacePosition = animate(
    dialog,
    [
      { transform: `translateY(${OFFSET.open}px)` },
      { transform: 'translateY(0)' },
    ],
    { duration: TIMING.open, easing: EASING.open },
  );

  const finish = (): void => finishOpen(modal, dialog, token);
  const imageHandles = imageEntrance(dialog, finish);
  register(modal, [backdrop, surfaceOpacity, surfacePosition, ...imageHandles]);

  if (imageHandles.length === 0) {
    surfacePosition.finished.then(finish).catch(() => undefined);
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

  const backdrop = animate(
    modal,
    [
      { backgroundColor: BACKDROP.dimmed },
      { backgroundColor: BACKDROP.clear },
    ],
    { duration: TIMING.close, easing: EASING.linear },
  );
  const surfaceOpacity = animate(
    dialog,
    [{ opacity: 1 }, { opacity: 0 }],
    { duration: TIMING.close, easing: EASING.close },
  );
  const surfacePosition = animate(
    dialog,
    [
      { transform: 'translateY(0)' },
      { transform: `translateY(${OFFSET.close}px)` },
    ],
    { duration: TIMING.close, easing: EASING.close },
  );

  register(modal, [backdrop, surfaceOpacity, surfacePosition]);
  surfacePosition.finished.then(() => {
    if (!isCurrent(modal, token)) return;
    stateFor(modal).handles = [];
    done?.();
  }).catch(() => undefined);
}
