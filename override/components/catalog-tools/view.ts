import { queries } from '../../core/variables.js';
import type { CatalogViewMode, ViewportContext } from '../../core/types.js';
import { scheduleDescriptionMeasure } from '../product-card/content.js';
import { motion } from '../../motion/main.js';
import type { MotionHandle } from '../../motion/types.js';

type ViewIconKey = 'grid' | 'list';
type OffsetPair = readonly [number, number];

const STORAGE_KEY = 'scCatalogView:v3';
const SHAPE_ATTRIBUTES = ['x', 'y', 'width', 'height', 'rx', 'ry'] as const;
const rootElement = document.documentElement;
const activeIconMotion = new WeakMap<SVGElement, MotionHandle[]>();

let layoutFrame = 0;
let settleTimer = 0;
let installationCleanup: (() => void) | null = null;

function viewportContext(): ViewportContext {
  if (queries.phone.matches) return 'phone';
  if (queries.compactWide.matches) return 'tablet';
  return 'desktop';
}

function normalizeMode(value: string | null): CatalogViewMode | null {
  if (value === 'normal') return 'compact';
  return value === 'compact' || value === 'list' ? value : null;
}

export function selectedCatalogView(): CatalogViewMode {
  return normalizeMode(rootElement.getAttribute('data-sc-catalog-view')) ?? 'compact';
}

function legacyMode(value: string | null): CatalogViewMode | null {
  if (value === 'list') return 'list';
  return value ? 'compact' : null;
}

function columnCount(): number {
  const context = viewportContext();
  if (context === 'phone') return 2;
  if (context === 'tablet') return 3;
  return 4;
}

function labelFor(mode: CatalogViewMode): string {
  if (mode === 'list') return 'Vista lista. Cambiar a grilla de alta densidad';
  const count = columnCount();
  return `Vista grilla de alta densidad: ${count} ${count === 1 ? 'columna' : 'columnas'}. Cambiar a vista lista`;
}

function iconKey(mode: CatalogViewMode): ViewIconKey {
  return mode === 'list' ? 'list' : 'grid';
}

function loadView(): CatalogViewMode {
  const current = normalizeMode(rootElement.getAttribute('data-sc-catalog-view'));
  if (current) return current;

  const context = viewportContext();
  try {
    const stored = normalizeMode(localStorage.getItem(STORAGE_KEY));
    if (stored) return stored;

    const legacy = localStorage.getItem(`scCatalogView:v2:${context}`) ??
      localStorage.getItem(context === 'desktop' ? 'scCatalogView:desktop' : 'scCatalogView:mobile');
    const migrated = legacyMode(legacy);
    if (migrated) {
      localStorage.setItem(STORAGE_KEY, migrated);
      return migrated;
    }
  } catch {
    // El modo por defecto sigue siendo utilizable sin Storage.
  }
  return 'compact';
}

function saveView(mode: CatalogViewMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Persistir la preferencia es opcional.
  }
}

const liveShapes = (host: SVGElement): SVGRectElement[] =>
  Array.from(host.querySelectorAll<SVGRectElement>('[data-sc-view-shape]'));

function targetShapes(host: SVGElement, key: ViewIconKey): Array<SVGRectElement | null> {
  return liveShapes(host).map((_, index) => host.querySelector<SVGRectElement>(`[data-sc-view-target="${key}-${index}"]`));
}

function ensureIconPresentation(host: SVGElement): void {
  for (const property of ['display', 'visibility', 'color', 'fill']) {
    const value = property === 'display' ? 'block' : property === 'visibility' ? 'visible' : 'var(--sc-color-ink,#0a0a0a)';
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

function stopIconMotion(host: SVGElement): void {
  for (const handle of activeIconMotion.get(host) ?? []) handle.cancel();
  activeIconMotion.delete(host);
  host.removeAttribute('data-sc-view-icon-animating');
  ensureIconPresentation(host);
}

function setIconState(host: SVGElement, key: ViewIconKey): void {
  stopIconMotion(host);
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
    ensureIconPresentation(host);
    return;
  }

  stopIconMotion(host);
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
        ensureIconPresentation(host);
      },
    }));
  });
}

function syncControl(root: HTMLElement, mode: CatalogViewMode, animate = false): void {
  const button = root.querySelector<HTMLButtonElement>('.sc-catalog-view-toggle');
  const host = button?.querySelector<SVGElement>('[data-sc-view-icon]');
  const label = labelFor(mode);

  if (button) {
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
    button.style.setProperty('visibility', 'visible', 'important');
    button.style.setProperty('color', 'var(--sc-color-ink,#0a0a0a)', 'important');
  }
  if (!host) return;

  ensureIconPresentation(host);
  const key = iconKey(mode);
  const previous = host.getAttribute('data-sc-icon-state');
  if (previous === key) return;
  if (animate && (previous === 'grid' || previous === 'list')) animateIconGeometry(host, previous, key);
  else setIconState(host, key);
}

function bindIconMicroInteraction(button: HTMLButtonElement, host: SVGElement): () => void {
  const shapes = liveShapes(host);
  if (shapes.length !== 6) return () => undefined;

  const hoverOffsets: readonly OffsetPair[] = [[0.58, 0.38], [-0.58, 0.38], [0.58, 0], [-0.58, 0], [0.58, -0.38], [-0.58, -0.38]];
  const pressOffsets: readonly OffsetPair[] = [[0.82, 0.52], [-0.82, 0.52], [0.82, 0], [-0.82, 0], [0.82, -0.52], [-0.82, -0.52]];
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
    try { return button.matches(':focus-visible'); }
    catch { return document.activeElement === button; }
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
  const enter = (event: PointerEvent): void => { if (event.pointerType !== 'touch') { hovering = true; if (!pressed) active(); } };
  const leave = (): void => { hovering = false; pressed = false; focused ? active() : home(); };
  const down = (): void => { pressed = true; press(); };
  const up = (): void => { pressed = false; hovering || focused ? active() : home(); };
  const focusIn = (): void => { if (focusVisible()) { focused = true; if (!pressed) active(); } };
  const focusOut = (): void => { focused = false; pressed = false; hovering ? active() : home(); };
  const keyDown = (event: KeyboardEvent): void => { if (!event.repeat && (event.key === 'Enter' || event.key === ' ')) { pressed = true; press(); } };
  const keyUp = (event: KeyboardEvent): void => { if (event.key === 'Enter' || event.key === ' ') { pressed = false; hovering || focused ? active() : home(); } };

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

export function syncCatalogView(): void {
  const root = document.querySelector<HTMLElement>('.sc-catalog-tools');
  if (root) syncControl(root, selectedCatalogView());
}

export function refreshCatalogViewLayout(switching = false): void {
  syncCatalogView();
  if (layoutFrame) cancelAnimationFrame(layoutFrame);
  if (settleTimer) clearTimeout(settleTimer);

  layoutFrame = requestAnimationFrame(() => {
    layoutFrame = requestAnimationFrame(() => {
      layoutFrame = 0;
      scheduleDescriptionMeasure();
      motion.refresh(0);
      if (switching) {
        settleTimer = window.setTimeout(() => {
          settleTimer = 0;
          rootElement.classList.remove('sc-catalog-view-switching');
        }, 80);
      }
    });
  });
}

export function applyCatalogView(root: HTMLElement, requested: string, persist = false): void {
  const mode = normalizeMode(requested) ?? 'compact';
  if (persist) rootElement.classList.add('sc-catalog-view-switching');
  rootElement.setAttribute('data-sc-catalog-view', mode);
  document.body.setAttribute('data-sc-catalog-view', mode);
  root.setAttribute('data-sc-view', mode);
  syncControl(root, mode, persist);
  if (persist) saveView(mode);
  refreshCatalogViewLayout(persist);
}

export function destroyCatalogView(): void {
  const host = document.querySelector<SVGElement>('.sc-catalog-view-toggle [data-sc-view-icon]');
  if (host) stopIconMotion(host);
  if (layoutFrame) cancelAnimationFrame(layoutFrame);
  if (settleTimer) clearTimeout(settleTimer);
  layoutFrame = 0;
  settleTimer = 0;
  rootElement.classList.remove('sc-catalog-view-switching');
  const cleanup = installationCleanup;
  installationCleanup = null;
  cleanup?.();
}

export function installCatalogView(root: HTMLElement): () => void {
  destroyCatalogView();
  const button = root.querySelector<HTMLButtonElement>('.sc-catalog-view-toggle');
  const host = button?.querySelector<SVGElement>('[data-sc-view-icon]');
  if (!button || !host) return () => undefined;

  ensureIconPresentation(host);
  applyCatalogView(root, loadView());
  const cleanMicroInteraction = bindIconMicroInteraction(button, host);
  const onClick = (): void => applyCatalogView(root, selectedCatalogView() === 'compact' ? 'list' : 'compact', true);
  const onBreakpoint = (): void => refreshCatalogViewLayout();

  button.addEventListener('click', onClick);
  queries.phone.addEventListener('change', onBreakpoint);
  queries.compactWide.addEventListener('change', onBreakpoint);

  installationCleanup = () => {
    cleanMicroInteraction();
    button.removeEventListener('click', onClick);
    queries.phone.removeEventListener('change', onBreakpoint);
    queries.compactWide.removeEventListener('change', onBreakpoint);
  };
  const ownedCleanup = installationCleanup;
  return () => {
    if (installationCleanup === ownedCleanup) destroyCatalogView();
  };
}
