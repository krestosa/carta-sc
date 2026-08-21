import { motion } from '../../motion/main.js';
import type { MotionHandle } from '../../motion/types.js';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const MENU_ICON = 'M3 16H21V18H3V16Z M3 11H21V13H3V11Z M3 6H21V8H3V6Z';
const CLOSE_ICON = 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z';

export class MobileMenuIconController {
  readonly #motion = new WeakMap<SVGPathElement, MotionHandle>();

  sync(button: HTMLElement, open: boolean): void {
    const path = this.#ensure(button);
    if (!path) return;

    const state = open ? 'close' : 'menu';
    const shape = open ? CLOSE_ICON : MENU_ICON;
    const previous = path.dataset.scIconState;

    this.#motion.get(path)?.cancel();
    this.#motion.delete(path);
    if (previous && previous !== state) {
      const ran = motion.runLoaded(({ engine }) => {
        const handle = engine.path(path, shape, {
          duration: 0.24,
          ease: 'cubic.inOut',
          onComplete: () => this.#motion.delete(path),
        });
        this.#motion.set(path, handle);
      });
      if (!ran) path.setAttribute('d', shape);
    } else {
      path.setAttribute('d', shape);
    }
    path.dataset.scIconState = state;
  }

  #ensure(button: HTMLElement): SVGPathElement | null {
    let host = button.querySelector<HTMLElement>('.slicknav_icon');
    if (!host) {
      host = document.createElement('span');
      host.className = 'slicknav_icon';
      button.append(host);
    }

    const existing = host.querySelector<SVGPathElement>('[data-sc-mobile-menu-icon-path]');
    if (existing) return existing;

    host.textContent = '';
    const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
    svg.setAttribute('class', 'sc-mobile-menu-state-icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');

    const path = document.createElementNS(SVG_NAMESPACE, 'path');
    path.setAttribute('data-sc-mobile-menu-icon-path', '');
    path.setAttribute('d', MENU_ICON);
    svg.append(path);
    host.append(svg);
    return path;
  }
}
