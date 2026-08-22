import { moduleAssetVersion } from './core/module-version.js';

type BootstrapTheme = 'system' | 'light' | 'dark';

const THEME_MODES = ['system', 'light', 'dark'] as const satisfies readonly BootstrapTheme[];
const THEME_STORAGE_KEY = 'scTheme:v1';
const root = document.documentElement;

function isBootstrapTheme(value: string | null): value is BootstrapTheme {
  return value !== null && THEME_MODES.includes(value as BootstrapTheme);
}

function storedTheme(): BootstrapTheme {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return isBootstrapTheme(value) ? value : 'system';
  } catch {
    return 'system';
  }
}

function resolvedTheme(theme: BootstrapTheme): Exclude<BootstrapTheme, 'system'> {
  if (theme !== 'system') return theme;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyInitialTheme(): void {
  const theme = storedTheme();
  root.setAttribute('data-sc-theme', theme);
  root.setAttribute('data-sc-theme-resolved', resolvedTheme(theme));
}

function releasePrepaint(error: unknown): void {
  root.setAttribute('data-sc-catalog-reveal-ready', 'true');
  root.classList.remove('sc-catalog-reveal-prepaint');
  console.error('[SushiClub override] Runtime loader failed', error);
}

async function startRuntime(): Promise<void> {
  const assetVersion = moduleAssetVersion(import.meta.url);
  await import(`./runtime-main.js?v=${encodeURIComponent(assetVersion)}`);
}

applyInitialTheme();

try {
  await startRuntime();
} catch (error: unknown) {
  releasePrepaint(error);
}

export {};
