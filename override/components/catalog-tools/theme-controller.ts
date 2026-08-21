import type { ResolvedTheme, ThemeMode } from '../../core/types.js';
import { motion } from '../../motion/main.js';
import type { MotionHandle } from '../../motion/types.js';
import { ThemeIconController } from './theme-icon.js';
import { ThemeMenuController } from './theme-menu.js';
import { cancelPaletteTransition, transitionPalette, type PaletteTransitionContext } from './theme-palette.js';
import { themeState } from './theme-state.js';

const rootElement = document.documentElement;
const optionsCache = new WeakMap<HTMLElement, HTMLElement[]>();
const themeIcon = new ThemeIconController();

let contrastHandles: MotionHandle[] = [];
let contrastNode: HTMLButtonElement | null = null;

export function selectedTheme(): ThemeMode {
  return themeState.selected();
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

function syncMetadata(root: HTMLElement, mode: ThemeMode): void {
  const button = root.querySelector<HTMLButtonElement>('.sc-theme-toggle');
  const resolved = themeState.resolve(mode);
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
  for (const handle of handles) handle.cancel();
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
  const mode = themeState.load();
  syncMetadata(root, mode);
  themeIcon.applyStatic(root, mode);
  return mode;
}

function commitTheme(root: HTMLElement | null, mode: ThemeMode, persist: boolean, keepIcon: boolean): void {
  const transition = themeState.commit(mode, persist);
  if (!root) return;

  syncMetadata(root, mode);
  if (!keepIcon) {
    stopContrastMotion();
    themeIcon.setStatic(root, mode);
  }
  if (transition.before !== transition.after) {
    root.setAttribute('data-sc-theme-actual', transition.after);
    themeState.emit(mode, transition.after);
  }
}

function transitionTheme(root: HTMLElement, requested: string, persist: boolean): void {
  const mode = themeState.normalize(requested) ?? 'system';
  const from = themeState.normalize(root.getAttribute('data-sc-theme-mode')) ?? selectedTheme();
  const transition = themeState.transition(mode);
  stopContrastMotion();
  themeIcon.animate(root, from, mode);

  if (transition.before === transition.after) {
    commitTheme(root, mode, persist, true);
    return;
  }
  transitionPalette(
    () => commitTheme(root, mode, persist, true),
    (context) => lockButtonContrast(root, context),
  );
}

export function applyTheme(root: HTMLElement, requested: string, persist = false): void {
  stopContrastMotion();
  cancelPaletteTransition();
  commitTheme(root, themeState.normalize(requested) ?? themeState.load(), persist, false);
}

export function installThemeControl(root: HTMLElement): () => void {
  const menu = ThemeMenuController.create(root, {
    select: (value) => transitionTheme(root, value, true),
  });
  if (!menu) return () => undefined;

  applyTheme(root, themeState.load());
  const parts = themeIcon.parts(root);
  const cleanMicro = parts
    ? motion.bindMicroInteraction(menu.button, parts.svg, {
        active: { rotation: 12 },
        press: { rotation: -6 },
        enterDuration: 0.1,
        exitDuration: 0.15,
      })
    : () => undefined;
  const cleanMenu = menu.install();
  const cleanSystem = themeState.onSystemChange(onSystemThemeChange);

  return () => {
    cleanSystem();
    cleanMenu();
    cleanMicro();
    themeIcon.stop();
    stopContrastMotion();
    cancelPaletteTransition();
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
  return themeState.resolve(selectedTheme());
}

function onSystemThemeChange(): void {
  if (selectedTheme() !== 'system') return;
  const before = themeState.normalizeResolved(rootElement.getAttribute('data-sc-theme-resolved')) ?? themeState.resolve('system');
  const after = themeState.resolve('system');
  if (before === after) return;

  const root = document.querySelector<HTMLElement>('.sc-catalog-tools');
  stopContrastMotion();
  transitionPalette(() => {
    themeState.commitSystemResolution(after);
    root?.setAttribute('data-sc-theme-actual', after);
    themeState.emit('system', after);
  }, (context) => lockButtonContrast(root, context));
}
