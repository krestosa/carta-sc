export type Cleanup = () => void;

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = Exclude<ThemeMode, 'system'>;
export type CatalogViewMode = 'compact' | 'list';
export type ViewportContext = 'phone' | 'tablet' | 'desktop';

export interface ScrollState {
  programmatic: boolean;
  suppressRevealUntil: number;
}

export interface RevealGate {
  readonly headings: boolean;
  readonly cards: boolean;
  readonly released: boolean;
  mark(part: 'headings' | 'cards'): void;
  release(): void;
}
