import { queries } from '../../core/variables.js';
import type { ResolvedTheme, ThemeMode } from '../../core/types.js';
import { motion } from '../../motion/main.js';
import type { MotionHandle } from '../../motion/types.js';
import { cancelPaletteTransition, transitionPalette, type PaletteTransitionContext } from './theme-palette.js';

interface ThemeIconParts {
  readonly button: HTMLButtonElement;
  readonly svg: SVGElement;
  readonly rotor: SVGGraphicsElement;
  readonly core: SVGPathElement;
  readonly bite: SVGElement;
  readonly ring: SVGElement;
  readonly rays: SVGElement;
  readonly lines: SVGLineElement[];
}

const STORAGE_KEY = 'scTheme:v1';
const SUN_PATH = 'M12 7.3A4.7 4.7 0 1 1 12 16.7A4.7 4.7 0 1 1 12 7.3Z';
const MOON_PATH = 'M12 3A9 9 0 1 1 12 21A9 9 0 1 1 12 3Z';
const AUTO_PATH = 'M12 3.6a8.4 8.4 0 0 1 0 16.8z';
const MOON_BITE = { cx: 18.3, cy: 6.2, radius: 8.6 } as const;
const rootElement = document.documentElement;
const systemDark = matchMedia('(prefers-color-scheme: dark)');
const partsCache = new WeakMap<HTMLElement, ThemeIconParts>();
const optionsCache = new WeakMap<HTMLElement, HTMLElement[]>();

let geometryToken = 0;
let mainHandles: MotionHandle[] = [];
let contrastHandles: MotionHandle[] = [];
let contrastNode: HTMLButtonElement | null = null;

function normalizeTheme(value: string | null): ThemeMode | null {
  return value === 'system' || value === 'light' || value === 'dark' ? value : null;
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? (systemDark.matches ? 'dark' : 'light') : mode;
}

export function selectedTheme(): ThemeMode {
  return normalizeTheme(rootElement.getAttribute('data-sc-theme')) ?? loadTheme();
}

function memoryTheme(): ThemeMode | null {
  const bootstrapTheme = normalizeTheme(window.__scInitialTheme ?? null);
  if (bootstrapTheme) return bootstrapTheme;
  try {
    return normalizeTheme(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function loadTheme(): ThemeMode {
  return memoryTheme() ?? normalizeTheme(rootElement.getAttribute('data-sc-theme')) ?? 'system';
}

function saveTheme(mode: ThemeMode): void {
  window.__scInitialTheme = mode;
  try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* Persistencia opcional. */ }
}

function themeOptions(root: HTMLElement): HTMLElement[] {
  const cached = optionsCache.get(root);
  if (cached) return cached;
  const options = Array.from(root.querySelectorAll<HTMLElement>('[data-sc-theme-option]'));
  optionsCache.set(root, options);
  return options;
}

function accessibilityLabel(mode: ThemeMode): string {
  if (mode === 'system') return 'Tema automático. Elegir tema';
  return mode === 'dark' ? 'Tema oscuro. Elegir tema' : 'Tema claro. Elegir tema';
}

function emitThemeChange(mode: ThemeMode, resolved: ResolvedTheme): void {
  window.dispatchEvent(new CustomEvent('sc:themechange', { detail: { mode, resolved } }));
}

function syncMetadata(root: HTMLElement, mode: ThemeMode): void {
  const button = root.querySelector<HTMLButtonElement>('.sc-theme-toggle');
  const resolved = resolveTheme(mode);
  root.setAttribute('data-sc-theme-mode', mode);
  root.setAttribute('data-sc-theme-actual', resolved);
  if (button) {
    button.setAttribute('aria-label', accessibilityLabel(mode));
    button.setAttribute('title', mode === 'system' ? 'Tema automático' : `Tema ${mode === 'dark' ? 'oscuro' : 'claro'}`);
  }
  for (const option of themeOptions(root)) {
    const selected = option.getAttribute('data-sc-theme-option') === mode;
    option.setAttribute('aria-checked', String(selected));
    option.classList.toggle('sc-theme-option-selected', selected);
  }
}

function iconParts(root: HTMLElement | null): ThemeIconParts | null {
  if (!root) return null;
  const cached = partsCache.get(root);
  if (cached) return cached;

  const button = root.querySelector<HTMLButtonElement>('.sc-theme-toggle');
  const svg = button?.querySelector<SVGElement>('[data-sc-theme-icon]');
  const rotor = button?.querySelector<SVGGraphicsElement>('[data-sc-theme-rotor]');
  const core = button?.querySelector<SVGPathElement>('[data-sc-theme-core]');
  const bite = button?.querySelector<SVGElement>('[data-sc-theme-bite]');
  const ring = button?.querySelector<SVGElement>('[data-sc-theme-auto-ring]');
  const rays = button?.querySelector<SVGElement>('[data-sc-theme-rays]');
  const lines = button ? Array.from(button.querySelectorAll<SVGLineElement>('[data-sc-theme-rays] line')) : [];
  if (!button || !svg || !rotor || !core || !bite || !ring || !rays || lines.length !== 8) return null;

  const parts = { button, svg, rotor, core, bite, ring, rays, lines };
  partsCache.set(root, parts);
  return parts;
}

function setAttributes(node: Element, values: Readonly<Record<string, string | number>>): void {
  for (const [name, value] of Object.entries(values)) node.setAttribute(name, String(value));
}

function track(handle: MotionHandle): MotionHandle {
  mainHandles.push(handle);
  return handle;
}

function stopMainMotion(): void {
  geometryToken += 1;
  const handles = mainHandles;
  mainHandles = [];
  handles.forEach((handle) => handle.cancel());
}

function stopContrastMotion(): void {
  const handles = contrastHandles;
  contrastHandles = [];
  handles.forEach((handle) => handle.cancel());
  contrastNode?.style.removeProperty('color');
  contrastNode = null;
}

function lockButtonContrast(root: HTMLElement | null, context: PaletteTransitionContext): void {
  stopContrastMotion();
  const parts = iconParts(root);
  const from = context.from['--sc-color-ink'];
  const to = context.to['--sc-color-ink'];
  if (!parts || !from || !to || from === to || context.duration <= 0) return;

  const button = parts.button;
  contrastNode = button;
  button.style.setProperty('color', from, 'important');
  contrastHandles.push(motion.engine.delay(context.duration / 2, () => {
    if (contrastNode === button) button.style.setProperty('color', to, 'important');
  }));
  contrastHandles.push(motion.engine.delay(context.duration, () => {
    if (contrastNode === button) {
      button.style.removeProperty('color');
      contrastNode = null;
    }
    contrastHandles = [];
  }));
}

function prepareRays(parts: ThemeIconParts, offset: number): void {
  for (const line of parts.lines) {
    if (line.getAttribute('pathLength') !== '1') line.setAttribute('pathLength', '1');
    line.style.strokeDasharray = '1';
    line.style.strokeDashoffset = String(offset);
  }
}

function applyStaticIcon(root: HTMLElement, mode: ThemeMode): void {
  const parts = iconParts(root);
  if (!parts) return;

  parts.core.setAttribute('d', mode === 'system' ? AUTO_PATH : mode === 'dark' ? MOON_PATH : SUN_PATH);
  setAttributes(parts.bite, { cx: MOON_BITE.cx, cy: MOON_BITE.cy, r: mode === 'dark' ? MOON_BITE.radius : 0 });
  setAttributes(parts.ring, { r: 8.4 });
  parts.ring.style.opacity = mode === 'system' ? '1' : '0';
  prepareRays(parts, mode === 'light' ? 0 : 1);
  parts.rays.style.opacity = mode === 'light' ? '1' : '0';
  parts.rotor.style.transform = 'rotate(0deg)';
  parts.rotor.style.removeProperty('will-change');
  parts.svg.setAttribute('data-sc-theme-glyph-state', mode);
  root.setAttribute('data-sc-theme-prepaint-ready', '1');
  root.removeAttribute('data-sc-theme-animating');
}

export function seedTheme(root: HTMLElement): ThemeMode {
  const mode = loadTheme();
  syncMetadata(root, mode);
  applyStaticIcon(root, mode);
  return mode;
}

function setStaticTheme(root: HTMLElement, mode: ThemeMode): void {
  stopMainMotion();
  stopContrastMotion();
  applyStaticIcon(root, mode);
}

function commitTheme(root: HTMLElement | null, mode: ThemeMode, persist: boolean, keepIcon: boolean): void {
  const previous = selectedTheme();
  const before = normalizeTheme(rootElement.getAttribute('data-sc-theme-resolved')) ?? resolveTheme(previous);
  const after = resolveTheme(mode);

  rootElement.setAttribute('data-sc-theme', mode);
  rootElement.setAttribute('data-sc-theme-resolved', after);
  window.__scInitialTheme = mode;
  if (root) {
    syncMetadata(root, mode);
    if (!keepIcon) setStaticTheme(root, mode);
  }
  if (before !== after) emitThemeChange(mode, after);
  if (persist && previous !== mode) saveTheme(mode);
}

function tweenRay(line: SVGLineElement, to: number, duration: number, ease: string, delay: number): void {
  const from = Number.parseFloat(line.style.strokeDashoffset || line.getAttribute('stroke-dashoffset') || '0');
  track(motion.engine.tween(duration, ease, (progress) => {
    line.style.strokeDashoffset = String(from + (to - from) * progress);
  }, { delay }));
}

function animateThemeIcon(root: HTMLElement, from: ThemeMode, to: ThemeMode): void {
  const parts = iconParts(root);
  if (!parts || from === to) return;
  if (queries.reducedMotion.matches) {
    setStaticTheme(root, to);
    return;
  }

  const continuing = root.hasAttribute('data-sc-theme-animating');
  stopMainMotion();
  const token = geometryToken;
  if (!continuing) applyStaticIcon(root, from);

  root.setAttribute('data-sc-theme-animating', 'true');
  parts.svg.setAttribute('data-sc-theme-glyph-state', to);
  parts.rotor.style.willChange = 'transform';
  const path = to === 'system' ? AUTO_PATH : to === 'dark' ? MOON_PATH : SUN_PATH;
  const direction = to === 'dark' ? -1 : 1;

  track(motion.engine.path(parts.core, path, { duration: 0.18, ease: 'cubic.inOut' }));
  track(motion.engine.attributes(parts.bite, { cx: MOON_BITE.cx, cy: MOON_BITE.cy, r: to === 'dark' ? MOON_BITE.radius : 0 }, { duration: 0.16, ease: 'cubic.inOut' }));
  track(motion.engine.attributes(parts.ring, { r: 8.4 }, { duration: 0.14, ease: 'cubic.out' }));
  track(motion.engine.opacity(parts.ring, to === 'system' ? 1 : 0, { duration: 0.14, ease: 'cubic.out' }));
  track(motion.engine.transform(parts.rotor, { rotation: direction * 5.5 }, { duration: 0.075, ease: 'cubic.out' }));
  track(motion.engine.delay(0.06, () => {
    if (token !== geometryToken) return;
    track(motion.engine.transform(parts.rotor, { rotation: 0 }, { duration: 0.12, ease: 'quart.out' }));
  }));

  for (const line of parts.lines) {
    if (line.getAttribute('pathLength') !== '1') line.setAttribute('pathLength', '1');
    line.style.strokeDasharray = '1';
  }
  if (to === 'light') {
    parts.rays.style.opacity = '1';
    parts.lines.forEach((line, index) => tweenRay(line, 0, 0.14, 'quart.out', 0.015 + index * 0.006));
  } else {
    [...parts.lines].reverse().forEach((line, index) => tweenRay(line, 1, 0.09, 'cubic.in', index * 0.004));
    track(motion.engine.opacity(parts.rays, 0, { duration: 0.08, delay: 0.055, ease: 'cubic.out' }));
  }

  track(motion.engine.delay(0.2, () => {
    if (token !== geometryToken) return;
    mainHandles = [];
    applyStaticIcon(root, to);
  }));
}

function transitionTheme(root: HTMLElement, requested: string, persist: boolean): void {
  const mode = normalizeTheme(requested) ?? 'system';
  const from = normalizeTheme(root.getAttribute('data-sc-theme-mode')) ?? selectedTheme();
  const before = normalizeTheme(rootElement.getAttribute('data-sc-theme-resolved')) ?? resolveTheme(selectedTheme());
  const after = resolveTheme(mode);
  stopContrastMotion();
  animateThemeIcon(root, from, mode);
  if (before === after) {
    commitTheme(root, mode, persist, true);
  } else {
    transitionPalette(() => commitTheme(root, mode, persist, true), (context) => lockButtonContrast(root, context));
  }
}

export function applyTheme(root: HTMLElement, requested: string, persist = false): void {
  stopContrastMotion();
  cancelPaletteTransition();
  commitTheme(root, normalizeTheme(requested) ?? loadTheme(), persist, false);
}

function setMenuOpen(root: HTMLElement, open: boolean, focusOption: boolean): void {
  const button = root.querySelector<HTMLButtonElement>('.sc-theme-toggle');
  const menu = root.querySelector<HTMLElement>('.sc-theme-menu');
  if (!button || !menu) return;
  button.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-hidden', String(!open));
  menu.classList.toggle('sc-theme-menu-open', open);
  if (open && focusOption) {
    (menu.querySelector<HTMLElement>('[aria-checked="true"]') ?? menu.querySelector<HTMLElement>('.sc-theme-option'))?.focus();
  }
}

export function installThemeControl(root: HTMLElement): () => void {
  const button = root.querySelector<HTMLButtonElement>('.sc-theme-toggle');
  const menu = root.querySelector<HTMLElement>('.sc-theme-menu');
  const control = button?.closest<HTMLElement>('.sc-theme-control');
  if (!button || !menu || !control) return () => undefined;

  applyTheme(root, loadTheme());
  const items = themeOptions(root);
  const parts = iconParts(root);
  const cleanMicro = parts
    ? motion.bindMicroInteraction(button, parts.svg, { active: { rotation: 12 }, press: { rotation: -6 }, enterDuration: 0.1, exitDuration: 0.15 })
    : () => undefined;

  const toggle = (event: MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    setMenuOpen(root, button.getAttribute('aria-expanded') !== 'true', false);
  };
  const choose = (event: MouseEvent): void => {
    const option = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-sc-theme-option]') : null;
    if (!option || !menu.contains(option)) return;
    event.preventDefault();
    event.stopPropagation();
    transitionTheme(root, option.getAttribute('data-sc-theme-option') ?? '', true);
    setMenuOpen(root, false, false);
    button.focus();
  };
  const outside = (event: PointerEvent): void => {
    if (button.getAttribute('aria-expanded') !== 'true') return;
    if (event.target instanceof Node && !control.contains(event.target)) setMenuOpen(root, false, false);
  };
  const keys = (event: KeyboardEvent): void => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const index = target ? items.indexOf(target) : -1;
    if (target === button && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      setMenuOpen(root, true, true);
      return;
    }
    if (button.getAttribute('aria-expanded') !== 'true') return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setMenuOpen(root, false, false);
      button.focus();
      return;
    }
    if (index < 0 || items.length === 0) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      items[(index + 1) % items.length]?.focus();
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      items.at(-1)?.focus();
    }
  };

  button.addEventListener('click', toggle);
  menu.addEventListener('click', choose);
  root.addEventListener('keydown', keys);
  document.addEventListener('pointerdown', outside, true);

  return () => {
    cleanMicro();
    stopMainMotion();
    stopContrastMotion();
    cancelPaletteTransition();
    button.removeEventListener('click', toggle);
    menu.removeEventListener('click', choose);
    root.removeEventListener('keydown', keys);
    document.removeEventListener('pointerdown', outside, true);
  };
}

export function syncThemeControl(): void {
  const root = document.querySelector<HTMLElement>('.sc-catalog-tools');
  if (!root) return;
  const mode = selectedTheme();
  syncMetadata(root, mode);
  setStaticTheme(root, mode);
}

export function resolvedTheme(): ResolvedTheme {
  return resolveTheme(selectedTheme());
}

function onSystemThemeChange(): void {
  if (selectedTheme() !== 'system') return;
  const before = normalizeTheme(rootElement.getAttribute('data-sc-theme-resolved')) ?? resolveTheme('system');
  const after = resolveTheme('system');
  if (before === after) return;

  const root = document.querySelector<HTMLElement>('.sc-catalog-tools');
  stopContrastMotion();
  transitionPalette(() => {
    rootElement.setAttribute('data-sc-theme-resolved', after);
    root?.setAttribute('data-sc-theme-actual', after);
    emitThemeChange('system', after);
  }, (context) => lockButtonContrast(root, context));
}

systemDark.addEventListener('change', onSystemThemeChange);
