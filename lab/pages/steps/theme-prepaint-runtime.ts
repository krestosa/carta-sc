type ThemePrepaintMode = 'system' | 'light' | 'dark';
type ThemePrepaintResolved = 'light' | 'dark';

const themePrepaintModes: readonly ThemePrepaintMode[] = ['system', 'light', 'dark'];
const themePrepaintStorageKey = 'scTheme:v1';
const themePrepaintPaths = {
  sun: 'M12 7.3A4.7 4.7 0 1 1 12 16.7A4.7 4.7 0 1 1 12 7.3Z',
  moon: 'M12 3A9 9 0 1 1 12 21A9 9 0 1 1 12 3Z',
  automatic: 'M12 3.6a8.4 8.4 0 0 1 0 16.8z',
} as const;
const themePrepaintDocument = document;
const themePrepaintHtml = themePrepaintDocument.documentElement;

function isThemePrepaintMode(value: string): value is ThemePrepaintMode {
  return themePrepaintModes.some((mode) => mode === value);
}

function loadThemePrepaintMode(): ThemePrepaintMode {
  try {
    const stored = localStorage.getItem(themePrepaintStorageKey) ?? 'system';
    return isThemePrepaintMode(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

function resolveThemePrepaintMode(mode: ThemePrepaintMode): ThemePrepaintResolved {
  if (mode !== 'system') return mode;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const themePrepaintMode = loadThemePrepaintMode();
const themePrepaintResolved = resolveThemePrepaintMode(themePrepaintMode);
themePrepaintHtml.setAttribute('data-sc-theme', themePrepaintMode);
themePrepaintHtml.setAttribute('data-sc-theme-resolved', themePrepaintResolved);

function themePrepaintLabel(mode: ThemePrepaintMode): string {
  if (mode === 'system') return 'Tema automático. Elegir tema';
  return mode === 'dark' ? 'Tema oscuro. Elegir tema' : 'Tema claro. Elegir tema';
}

function themePrepaintTitle(mode: ThemePrepaintMode): string {
  if (mode === 'system') return 'Tema automático';
  return mode === 'dark' ? 'Tema oscuro' : 'Tema claro';
}

function seedThemePrepaint(root: HTMLElement): boolean {
  if (root.hasAttribute('data-sc-theme-prepaint-ready')) return true;

  const icon = root.querySelector<SVGElement>('[data-sc-theme-icon]');
  const core = root.querySelector<SVGPathElement>('[data-sc-theme-core]');
  const bite = root.querySelector<SVGCircleElement>('[data-sc-theme-bite]');
  const ring = root.querySelector<SVGCircleElement>('[data-sc-theme-auto-ring]');
  const rays = root.querySelector<SVGGElement>('[data-sc-theme-rays]');
  const rayLines = root.querySelectorAll<SVGLineElement>('[data-sc-theme-rays] line');
  if (!icon || !core || !bite || !ring || !rays || rayLines.length !== 8) return false;

  root.setAttribute('data-sc-theme-mode', themePrepaintMode);
  root.setAttribute('data-sc-theme-actual', themePrepaintResolved);
  core.setAttribute(
    'd',
    themePrepaintMode === 'system'
      ? themePrepaintPaths.automatic
      : themePrepaintMode === 'dark'
        ? themePrepaintPaths.moon
        : themePrepaintPaths.sun,
  );
  bite.setAttribute('cx', '18.3');
  bite.setAttribute('cy', '6.2');
  bite.setAttribute('r', themePrepaintMode === 'dark' ? '8.6' : '0');
  ring.setAttribute('r', '8.4');
  ring.style.opacity = themePrepaintMode === 'system' ? '1' : '0';
  rays.style.opacity = themePrepaintMode === 'light' ? '1' : '0';

  rayLines.forEach((line) => {
    line.setAttribute('pathLength', '1');
    line.style.strokeDasharray = '1';
    line.style.strokeDashoffset = themePrepaintMode === 'light' ? '0' : '1';
  });
  icon.setAttribute('data-sc-theme-glyph-state', themePrepaintMode);

  const button = root.querySelector<HTMLButtonElement>('.sc-theme-toggle');
  if (button) {
    button.setAttribute('aria-label', themePrepaintLabel(themePrepaintMode));
    button.setAttribute('title', themePrepaintTitle(themePrepaintMode));
  }

  root.querySelectorAll<HTMLElement>('[data-sc-theme-option]').forEach((option) => {
    const selected = option.getAttribute('data-sc-theme-option') === themePrepaintMode;
    option.setAttribute('aria-checked', String(selected));
    option.classList.toggle('sc-theme-option-selected', selected);
  });

  root.setAttribute('data-sc-theme-prepaint-ready', '1');
  return true;
}

function scanThemePrepaint(node: Node): void {
  if (node instanceof HTMLElement && node.matches('.sc-catalog-tools')) {
    seedThemePrepaint(node);
  }
  const root = themePrepaintDocument.querySelector<HTMLElement>('.sc-catalog-tools');
  if (root) seedThemePrepaint(root);
}

scanThemePrepaint(themePrepaintDocument.documentElement);
const themePrepaintObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    mutation.addedNodes.forEach((node) => scanThemePrepaint(node));
  }
  if (themePrepaintDocument.querySelector('.sc-catalog-tools[data-sc-theme-prepaint-ready]')) {
    themePrepaintObserver.disconnect();
  }
});
themePrepaintObserver.observe(themePrepaintDocument.documentElement, { childList: true, subtree: true });
