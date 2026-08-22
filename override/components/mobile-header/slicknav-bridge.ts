import { MobileMenuIconController } from './state-icon.js';

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

export class SlicknavBridge {
  readonly #icon = new MobileMenuIconController();
  readonly #bindingMap = new WeakMap<HTMLElement, MenuBinding>();
  readonly #bindings = new Set<MenuBinding>();
  readonly #syncTimers = new Set<number>();
  #active = false;

  setActive(active: boolean): void {
    this.#active = active;
  }

  repair(finalAttempt = false): boolean {
    this.#pruneBindings();
    const menus = Array.from(document.querySelectorAll<HTMLElement>('body > .slicknav_menu'));
    if (menus.length === 0) return false;

    let live = this.#pluginMenu();
    if (live && !menus.includes(live)) live = null;
    if (!live && !finalAttempt) return false;
    live ??= menus[0] ?? null;
    if (!live) return false;

    for (const menu of menus) {
      if (menu !== live) menu.remove();
    }
    this.#pruneBindings();
    live.classList.add('sc-mobile-main-menu');
    live.style.removeProperty('visibility');
    live.style.removeProperty('pointer-events');

    const button = live.querySelector<HTMLElement>('.slicknav_btn');
    const nav = live.querySelector<HTMLElement>('.slicknav_nav');
    if (this.#isPluginMenu(live)) this.#removeFallbackToggle(button);
    else this.#installFallbackToggle(live);
    this.#syncMenuButton(button, nav);
    this.#installA11ySync(button, nav);
    return true;
  }

  destroy(): void {
    this.#active = false;
    for (const timer of this.#syncTimers) clearTimeout(timer);
    this.#syncTimers.clear();
    for (const binding of this.#bindings) this.#unbind(binding);
    this.#bindings.clear();
  }

  #menuOpen(button: HTMLElement, nav: HTMLElement): boolean {
    if (button.classList.contains('slicknav_open')) return true;
    if (button.classList.contains('slicknav_collapsed')) return false;
    return nav.getAttribute('aria-hidden') === 'false' || nav.style.display === 'block';
  }

  #syncMenuButton(button: HTMLElement | null, nav: HTMLElement | null): void {
    if (!button || !nav) return;
    const open = this.#menuOpen(button, nav);
    if (!nav.id) nav.id = 'sc-mobile-primary-menu';
    nav.setAttribute('aria-hidden', String(!open));
    button.setAttribute('aria-controls', nav.id);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
    button.setAttribute('title', open ? 'Cerrar menú' : 'Abrir menú');
    this.#icon.sync(button, open);
  }

  #pluginMenu(): HTMLElement | null {
    const source = document.getElementById('menuMobile');
    if (!source || !window.jQuery) return null;
    try {
      const instance = window.jQuery(source).data(PLUGIN_DATA_KEY) as SlicknavPlugin | undefined;
      return instance?.btn?.[0]?.closest<HTMLElement>('.slicknav_menu') ?? null;
    } catch {
      return null;
    }
  }

  #isPluginMenu(menu: Element | null): boolean {
    return Boolean(menu && this.#pluginMenu() === menu);
  }

  #bindingFor(button: HTMLElement): MenuBinding {
    const cached = this.#bindingMap.get(button);
    if (cached) return cached;
    const binding: MenuBinding = { button, nav: null, fallback: null, sync: null, syncKey: null };
    this.#bindingMap.set(button, binding);
    this.#bindings.add(binding);
    return binding;
  }

  #removeFallbackToggle(button: HTMLElement | null): void {
    if (!button) return;
    const binding = this.#bindingMap.get(button);
    if (!binding?.fallback) return;
    button.removeEventListener('click', binding.fallback);
    binding.fallback = null;
    button.removeAttribute('data-sc-fallback-toggle');
  }

  #installFallbackToggle(menu: HTMLElement): void {
    const button = menu.querySelector<HTMLElement>('.slicknav_btn');
    const nav = menu.querySelector<HTMLElement>('.slicknav_nav');
    if (!button || !nav) return;

    const binding = this.#bindingFor(button);
    binding.nav = nav;
    if (binding.fallback) return;
    binding.fallback = (event) => {
      event.preventDefault();
      const activeNav = binding.nav;
      if (!activeNav) return;
      const open = !this.#menuOpen(button, activeNav);
      button.classList.toggle('slicknav_open', open);
      button.classList.toggle('slicknav_collapsed', !open);
      activeNav.classList.toggle('slicknav_hidden', !open);
      activeNav.setAttribute('aria-hidden', String(!open));
      activeNav.style.display = open ? 'block' : 'none';
      this.#syncMenuButton(button, activeNav);
    };
    button.dataset.scFallbackToggle = 'true';
    button.addEventListener('click', binding.fallback);
  }

  #installA11ySync(button: HTMLElement | null, nav: HTMLElement | null): void {
    if (!button || !nav) return;
    const binding = this.#bindingFor(button);
    binding.nav = nav;
    if (binding.sync) return;

    binding.sync = () => {
      const timer = window.setTimeout(() => {
        this.#syncTimers.delete(timer);
        if (this.#active && document.documentElement.contains(button)) {
          this.#syncMenuButton(button, binding.nav);
        }
      }, 0);
      this.#syncTimers.add(timer);
    };
    binding.syncKey = (event) => {
      if ((event.key === 'Enter' || event.keyCode === 13) && this.#isPluginMenu(button.closest('.slicknav_menu'))) {
        binding.sync?.();
      }
    };
    button.dataset.scA11ySync = 'true';
    button.addEventListener('click', binding.sync);
    button.addEventListener('keydown', binding.syncKey);
  }

  #unbind(binding: MenuBinding): void {
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

  #pruneBindings(): void {
    for (const binding of this.#bindings) {
      if (document.documentElement.contains(binding.button)) continue;
      this.#unbind(binding);
      this.#bindings.delete(binding);
    }
  }
}
