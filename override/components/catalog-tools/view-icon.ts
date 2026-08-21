import { queries } from '../../core/variables.js';
import type { CatalogViewMode } from '../../core/types.js';
import { motion } from '../../motion/main.js';
import type { MotionHandle } from '../../motion/types.js';
import { catalogViewLabel, viewIconKey, type ViewIconKey } from './view-state.js';

type OffsetPair = readonly [number, number];

const SHAPE_ATTRIBUTES = ['x', 'y', 'width', 'height', 'rx', 'ry'] as const;
const activeIconMotion = new WeakMap<SVGElement, MotionHandle[]>();

function liveShapes(host: SVGElement): SVGRectElement[] {
  return Array.from(host.querySelectorAll<SVGRectElement>('[data-sc-view-shape]'));
}

function targetShapes(host: SVGElement, key: ViewIconKey): Array<SVGRectElement | null> {
  return liveShapes(host).map((_, index) =>
    host.querySelector<SVGRectElement>(`[data-sc-view-target="${key}-${index}"]`),
  );
}

export function ensureCatalogViewIconPresentation(host: SVGElement): void {
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

  for (const shape of liveShapes(host)) {
    shape.style.setProperty('display', 'inline', 'important');
    shape.style.setProperty('visibility', 'visible', 'important');
    shape.style.setProperty('fill', 'var(--sc-color-ink,#0a0a0a)', 'important');
  }
}

export function stopCatalogViewIconMotion(host: SVGElement): void {
  for (const handle of activeIconMotion.get(host) ?? []) handle.cancel();
  activeIconMotion.delete(host);
  host.removeAttribute('data-sc-view-icon-animating');
  ensureCatalogViewIconPresentation(host);
}

function setIconState(host: SVGElement, key: ViewIconKey): void {
  stopCatalogViewIconMotion(host);
  const targets = targetShapes(host, key);
  liveShapes(host).forEach((shape, index) => {
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

function numericShapeAttributes(target: SVGRectElement): Record<string, number> {
  return Object.fromEntries(SHAPE_ATTRIBUTES.map((attribute) => {
    const value = Number.parseFloat(target.getAttribute(attribute) ?? '0');
    return [attribute, Number.isFinite(value) ? value : 0];
  }));
}

function animateIconGeometry(host: SVGElement, from: ViewIconKey, to: ViewIconKey): void {
  if (from === to) {
    host.setAttribute('data-sc-icon-state', to);
    ensureCatalogViewIconPresentation(host);
    return;
  }

  stopCatalogViewIconMotion(host);
  const shapes = liveShapes(host);
  const targets = targetShapes(host, to);
  if (shapes.length === 0 || targets.some((target) => target === null)) {
    setIconState(host, to);
    return;
  }

  const reduced = queries.reducedMotion.matches;
  const handles: MotionHandle[] = [];
  let remaining = shapes.length;
  host.setAttribute('data-sc-icon-state', to);
  host.setAttribute('data-sc-view-icon-animating', 'true');
  activeIconMotion.set(host, handles);

  shapes.forEach((shape, index) => {
    const target = targets[index];
    if (!target) return;
    handles.push(motion.engine.attributes(shape, numericShapeAttributes(target), {
      duration: reduced ? 0.1 : 0.19,
      delay: reduced ? 0 : Math.floor(index / 2) * 0.008,
      ease: reduced ? 'quad.inOut' : 'cubic.inOut',
      onComplete: () => {
        remaining -= 1;
        if (remaining > 0 || activeIconMotion.get(host) !== handles) return;
        activeIconMotion.delete(host);
        host.removeAttribute('data-sc-view-icon-animating');
        ensureCatalogViewIconPresentation(host);
      },
    }));
  });
}

export function syncCatalogViewControl(root: HTMLElement, mode: CatalogViewMode, animate = false): void {
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

  ensureCatalogViewIconPresentation(host);
  const key = viewIconKey(mode);
  const previous = host.getAttribute('data-sc-icon-state');
  if (previous === key) return;
  if (animate && (previous === 'grid' || previous === 'list')) animateIconGeometry(host, previous, key);
  else setIconState(host, key);
}

export function bindCatalogViewIconMicroInteraction(
  button: HTMLButtonElement,
  host: SVGElement,
): () => void {
  const shapes = liveShapes(host);
  if (shapes.length !== 6) return () => undefined;

  const hoverOffsets: readonly OffsetPair[] = [
    [0.58, 0.38], [-0.58, 0.38], [0.58, 0], [-0.58, 0], [0.58, -0.38], [-0.58, -0.38],
  ];
  const pressOffsets: readonly OffsetPair[] = [
    [0.82, 0.52], [-0.82, 0.52], [0.82, 0], [-0.82, 0], [0.82, -0.52], [-0.82, -0.52],
  ];
  const homeOffsets: readonly OffsetPair[] = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]];
  let handles: MotionHandle[] = [];
  let hovering = false;
  let focused = false;
  let pressed = false;
  let destroyed = false;

  const stop = (): void => {
    handles.forEach((handle) => handle.cancel());
    handles = [];
  };
  const focusVisible = (): boolean => {
    try {
      return button.matches(':focus-visible');
    } catch {
      return document.activeElement === button;
    }
  };
  const apply = (offsets: readonly OffsetPair[], duration: number, ease: string): void => {
    if (destroyed) return;
    stop();
    if (queries.reducedMotion.matches) {
      shapes.forEach((shape) => {
        shape.style.removeProperty('transform');
        shape.style.removeProperty('will-change');
      });
      return;
    }
    handles = shapes.map((shape, index) => {
      const [x, y] = offsets[index] ?? [0, 0];
      return motion.engine.transform(shape, { x, y }, {
        duration,
        delay: index * 0.004,
        ease,
        onComplete: () => shape.style.removeProperty('will-change'),
      });
    });
  };

  const active = (): void => apply(hoverOffsets, 0.068, 'quart.out');
  const home = (): void => apply(homeOffsets, 0.09, 'quart.out');
  const press = (): void => apply(pressOffsets, 0.042, 'cubic.out');
  const enter = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') return;
    hovering = true;
    if (!pressed) active();
  };
  const leave = (): void => {
    hovering = false;
    pressed = false;
    focused ? active() : home();
  };
  const down = (): void => {
    pressed = true;
    press();
  };
  const up = (): void => {
    pressed = false;
    hovering || focused ? active() : home();
  };
  const focusIn = (): void => {
    if (!focusVisible()) return;
    focused = true;
    if (!pressed) active();
  };
  const focusOut = (): void => {
    focused = false;
    pressed = false;
    hovering ? active() : home();
  };
  const keyDown = (event: KeyboardEvent): void => {
    if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return;
    pressed = true;
    press();
  };
  const keyUp = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    pressed = false;
    hovering || focused ? active() : home();
  };

  button.addEventListener('pointerenter', enter);
  button.addEventListener('pointerleave', leave);
  button.addEventListener('pointerdown', down);
  button.addEventListener('pointerup', up);
  button.addEventListener('pointercancel', leave);
  button.addEventListener('focus', focusIn);
  button.addEventListener('blur', focusOut);
  button.addEventListener('keydown', keyDown);
  button.addEventListener('keyup', keyUp);

  return () => {
    if (destroyed) return;
    destroyed = true;
    button.removeEventListener('pointerenter', enter);
    button.removeEventListener('pointerleave', leave);
    button.removeEventListener('pointerdown', down);
    button.removeEventListener('pointerup', up);
    button.removeEventListener('pointercancel', leave);
    button.removeEventListener('focus', focusIn);
    button.removeEventListener('blur', focusOut);
    button.removeEventListener('keydown', keyDown);
    button.removeEventListener('keyup', keyUp);
    stop();
    shapes.forEach((shape) => {
      shape.style.removeProperty('transform');
      shape.style.removeProperty('will-change');
    });
  };
}
