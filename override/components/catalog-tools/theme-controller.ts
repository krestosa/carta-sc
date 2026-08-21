import type { ResolvedTheme, ThemeMode } from '../../core/types.js';
import { motion } from '../../motion/main.js';
import type { MotionHandle } from '../../motion/types.js';
import { ThemeIconController } from './theme-icon.js';
import { cancelPaletteTransition, transitionPalette, type PaletteTransitionContext } from './theme-palette.js';

const STORAGE_KEY = 'scTheme:v1';
const rootElement = document.documentElement;
const systemDark = matchMedia('(prefers-color-scheme: dark)');
const optionsCache = new WeakMap<HTMLElement, HTMLElement[]>();
const themeIcon = new ThemeIconController();

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

function storedTheme(): ThemeMode | null {
  try {
    return normalizeTheme(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function loadTheme(): ThemeMode {
  return normalizeTheme(rootElement.getAttribute('data-sc-theme')) ?? storedTheme() ?? 'system';
}

function saveTheme(mode: ThemeMode): void {
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

function stopContrastMotion(): void {
  const handles = contrastHandles;
  contrastHandles = [];
  handles.forEach((handle) => handle.cancel());
  contrastNode?.style.removeProperty('color');
  contrastNode = null;
}

function lockButtonContrast(root: HTMLElement | null, context: PaletteTransitionContext): void {
  stopContrastMotion();
  const parts = themeIcon.parts(root);
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

export function seedTheme(root: HTMLElement): ThemeMode {
  const mode = loadTheme();
  syncMetadata(root, mode);
  themeIcon.applyStatic(root, mode);
  return mode;
}

function commitTheme(root: HTMLElement | null, mode: ThemeMode, persist: boolean, keepIcon: boolean): void {
  const previous = selectedTheme();
  const before = normalizeTheme(rootElement.getAttribute('data-sc-theme-resolved')) ?? resolveTheme(previous);
  const after = resolveTheme(mode);

  rootElement.setAttribute('data-sc-theme', mode);
  rootElement.setAttribute('data-sc-theme-resolved', after);
  if (root) {
    syncMetadata(root, mode);
    if (!keepIcon) {
      stopContrastMotion();
      themeIcon.setStatic(root, mode);
    }
  }
  if (before !== after) emitThemeChange(mode, after);
  if (persist && previous !== mode) saveTheme(mode);
}

function transitionTheme(root: HTMLElement, requested: string, persist: boolean): void {
  const mode = normalizeTheme(requested) ?? 'system';
  const from = normalizeTheme(root.getAttribute('data-sc-theme-mode')) ?? selectedTheme();
  const before = normalizeTheme(rootElement.getAttribute('data-sc-theme-resolved')) ?? resolveTheme(selectedTheme());
  const after = resolveTheme(mode);
  stopContrastMotion();
  themeIcon.animate(root, from, mode);
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
  const parts = themeIcon.parts(root);
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
    themeIcon.stop();
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
  stopContrastMotion();
  themeIcon.setStatic(root, mode);
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
