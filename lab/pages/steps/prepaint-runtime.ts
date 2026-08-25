// Explica la responsabilidad de este archivo dentro del código propio y mantiene su lógica en el ámbito que le corresponde.
type PrepaintThemeMode = 'system' | 'light' | 'dark';
type PrepaintViewMode = 'compact' | 'list';

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

function resolvePrepaintTheme(): { readonly mode: PrepaintThemeMode; readonly resolved: 'light' | 'dark' } {
  const stored = storedPrepaintValue('sc:theme');
  const mode: PrepaintThemeMode = isPrepaintThemeMode(stored) ? stored : 'system';
  const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  const resolved = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;
  return { mode, resolved };
}

function resolvePrepaintView(): PrepaintViewMode {
  const stored = storedPrepaintValue('sc:catalog:view');
  return isPrepaintViewMode(stored) ? stored : 'compact';
}

const prepaintTheme = resolvePrepaintTheme();
prepaintRoot.setAttribute('data-sc-theme', prepaintTheme.mode);
prepaintRoot.setAttribute('data-sc-theme-resolved', prepaintTheme.resolved);
prepaintRoot.style.colorScheme = prepaintTheme.resolved;
prepaintRoot.setAttribute('data-sc-catalog-view', resolvePrepaintView());
prepaintRoot.classList.add('sc-catalog-prepaint', 'sc-no-loading-state');
