type PrepaintThemeMode = 'system' | 'light' | 'dark';
type PrepaintViewMode = 'compact' | 'list';
type PrepaintViewContext = 'phone' | 'tablet' | 'desktop';

const prepaintThemeModes: readonly PrepaintThemeMode[] = ['system', 'light', 'dark'];
const prepaintViewModes: readonly PrepaintViewMode[] = ['compact', 'list'];
const prepaintRoot = document.documentElement;

function isPrepaintThemeMode(value: string): value is PrepaintThemeMode {
  return prepaintThemeModes.some((mode) => mode === value);
}

function isPrepaintViewMode(value: string): value is PrepaintViewMode {
  return prepaintViewModes.some((mode) => mode === value);
}

function storedPrepaintValue(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function prepaintContext(): PrepaintViewContext {
  const width = window.innerWidth || prepaintRoot.clientWidth || 0;
  if (width <= 640) return 'phone';
  if (width <= 992) return 'tablet';
  return 'desktop';
}

function normalizeLegacyPrepaintView(value: string): PrepaintViewMode | '' {
  if (value === 'list') return 'list';
  return value ? 'compact' : '';
}

function resolvePrepaintTheme(): { readonly mode: PrepaintThemeMode; readonly resolved: 'light' | 'dark' } {
  const stored = storedPrepaintValue('scTheme:v1');
  const mode: PrepaintThemeMode = isPrepaintThemeMode(stored) ? stored : 'system';
  const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  const resolved = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;
  return { mode, resolved };
}

function resolvePrepaintView(): PrepaintViewMode {
  const current = storedPrepaintValue('scCatalogView:v3');
  if (current === 'normal') return 'compact';
  if (isPrepaintViewMode(current)) return current;

  const context = prepaintContext();
  const legacy = storedPrepaintValue(`scCatalogView:v2:${context}`)
    || storedPrepaintValue(context === 'desktop' ? 'scCatalogView:desktop' : 'scCatalogView:mobile');
  const migrated = normalizeLegacyPrepaintView(legacy);
  if (!migrated) return 'compact';

  try {
    localStorage.setItem('scCatalogView:v3', migrated);
  } catch {
    // El almacenamiento puede estar bloqueado; la vista resuelta sigue siendo válida para esta carga.
  }
  return migrated;
}

const prepaintTheme = resolvePrepaintTheme();
prepaintRoot.setAttribute('data-sc-theme', prepaintTheme.mode);
prepaintRoot.setAttribute('data-sc-theme-resolved', prepaintTheme.resolved);
prepaintRoot.style.colorScheme = prepaintTheme.resolved;
prepaintRoot.setAttribute('data-sc-catalog-view', resolvePrepaintView());
prepaintRoot.classList.add('sc-catalog-prepaint', 'sc-no-loading-state');
