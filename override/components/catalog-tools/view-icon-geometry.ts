import { queries } from '../../core/variables.js';
import type { CatalogViewMode } from '../../core/types.js';
import { motion } from '../../motion/main.js';
import type { MotionHandle } from '../../motion/types.js';
import { catalogViewLabel, viewIconKey, type ViewIconKey } from './view-state.js';

const SHAPE_ATTRIBUTES = ['x', 'y', 'width', 'height', 'rx', 'ry'] as const;

export class CatalogViewIconController {
  readonly #activeMotion = new WeakMap<SVGElement, MotionHandle[]>();

  ensurePresentation(host: SVGElement): void {
    for (const property of ['display', 'visibility', 'color', 'fill']) {
      const value = property === 'display'
        ? 'block'
        : property === 'visibility'
          ? 'visible'
          : 'var(--sc-color-ink,#0a0a0a)';
      host.style.setProperty(property, value, 'important');
    }

    const live = host.querySelector<SVGElement>('[data-sc-view-live]');
    if (live) {
      live.style.setProperty('display', 'inline', 'important');
      live.style.setProperty('visibility', 'visible', 'important');
    }

    const targets = host.querySelector<SVGElement>('.sc-view-icon-targets');
    if (targets) {
      targets.style.setProperty('visibility', 'hidden', 'important');
      targets.style.setProperty('opacity', '0', 'important');
      targets.style.setProperty('pointer-events', 'none', 'important');
    }

    for (const shape of this.liveShapes(host)) {
      shape.style.setProperty('display', 'inline', 'important');
      shape.style.setProperty('visibility', 'visible', 'important');
      shape.style.setProperty('fill', 'var(--sc-color-ink,#0a0a0a)', 'important');
    }
  }

  stop(host: SVGElement): void {
    for (const handle of this.#activeMotion.get(host) ?? []) handle.cancel();
    this.#activeMotion.delete(host);
    host.removeAttribute('data-sc-view-icon-animating');
    this.ensurePresentation(host);
  }

  syncControl(root: HTMLElement, mode: CatalogViewMode, animate = false): void {
    const button = root.querySelector<HTMLButtonElement>('.sc-catalog-view-toggle');
    const host = button?.querySelector<SVGElement>('[data-sc-view-icon]');
    const label = catalogViewLabel(mode);

    if (button) {
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      button.style.setProperty('visibility', 'visible', 'important');
      button.style.setProperty('color', 'var(--sc-color-ink,#0a0a0a)', 'important');
    }
    if (!host) return;

    this.ensurePresentation(host);
    const key = viewIconKey(mode);
    const previous = host.getAttribute('data-sc-icon-state');
    if (previous === key) return;
    if (animate && (previous === 'grid' || previous === 'list')) this.#animateGeometry(host, previous, key);
    else this.#setState(host, key);
  }

  liveShapes(host: SVGElement): SVGRectElement[] {
    return Array.from(host.querySelectorAll<SVGRectElement>('[data-sc-view-shape]'));
  }

  #targetShapes(host: SVGElement, key: ViewIconKey): Array<SVGRectElement | null> {
    return this.liveShapes(host).map((_, index) =>
      host.querySelector<SVGRectElement>(`[data-sc-view-target="${key}-${index}"]`),
    );
  }

  #setState(host: SVGElement, key: ViewIconKey): void {
    this.stop(host);
    const targets = this.#targetShapes(host, key);
    this.liveShapes(host).forEach((shape, index) => {
      const target = targets[index];
      if (!target) return;
      for (const attribute of SHAPE_ATTRIBUTES) {
        const value = target.getAttribute(attribute);
        if (value === null) shape.removeAttribute(attribute);
        else shape.setAttribute(attribute, value);
      }
      shape.style.removeProperty('transform');
      shape.style.removeProperty('will-change');
    });
    host.setAttribute('data-sc-icon-state', key);
  }

  #numericAttributes(target: SVGRectElement): Record<string, number> {
    return Object.fromEntries(SHAPE_ATTRIBUTES.map((attribute) => {
      const value = Number.parseFloat(target.getAttribute(attribute) ?? '0');
      return [attribute, Number.isFinite(value) ? value : 0];
    }));
  }

  #animateGeometry(host: SVGElement, from: ViewIconKey, to: ViewIconKey): void {
    if (from === to) {
      host.setAttribute('data-sc-icon-state', to);
      this.ensurePresentation(host);
      return;
    }

    this.stop(host);
    const shapes = this.liveShapes(host);
    const targets = this.#targetShapes(host, to);
    if (shapes.length === 0 || targets.some((target) => target === null)) {
      this.#setState(host, to);
      return;
    }

    const reduced = queries.reducedMotion.matches;
    const handles: MotionHandle[] = [];
    let remaining = shapes.length;
    host.setAttribute('data-sc-icon-state', to);
    host.setAttribute('data-sc-view-icon-animating', 'true');
    this.#activeMotion.set(host, handles);

    shapes.forEach((shape, index) => {
      const target = targets[index];
      if (!target) return;
      handles.push(motion.engine.attributes(shape, this.#numericAttributes(target), {
        duration: reduced ? 0.1 : 0.19,
        delay: reduced ? 0 : Math.floor(index / 2) * 0.008,
        ease: reduced ? 'quad.inOut' : 'cubic.inOut',
        onComplete: () => {
          remaining -= 1;
          if (remaining > 0 || this.#activeMotion.get(host) !== handles) return;
          this.#activeMotion.delete(host);
          host.removeAttribute('data-sc-view-icon-animating');
          this.ensurePresentation(host);
        },
      }));
    });
  }
}

export const catalogViewIcon = new CatalogViewIconController();
