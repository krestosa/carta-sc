import { queries } from '../../core/variables.js';
import { anchorForHref, categoryLinks } from './core.js';

const CENTER_RATIO = 0.5;
const DESKTOP_FORWARD_RATIO = 0.32;
const DESKTOP_BACKWARD_RATIO = 0.68;

function activeLink(scroller: HTMLElement): HTMLAnchorElement | null {
  return scroller.querySelector<HTMLAnchorElement>('a.anchorLink.sc-motion-current,a.anchorLink[aria-current="location"]');
}

function clampScrollLeft(value: number, scroller: HTMLElement): number {
  const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  return Math.max(0, Math.min(max, value));
}

function scrollToX(scroller: HTMLElement, value: number): void {
  const left = clampScrollLeft(value, scroller);
  if (Math.abs(left - scroller.scrollLeft) < 1) return;
  try {
    scroller.scrollTo({ left, top: 0, behavior: queries.reducedMotion.matches ? 'auto' : 'smooth' });
  } catch {
    scroller.scrollLeft = left;
  }
}

function positionActive(scroller: HTMLElement, ratio: number): void {
  const active = activeLink(scroller);
  if (!active) return;
  const scrollerRect = scroller.getBoundingClientRect();
  const activeRect = active.getBoundingClientRect();
  scrollToX(scroller, scroller.scrollLeft + activeRect.left + activeRect.width / 2 - (scrollerRect.left + scrollerRect.width * ratio));
}

function targetIndex(scroller: HTMLElement, target: Element | null): number {
  if (!target) return -1;
  return categoryLinks(scroller).findIndex((link) => anchorForHref(link.getAttribute('href')) === target);
}

export function centerActiveCategory(scroller: HTMLElement): void {
  positionActive(scroller, CENTER_RATIO);
}

export function revealActiveCategory(scroller: HTMLElement, previous: Element | null, target: Element | null): void {
  const from = targetIndex(scroller, previous);
  const to = targetIndex(scroller, target);
  const ratio = to >= 0 && from >= 0 && to < from ? DESKTOP_BACKWARD_RATIO : DESKTOP_FORWARD_RATIO;
  positionActive(scroller, ratio);
}
