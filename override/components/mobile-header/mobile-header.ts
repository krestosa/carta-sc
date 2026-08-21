import { queries } from '../../core/variables.js';
import { motion } from '../../motion/main.js';
import type { MotionHandle } from '../../motion/types.js';

interface SlicknavPlugin {
  readonly btn?: ArrayLike<HTMLElement>;
}

interface MenuBinding {
  readonly button: HTMLElement;
  nav: HTMLElement | null;
  fallback: ((event: MouseEvent) => void) | null;
  sync: (() => void) | null;
  syncKey: ((event: KeyboardEvent) => void) | null;
}

const PLUGIN_DATA_KEY = 'plugin_slicknav';
const REPAIR_DELAYS = [0, 60, 120, 240] as const;
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const MENU_ICON = 'M3 16H21V18H3V16Z M3 11H21V13H3V11Z M3 6H21V8H3V6Z';
const CLOSE_ICON = 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z';

const iconMotion = new WeakMap<SVGPathElement, MotionHandle>();
const bindingMap = new WeakMap<HTMLElement, MenuBinding>();
const bindings = new Set<MenuBinding>();
const syncTimers = new Set<number>();

let retryTimer = 0;
let initialized = false;

function ensureMenuIcon(button: HTMLElement | null): SVGPathElement | null {
  if (!button) return null;
  let host = button.querySelector<HTMLElement>('.slicknav_icon');
  if (!host) {
    host = document.createElement('span');
    host.className = 'slicknav_icon';
    button.append(host);
  }

  const existing = host.querySelector<SVGPathElement>('[data-sc-mobile-menu-icon-path]');
  if (existing) return existing;

  host.textContent = '';
  const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
  svg.setAttribute('class', 'sc-mobile-menu-state-icon');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NAMESPACE, 'path');
  path.setAttribute('data-sc-mobile-menu-icon-path', '');
  path.setAttribute('d', MENU_ICON);
  svg.append(path);
  host.append(svg);
  return path;
}

function syncIcon(button: HTMLElement, open: boolean): void {
  const path = ensureMenuIcon(button);
  if (!path) return;
  const state = open ? 'close' : 'menu';
  const shape = open ? CLOSE_ICON : MENU_ICON;
  const previous = path.dataset.scIconState;

  iconMotion.get(path)?.cancel();
  iconMotion.delete(path);
  if (previous && previous !== state) {
    const ran = motion.runLoaded(({ engine }) => {
      const handle = engine.path(path, shape, {
        duration: 0.24,
        ease: 'cubic.inOut',
        onComplete: () => iconMotion.delete(path),
      });
      iconMotion.set(path, handle);
    });
    if (!ran) path.setAttribute('d', shape);
  } else {
    path.setAttribute('d', shape);
  }
  path.dataset.scIconState = state;
}

function menuOpen(button: HTMLElement, nav: HTMLElement): boolean {
  if (button.classList.contains('slicknav_open')) return true;
  if (button.classList.contains('slicknav_collapsed')) return false;
  return nav.getAttribute('aria-hidden') === 'false' || nav.style.display === 'block';
}

function syncMenuButton(button: HTMLElement | null, nav: HTMLElement | null): void {
  if (!button || !nav) return;
  const open = menuOpen(button, nav);
  if (!nav.id) nav.id = 'sc-mobile-primary-menu';
  nav.setAttribute('aria-hidden', String(!open));
  button.setAttribute('aria-controls', nav.id);
  button.setAttribute('aria-expanded', String(open));
  button.setAttribute('aria-label', open ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
  button.setAttribute('title', open ? 'Cerrar menú' : 'Abrir menú');
  syncIcon(button, open);
}

function pluginMenu(): HTMLElement | null {
  const source = document.getElementById('menuMobile');
  if (!source || !window.jQuery) return null;
  try {
    const instance = window.jQuery(source).data(PLUGIN_DATA_KEY) as SlicknavPlugin | undefined;
    return instance?.btn?.[0]?.closest<HTMLElement>('.slicknav_menu') ?? null;
  } catch {
    return null;
  }
}

function isPluginMenu(menu: Element | null): boolean {
  return Boolean(menu && pluginMenu() === menu);
}

function bindingFor(button: HTMLElement): MenuBinding {
  const cached = bindingMap.get(button);
  if (cached) return cached;
  const binding: MenuBinding = { button, nav: null, fallback: null, sync: null, syncKey: null };
  bindingMap.set(button, binding);
  bindings.add(binding);
  return binding;
}

function removeFallbackToggle(button: HTMLElement | null): void {
  if (!button) return;
  const binding = bindingMap.get(button);
  if (!binding?.fallback) return;
  button.removeEventListener('click', binding.fallback);
  binding.fallback = null;
  button.removeAttribute('data-sc-fallback-toggle');
}

function installFallbackToggle(menu: HTMLElement): void {
  const button = menu.querySelector<HTMLElement>('.slicknav_btn');
  const nav = menu.querySelector<HTMLElement>('.slicknav_nav');
  if (!button || !nav) return;

  const binding = bindingFor(button);
  binding.nav = nav;
  if (binding.fallback) return;
  binding.fallback = (event) => {
    event.preventDefault();
    const activeNav = binding.nav;
    if (!activeNav) return;
    const open = !menuOpen(button, activeNav);
    button.classList.toggle('slicknav_open', open);
    button.classList.toggle('slicknav_collapsed', !open);
    activeNav.classList.toggle('slicknav_hidden', !open);
    activeNav.setAttribute('aria-hidden', String(!open));
    activeNav.style.display = open ? 'block' : 'none';
    syncMenuButton(button, activeNav);
  };
  button.dataset.scFallbackToggle = 'true';
  button.addEventListener('click', binding.fallback);
}

function installA11ySync(button: HTMLElement | null, nav: HTMLElement | null): void {
  if (!button || !nav) return;
  const binding = bindingFor(button);
  binding.nav = nav;
  if (binding.sync) return;

  binding.sync = () => {
    const timer = window.setTimeout(() => {
      syncTimers.delete(timer);
      if (initialized && document.documentElement.contains(button)) syncMenuButton(button, binding.nav);
    }, 0);
    syncTimers.add(timer);
  };
  binding.syncKey = (event) => {
    if ((event.key === 'Enter' || event.keyCode === 13) && isPluginMenu(button.closest('.slicknav_menu'))) binding.sync?.();
  };
  button.dataset.scA11ySync = 'true';
  button.addEventListener('click', binding.sync);
  button.addEventListener('keydown', binding.syncKey);
}

function unbind(binding: MenuBinding): void {
  if (binding.fallback) binding.button.removeEventListener('click', binding.fallback);
  if (binding.sync) binding.button.removeEventListener('click', binding.sync);
  if (binding.syncKey) binding.button.removeEventListener('keydown', binding.syncKey);
  binding.button.removeAttribute('data-sc-fallback-toggle');
  binding.button.removeAttribute('data-sc-a11y-sync');
  binding.fallback = null;
  binding.sync = null;
  binding.syncKey = null;
  binding.nav = null;
}

function pruneBindings(): void {
  for (const binding of bindings) {
    if (document.documentElement.contains(binding.button)) continue;
    unbind(binding);
    bindings.delete(binding);
  }
}

export function repairMobileHeader(finalAttempt = false): boolean {
  pruneBindings();
  if (queries.desktop.matches) return true;

  const menus = Array.from(document.querySelectorAll<HTMLElement>('body > .slicknav_menu'));
  if (menus.length === 0) return false;
  let live = pluginMenu();
  if (live && !menus.includes(live)) live = null;
  if (!live && !finalAttempt) return false;
  live ??= menus[0] ?? null;
  if (!live) return false;

  menus.filter((menu) => menu !== live).forEach((menu) => menu.remove());
  pruneBindings();
  live.classList.add('sc-mobile-main-menu');
  live.style.removeProperty('visibility');
  live.style.removeProperty('pointer-events');

  const button = live.querySelector<HTMLElement>('.slicknav_btn');
  const nav = live.querySelector<HTMLElement>('.slicknav_nav');
  if (isPluginMenu(live)) removeFallbackToggle(button);
  else installFallbackToggle(live);
  syncMenuButton(button, nav);
  installA11ySync(button, nav);
  return true;
}

function clearRetry(): void {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = 0;
}

export function scheduleMobileHeaderRepair(): void {
  clearRetry();
  if (!initialized || queries.desktop.matches) return;
  let index = 0;
  const attempt = (): void => {
    retryTimer = 0;
    if (!initialized) return;
    const finalAttempt = index === REPAIR_DELAYS.length - 1;
    if (repairMobileHeader(finalAttempt)) return;
    index += 1;
    const delay = REPAIR_DELAYS[index];
    if (delay !== undefined) retryTimer = window.setTimeout(attempt, delay);
  };
  retryTimer = window.setTimeout(attempt, REPAIR_DELAYS[0]);
}

export function initializeMobileHeader(): () => void {
  if (initialized) return destroyMobileHeader;
  initialized = true;
  queries.desktop.addEventListener('change', scheduleMobileHeaderRepair);
  scheduleMobileHeaderRepair();
  return destroyMobileHeader;
}

export function destroyMobileHeader(): void {
  if (initialized) queries.desktop.removeEventListener('change', scheduleMobileHeaderRepair);
  initialized = false;
  clearRetry();
  syncTimers.forEach((timer) => clearTimeout(timer));
  syncTimers.clear();
  bindings.forEach(unbind);
  bindings.clear();
}

