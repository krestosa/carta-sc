import type { ResolvedTheme, ThemeMode } from '../../core/types.js';

export interface ThemeTransitionState {
  readonly previous: ThemeMode;
  readonly before: ResolvedTheme;
  readonly after: ResolvedTheme;
}

const STORAGE_KEY = 'scTheme:v1';

export class ThemeState {
  readonly #root: HTMLElement;
  readonly #systemDark: MediaQueryList;

  constructor(
    root: HTMLElement = document.documentElement,
    systemDark: MediaQueryList = matchMedia('(prefers-color-scheme: dark)'),
  ) {
    this.#root = root;
    this.#systemDark = systemDark;
  }

  normalize(value: string | null): ThemeMode | null {
    return value === 'system' || value === 'light' || value === 'dark' ? value : null;
  }

  resolve(mode: ThemeMode): ResolvedTheme {
    return mode === 'system' ? (this.#systemDark.matches ? 'dark' : 'light') : mode;
  }

  selected(): ThemeMode {
    return this.normalize(this.#root.getAttribute('data-sc-theme')) ?? this.load();
  }

  load(): ThemeMode {
    return this.normalize(this.#root.getAttribute('data-sc-theme')) ?? this.#stored() ?? 'system';
  }

  transition(mode: ThemeMode): ThemeTransitionState {
    const previous = this.selected();
    const before = this.normalizeResolved(this.#root.getAttribute('data-sc-theme-resolved')) ?? this.resolve(previous);
    return { previous, before, after: this.resolve(mode) };
  }

  commit(mode: ThemeMode, persist: boolean): ThemeTransitionState {
    const transition = this.transition(mode);
    this.#root.setAttribute('data-sc-theme', mode);
    this.#root.setAttribute('data-sc-theme-resolved', transition.after);
    if (persist && transition.previous !== mode) this.#save(mode);
    return transition;
  }

  commitSystemResolution(resolved: ResolvedTheme): void {
    this.#root.setAttribute('data-sc-theme-resolved', resolved);
  }

  emit(mode: ThemeMode, resolved: ResolvedTheme): void {
    window.dispatchEvent(new CustomEvent('sc:themechange', { detail: { mode, resolved } }));
  }

  onSystemChange(listener: () => void): () => void {
    this.#systemDark.addEventListener('change', listener);
    return () => this.#systemDark.removeEventListener('change', listener);
  }

  normalizeResolved(value: string | null): ResolvedTheme | null {
    return value === 'light' || value === 'dark' ? value : null;
  }

  #stored(): ThemeMode | null {
    try {
      return this.normalize(localStorage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  }

  #save(mode: ThemeMode): void {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // La persistencia es opcional cuando el navegador bloquea Storage.
    }
  }
}

export const themeState = new ThemeState();
