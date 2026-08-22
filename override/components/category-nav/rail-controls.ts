import { cloneTemplate } from '../../templates/registry.js';
import { moveRailBy } from './rail-motion.js';

type RailDirection = 'left' | 'right';
type RailButtonState = 'enabled' | 'disabled' | 'hidden';

const RAIL_STEP_MIN = 140;
const RAIL_STEP_RATIO = 0.65;
const buttonCache = new WeakMap<HTMLElement, Map<RailDirection, HTMLButtonElement>>();
const buttonStates = new WeakMap<HTMLButtonElement, RailButtonState>();

function cacheFor(host: HTMLElement): Map<RailDirection, HTMLButtonElement> {
  const existing = buttonCache.get(host);
  if (existing) return existing;
  const cache = new Map<RailDirection, HTMLButtonElement>();
  buttonCache.set(host, cache);
  return cache;
}

function arrow(host: HTMLElement, scroller: HTMLElement, direction: RailDirection, onScroll: () => void): HTMLButtonElement {
  const cache = cacheFor(host);
  const cached = cache.get(direction);
  if (cached && host.contains(cached)) return cached;

  const existing = host.querySelector<HTMLButtonElement>(`.sc-rail-arrow--${direction}`);
  if (existing) {
    cache.set(direction, existing);
    return existing;
  }

  const button = cloneTemplate<HTMLButtonElement>(`category-arrow-${direction}`);
  button.addEventListener('click', () => {
    const step = Math.max(RAIL_STEP_MIN, Math.round(scroller.clientWidth * RAIL_STEP_RATIO)) * (direction === 'left' ? -1 : 1);
    moveRailBy(scroller, step, onScroll);
  });
  host.append(button);
  cache.set(direction, button);
  return button;
}

function setButtonState(button: HTMLButtonElement, canScroll: boolean): void {
  const state: RailButtonState = canScroll ? 'enabled' : 'disabled';
  if (buttonStates.get(button) === state) return;
  buttonStates.set(button, state);
  button.style.setProperty('opacity', '1', 'important');
  button.style.setProperty('visibility', 'visible', 'important');
  button.style.setProperty('pointer-events', 'auto', 'important');
  button.disabled = !canScroll;
  button.setAttribute('aria-disabled', String(!canScroll));
}

function hideButton(button: HTMLButtonElement): void {
  if (buttonStates.get(button) === 'hidden') return;
  buttonStates.set(button, 'hidden');
  button.style.setProperty('opacity', '0', 'important');
  button.style.setProperty('visibility', 'hidden', 'important');
  button.style.setProperty('pointer-events', 'none', 'important');
  button.disabled = true;
  button.setAttribute('aria-disabled', 'true');
}

export function syncRailOverflow(host: HTMLElement | null, scroller: HTMLElement | null, onScroll: () => void): void {
  if (!host || !scroller) return;
  const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  const left = max > 1 && scroller.scrollLeft > 1;
  const right = max > 1 && scroller.scrollLeft < max - 1;
  host.classList.toggle('sc-overflow-left', left);
  host.classList.toggle('sc-overflow-right', right);
  setButtonState(arrow(host, scroller, 'left', onScroll), left);
  setButtonState(arrow(host, scroller, 'right', onScroll), right);
}

export function hideRailOverflow(host: HTMLElement | null): void {
  if (!host) return;
  host.classList.remove('sc-overflow-left', 'sc-overflow-right');
  host.querySelectorAll<HTMLButtonElement>('.sc-rail-arrow').forEach(hideButton);
}
