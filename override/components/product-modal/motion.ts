import { motion } from '../../motion/main.js';
import { motionConfig } from '../../motion/config.js';
import { PRODUCT_MODAL_SELECTORS } from './view.js';

const TIMING = Object.freeze({ open: 220, close: 150 });
const OFFSET = Object.freeze({ open: 20, close: -10 });
const EASING = Object.freeze({
  open: motionConfig.cssEasings.standard,
  close: motionConfig.cssEasings.accelerate,
  linear: motionConfig.cssEasings.linear,
});

interface CancelableMotion { cancel(): void }
interface ModalMotionState { token: number; handles: CancelableMotion[] }
const states = new WeakMap<HTMLElement, ModalMotionState>();

function backdropColor(modal: HTMLElement): string {
  return getComputedStyle(modal).getPropertyValue('--sc-color-scrim').trim() || 'transparent';
}
function stateFor(modal: HTMLElement): ModalMotionState {
  const existing = states.get(modal);
  if (existing) return existing;
  const created: ModalMotionState = { token: 0, handles: [] };
  states.set(modal, created);
  return created;
}
function nextToken(modal: HTMLElement): number { const state = stateFor(modal); state.token += 1; return state.token; }
function isCurrent(modal: HTMLElement, token: number): boolean { return stateFor(modal).token === token; }
function stop(modal: HTMLElement): void {
  const state = stateFor(modal);
  const handles = state.handles;
  state.handles = [];
  for (const handle of handles) handle.cancel();
}
function register(modal: HTMLElement, handles: CancelableMotion[]): void { stateFor(modal).handles = handles; }
function animate(target: Element,keyframes: Keyframe[] | PropertyIndexedKeyframes,options: KeyframeAnimationOptions): Animation {
  return target.animate(keyframes, { ...options, fill: 'both' });
}
function clear(modal: HTMLElement, dialog: HTMLElement): void {
  for (const property of ['background-color', 'visibility', 'will-change']) modal.style.removeProperty(property);
  for (const property of ['transform', 'opacity', 'visibility', 'will-change']) dialog.style.removeProperty(property);
}
function finishOpen(modal: HTMLElement, dialog: HTMLElement, token: number): void {
  if (!isCurrent(modal, token)) return;
  stop(modal);
  clear(modal, dialog);
}
function openSequence(modal: HTMLElement, dialog: HTMLElement, token: number): void {
  stop(modal);
  modal.style.visibility = 'visible';
  dialog.style.visibility = 'visible';
  const dimmed = backdropColor(modal);
  const backdrop = animate(modal,[{ backgroundColor:'transparent' },{ backgroundColor:dimmed }],{ duration:TIMING.open,easing:EASING.linear });
  const surfaceOpacity = animate(dialog,[{ opacity:0 },{ opacity:1 }],{ duration:TIMING.open,easing:EASING.open });
  const surfacePosition = animate(dialog,[{ transform:`translateY(${OFFSET.open}px)` },{ transform:'translateY(0)' }],{ duration:TIMING.open,easing:EASING.open });
  register(modal,[backdrop,surfaceOpacity,surfacePosition]);
  surfacePosition.finished.then(() => finishOpen(modal,dialog,token)).catch(() => undefined);
}
export function cancelModalMotion(modal: HTMLElement | null): void { if (!modal) return; nextToken(modal); stop(modal); }
export function animateModalOpen(modal: HTMLElement | null,_source: HTMLElement | null): void {
  if (!modal) return;
  const dialog = modal.querySelector<HTMLElement>(PRODUCT_MODAL_SELECTORS.dialog);
  if (!dialog) return;
  const token = nextToken(modal);
  if (motion.reduced()) { clear(modal,dialog); return; }
  openSequence(modal,dialog,token);
}
export function animateModalReopen(modal: HTMLElement | null,_source: HTMLElement | null): void {
  if (!modal) return;
  const dialog = modal.querySelector<HTMLElement>(PRODUCT_MODAL_SELECTORS.dialog);
  if (!dialog) return;
  const token = nextToken(modal);
  if (motion.reduced()) { clear(modal,dialog); return; }
  openSequence(modal,dialog,token);
}
export function animateModalClose(modal: HTMLElement | null,done?: () => void): void {
  if (!modal) { done?.(); return; }
  const dialog = modal.querySelector<HTMLElement>(PRODUCT_MODAL_SELECTORS.dialog);
  if (!dialog) { done?.(); return; }
  const token = nextToken(modal);
  if (motion.reduced()) { stop(modal); done?.(); return; }
  stop(modal);
  const dimmed = backdropColor(modal);
  const backdrop = animate(modal,[{ backgroundColor:dimmed },{ backgroundColor:'transparent' }],{ duration:TIMING.close,easing:EASING.linear });
  const surfaceOpacity = animate(dialog,[{ opacity:1 },{ opacity:0 }],{ duration:TIMING.close,easing:EASING.close });
  const surfacePosition = animate(dialog,[{ transform:'translateY(0)' },{ transform:`translateY(${OFFSET.close}px)` }],{ duration:TIMING.close,easing:EASING.close });
  register(modal,[backdrop,surfaceOpacity,surfacePosition]);
  surfacePosition.finished.then(() => { if (!isCurrent(modal,token)) return; stateFor(modal).handles = []; done?.(); }).catch(() => undefined);
}
