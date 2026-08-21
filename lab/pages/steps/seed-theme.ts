import path from 'node:path';
import { SITE, assert, read, write } from '../lib/core.js';

const PREPAINT_STYLE = `<style id="sc-theme-prepaint-css">
.sc-catalog-tools:not([data-sc-theme-prepaint-ready]) .sc-theme-icon {
  visibility: hidden !important;
}
</style>`;

const PREPAINT_SCRIPT = String.raw`<script id="sc-theme-prepaint">
{
  const browser = window;
  const documentRoot = document;
  const html = documentRoot.documentElement;
  const themeModes = ['system', 'light', 'dark'];
  const storageKey = 'scTheme:v1';
  const paths = {
    sun: 'M12 7.3A4.7 4.7 0 1 1 12 16.7A4.7 4.7 0 1 1 12 7.3Z',
    moon: 'M12 3A9 9 0 1 1 12 21A9 9 0 1 1 12 3Z',
    automatic: 'M12 3.6a8.4 8.4 0 0 1 0 16.8z',
  };

  let theme = 'system';
  try {
    theme = localStorage.getItem(storageKey) || 'system';
  } catch {
    theme = 'system';
  }
  if (!themeModes.includes(theme)) theme = 'system';

  browser.__scInitialTheme = theme;
  const systemDark = matchMedia('(prefers-color-scheme: dark)').matches;
  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
  html.setAttribute('data-sc-theme', theme);
  html.setAttribute('data-sc-theme-resolved', resolved);

  function seed(root) {
    if (!root || root.hasAttribute('data-sc-theme-prepaint-ready')) return true;

    const icon = root.querySelector('[data-sc-theme-icon]');
    const core = root.querySelector('[data-sc-theme-core]');
    const bite = root.querySelector('[data-sc-theme-bite]');
    const ring = root.querySelector('[data-sc-theme-auto-ring]');
    const rays = root.querySelector('[data-sc-theme-rays]');
    const rayLines = root.querySelectorAll('[data-sc-theme-rays] line');
    if (!icon || !core || !bite || !ring || !rays || rayLines.length !== 8) return false;

    root.setAttribute('data-sc-theme-mode', theme);
    root.setAttribute('data-sc-theme-actual', resolved);
    core.setAttribute('d', theme === 'system' ? paths.automatic : theme === 'dark' ? paths.moon : paths.sun);
    bite.setAttribute('cx', '18.3');
    bite.setAttribute('cy', '6.2');
    bite.setAttribute('r', theme === 'dark' ? '8.6' : '0');
    ring.setAttribute('r', '8.4');
    ring.style.opacity = theme === 'system' ? '1' : '0';
    rays.style.opacity = theme === 'light' ? '1' : '0';

    for (const line of rayLines) {
      line.setAttribute('pathLength', '1');
      line.style.strokeDasharray = '1';
      line.style.strokeDashoffset = theme === 'light' ? '0' : '1';
    }
    icon.setAttribute('data-sc-theme-glyph-state', theme);

    const button = root.querySelector('.sc-theme-toggle');
    if (button) {
      const label = theme === 'system'
        ? 'Tema automático. Elegir tema'
        : theme === 'dark'
          ? 'Tema oscuro. Elegir tema'
          : 'Tema claro. Elegir tema';
      const title = theme === 'system' ? 'Tema automático' : 'Tema ' + (theme === 'dark' ? 'oscuro' : 'claro');
      button.setAttribute('aria-label', label);
      button.setAttribute('title', title);
    }

    for (const option of root.querySelectorAll('[data-sc-theme-option]')) {
      const selected = option.getAttribute('data-sc-theme-option') === theme;
      option.setAttribute('aria-checked', String(selected));
      option.classList.toggle('sc-theme-option-selected', selected);
    }

    root.setAttribute('data-sc-theme-prepaint-ready', '1');
    return true;
  }

  function scan(node) {
    if (node instanceof Element && node.matches('.sc-catalog-tools')) seed(node);
    const root = documentRoot.querySelector('.sc-catalog-tools');
    if (root) seed(root);
  }

  scan(documentRoot.documentElement);
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) scan(node);
    }
    if (documentRoot.querySelector('.sc-catalog-tools[data-sc-theme-prepaint-ready]')) observer.disconnect();
  });
  observer.observe(documentRoot.documentElement, { childList: true, subtree: true });
}
</script>`;

const BOOTSTRAP = `${PREPAINT_STYLE}\n${PREPAINT_SCRIPT}`;

export function seedTheme(): void {
  const file = path.join(SITE, 'index.html');
  let html = read(file);
  assert(!html.includes('id="sc-theme-prepaint"'), 'theme prepaint bootstrap already present');

  const head = /<head\b[^>]*>/i.exec(html);
  assert(head?.index !== undefined, 'head missing for theme prepaint seed');
  const insertion = head.index + head[0].length;
  html = `${html.slice(0, insertion)}\n${BOOTSTRAP}${html.slice(insertion)}`;

  assert(html.split('id="sc-theme-prepaint"').length - 1 === 1, 'theme prepaint bootstrap count invalid');
  write(file, html);
}
