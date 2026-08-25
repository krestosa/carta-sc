import { queries } from '../../core/variables.js';
import type { CatalogViewMode } from '../../core/types.js';

export type ViewIconKey = 'grid' | 'list';

const STORAGE_KEY = 'sc:catalog:view';
const rootElement = document.documentElement;

export function normalizeCatalogViewMode(value: string | null): CatalogViewMode | null {
  return value === 'compact' || value === 'list' ? value : null;
}

export function selectedCatalogView(): CatalogViewMode {
  return normalizeCatalogViewMode(rootElement.getAttribute('data-sc-catalog-view')) ?? 'compact';
}

export function loadCatalogView(): CatalogViewMode {
  const current = normalizeCatalogViewMode(rootElement.getAttribute('data-sc-catalog-view'));
  if (current) return current;
  try {
    return normalizeCatalogViewMode(localStorage.getItem(STORAGE_KEY)) ?? 'compact';
  } catch {
    return 'compact';
  }
}

export function saveCatalogView(mode: CatalogViewMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Persisting the preference is optional when Storage is unavailable.
  }
}

function columnCount(): number {
  if (queries.layoutNarrow.matches) return 2;
  if (queries.layoutIntermediate.matches) return 3;
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
