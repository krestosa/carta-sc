import { moveRailTo } from './rail-motion.js';

function activeLink(scroller: HTMLElement): HTMLAnchorElement | null {
  return scroller.querySelector<HTMLAnchorElement>('a.anchorLink.sc-motion-current,a.anchorLink[aria-current="location"]');
}

function centeredOffset(scroller: HTMLElement, active: HTMLElement): number {
  const scrollerRect = scroller.getBoundingClientRect();
  const activeRect = active.getBoundingClientRect();
  const tabOffset = scroller.scrollLeft + activeRect.left - scrollerRect.left;
  return tabOffset - (scroller.clientWidth / 2 - activeRect.width / 2);
}

function positionActive(scroller: HTMLElement): void {
  const active = activeLink(scroller);
  if (!active) return;
  moveRailTo(scroller, centeredOffset(scroller, active));
}

export function centerActiveCategory(scroller: HTMLElement): void {
  positionActive(scroller);
}

export function revealActiveCategory(
  scroller: HTMLElement,
  _previous: Element | null,
  _target: Element | null,
): void {
  positionActive(scroller);
}
