import { queries } from '../../core/variables.js';
import type { CatalogViewMode, ViewportContext } from '../../core/types.js';

export type ViewIconKey = 'grid' | 'list';

const STORAGE_KEY = 'scCatalogView:v3';
const rootElement = document.documentElement;

export function viewportContext(): ViewportContext {
  if (queries.phone.matches) return 'phone';
  if (queries.compactWide.matches) return 'tablet';
  return 'desktop';
}

export function normalizeCatalogViewMode(value: string | null): CatalogViewMode | null {
  if (value === 'normal') return 'compact';
  return value === 'compact' || value === 'list' ? value : null;
}

export function selectedCatalogView(): CatalogViewMode {
  return normalizeCatalogViewMode(rootElement.getAttribute('data-sc-catalog-view')) ?? 'compact';
}

function legacyMode(value: string | null): CatalogViewMode | null {
  if (value === 'list') return 'list';
  return value ? 'compact' : null;
}

export function loadCatalogView(): CatalogViewMode {
  const current = normalizeCatalogViewMode(rootElement.getAttribute('data-sc-catalog-view'));
  if (current) return current;

  const context = viewportContext();
  try {
    const stored = normalizeCatalogViewMode(localStorage.getItem(STORAGE_KEY));
    if (stored) return stored;

    const legacy = localStorage.getItem(`scCatalogView:v2:${context}`)
      ?? localStorage.getItem(context === 'desktop' ? 'scCatalogView:desktop' : 'scCatalogView:mobile');
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

export function saveCatalogView(mode: CatalogViewMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Persistir la preferencia es opcional.
  }
}

function columnCount(): number {
  const context = viewportContext();
  if (context === 'phone') return 2;
  if (context === 'tablet') return 3;
  return 4;
}

export function catalogViewLabel(mode: CatalogViewMode): string {
  if (mode === 'list') return 'Vista lista. Cambiar a grilla de alta densidad';
  const count = columnCount();
  return `Vista grilla de alta densidad: ${count} ${count === 1 ? 'columna' : 'columnas'}. Cambiar a vista lista`;
}

export function viewIconKey(mode: CatalogViewMode): ViewIconKey {
  return mode === 'list' ? 'list' : 'grid';
}
