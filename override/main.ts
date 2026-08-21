type BootstrapTheme = 'system' | 'light' | 'dark';

const VIEW_MODES = ['compact', 'list'] as const;
const THEME_MODES = ['system', 'light', 'dark'] as const satisfies readonly BootstrapTheme[];
const RUNTIME_ENTRY = 'runtime-main.js';
const RUNTIME_SCRIPT_ID = 'sc-override-runtime-js';
const THEME_STORAGE_KEY = 'scTheme:v1';
const root = document.documentElement;
const assetVersion = window.__scCatalogAssetVersion ?? 'unversioned';

function storedTheme(): BootstrapTheme {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_MODES.includes(value as BootstrapTheme) ? value as BootstrapTheme : 'system';
  } catch {
    return 'system';
  }
}

function resolvedTheme(theme: BootstrapTheme): Exclude<BootstrapTheme, 'system'> {
  if (theme !== 'system') return theme;
  return matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
}

function exposeInitialTheme(): void {
  const theme = storedTheme();
  root.setAttribute('data-sc-theme', theme);
  root.setAttribute('data-sc-theme-resolved', resolvedTheme(theme));
}

function releasePrepaintOnError(error: Event | string): void {
  root.setAttribute('data-sc-catalog-reveal-ready', 'true');
  root.classList.remove('sc-catalog-reveal-prepaint');
  console.error('[SushiClub override] Runtime loader failed', error);
}

exposeInitialTheme();

if (!document.getElementById(RUNTIME_SCRIPT_ID)) {
  const runtimeScript = document.createElement('script');
  runtimeScript.id = RUNTIME_SCRIPT_ID;
  runtimeScript.type = 'module';
  runtimeScript.src = `override/${RUNTIME_ENTRY}?v=${encodeURIComponent(assetVersion)}`;
  runtimeScript.addEventListener('error', releasePrepaintOnError, { once: true });
  document.head.appendChild(runtimeScript);
}

void VIEW_MODES;
