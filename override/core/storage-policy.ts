import type { Cleanup } from './types.js';

const VIEW_KEY = 'scCatalogView:v3';
const THEME_KEY = 'scTheme:v1';
const AUDIT_DELAY = 220;
const OWNED_PREFIXES = ['scTheme:', 'scCatalogView:', 'scCatalogSearch:'] as const;

class StoragePolicyController {
  readonly #nativeSetItem = Storage.prototype.setItem;
  #auditTimer = 0;
  #started = false;

  initialize(): Cleanup {
    if (this.#started) return () => undefined;
    this.#started = true;
    this.#installGuard();
    this.audit();
    document.addEventListener('input', this.#onInput, true);
    window.addEventListener('pagehide', this.audit);
    if (document.readyState === 'complete') window.setTimeout(this.audit, 0);
    else window.addEventListener('load', this.audit, { once: true });
    return this.destroy;
  }

  destroy = (): void => {
    if (!this.#started) return;
    this.#started = false;
    if (this.#auditTimer) clearTimeout(this.#auditTimer);
    this.#auditTimer = 0;
    document.removeEventListener('input', this.#onInput, true);
    window.removeEventListener('pagehide', this.audit);
    this.#restoreNativeSetItem();
  };

  audit = (): void => {
    this.#purgeSession();
    this.#purgeLocal();
  };

  #safeStorage(name: 'localStorage' | 'sessionStorage'): Storage | null {
    try {
      return window[name];
    } catch {
      return null;
    }
  }

  #isOwnedKey(key: string): boolean {
    return OWNED_PREFIXES.some((prefix) => key.startsWith(prefix));
  }

  #isAllowedLocalKey(key: string): boolean {
    return key === THEME_KEY || key === VIEW_KEY;
  }

  #removeMatching(storage: Storage | null, predicate: (key: string) => boolean): void {
    if (!storage) return;
    try {
      for (let index = storage.length - 1; index >= 0; index -= 1) {
        const key = storage.key(index);
        if (key && predicate(key)) storage.removeItem(key);
      }
    } catch {
      // Storage puede estar bloqueado por privacidad del navegador.
    }
  }

  #installGuard(): void {
    const controller = this;
    function guardedSetItem(this: Storage, key: string, value: string): void {
      const normalizedKey = String(key ?? '');
      if (!controller.#isOwnedKey(normalizedKey)) {
        controller.#nativeSetItem.call(this, key, value);
        return;
      }
      if (this === controller.#safeStorage('localStorage') && controller.#isAllowedLocalKey(normalizedKey)) {
        controller.#nativeSetItem.call(this, normalizedKey, value);
      }
    }

    try {
      Object.defineProperty(Storage.prototype, 'setItem', {
        configurable: true,
        writable: true,
        value: guardedSetItem,
      });
    } catch {
      // Algunos navegadores no permiten redefinir Storage.prototype.
    }
  }

  #restoreNativeSetItem(): void {
    try {
      Object.defineProperty(Storage.prototype, 'setItem', {
        configurable: true,
        writable: true,
        value: this.#nativeSetItem,
      });
    } catch {
      // Mantener el último estado válido si el prototipo está sellado.
    }
  }

  #purgeSession(): void {
    this.#removeMatching(this.#safeStorage('sessionStorage'), (key) => this.#isOwnedKey(key));
  }

  #purgeLocal(): void {
    const storage = this.#safeStorage('localStorage');
    if (!storage) return;

    this.#removeMatching(
      storage,
      (key) => key.startsWith('scCatalogSearch:') || (key.startsWith('scTheme:') && key !== THEME_KEY),
    );

    let hasCurrentView = false;
    try {
      hasCurrentView = Boolean(storage.getItem(VIEW_KEY));
    } catch {
      return;
    }
    if (hasCurrentView) {
      this.#removeMatching(storage, (key) => key.startsWith('scCatalogView:') && key !== VIEW_KEY);
    }
  }

  #scheduleAudit(): void {
    if (this.#auditTimer) clearTimeout(this.#auditTimer);
    this.#auditTimer = window.setTimeout(() => {
      this.#auditTimer = 0;
      this.audit();
    }, AUDIT_DELAY);
  }

  #onInput = (event: Event): void => {
    if (event.target instanceof Element && event.target.matches('.sc-catalog-search-input')) {
      this.#scheduleAudit();
    }
  };
}

const storagePolicyController = new StoragePolicyController();

export const auditStorage = storagePolicyController.audit;

export function initializeStoragePolicy(): Cleanup {
  return storagePolicyController.initialize();
}

export const storagePolicy = Object.freeze({
  allowedLocalStorage: [THEME_KEY, VIEW_KEY] as const,
  audit: auditStorage,
});
