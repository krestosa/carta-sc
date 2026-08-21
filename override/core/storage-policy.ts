import type { Cleanup } from './types.js';

const VIEW_KEY = 'scCatalogView:v3';
const THEME_KEY = 'scTheme:v1';
const AUDIT_DELAY = 220;
const OWNED_PREFIXES = ['scTheme:', 'scCatalogView:', 'scCatalogSearch:'] as const;

const nativeSetItem = Storage.prototype.setItem;
let purgeTimer = 0;
let started = false;

const safeStorage = (name: 'localStorage' | 'sessionStorage'): Storage | null => {
  try {
    return window[name];
  } catch {
    return null;
  }
};

const isOwnedKey = (key: string): boolean => OWNED_PREFIXES.some((prefix) => key.startsWith(prefix));
const isAllowedLocalKey = (key: string): boolean => key === THEME_KEY || key === VIEW_KEY;

const removeMatching = (storage: Storage | null, predicate: (key: string) => boolean): void => {
  if (!storage) return;
  try {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (key && predicate(key)) storage.removeItem(key);
    }
  } catch {
    // Storage puede estar bloqueado por privacidad del navegador.
  }
};

const guardedSetItem: typeof Storage.prototype.setItem = function guardedSetItem(this: Storage, key, value): void {
  const normalizedKey = String(key ?? '');
  if (!isOwnedKey(normalizedKey)) {
    nativeSetItem.call(this, key, value);
    return;
  }

  if (this === safeStorage('localStorage') && isAllowedLocalKey(normalizedKey)) {
    nativeSetItem.call(this, normalizedKey, value);
  }
};

const purgeSession = (): void => removeMatching(safeStorage('sessionStorage'), isOwnedKey);

const purgeLocal = (): void => {
  const storage = safeStorage('localStorage');
  if (!storage) return;

  removeMatching(storage, (key) =>
    key.startsWith('scCatalogSearch:') || (key.startsWith('scTheme:') && key !== THEME_KEY),
  );

  let hasCurrentView = false;
  try {
    hasCurrentView = Boolean(storage.getItem(VIEW_KEY));
  } catch {
    return;
  }

  if (hasCurrentView) {
    removeMatching(storage, (key) => key.startsWith('scCatalogView:') && key !== VIEW_KEY);
  }
};

export const auditStorage = (): void => {
  purgeSession();
  purgeLocal();
};

const scheduleAudit = (): void => {
  if (purgeTimer) clearTimeout(purgeTimer);
  purgeTimer = window.setTimeout(() => {
    purgeTimer = 0;
    auditStorage();
  }, AUDIT_DELAY);
};

const onInput = (event: Event): void => {
  if (event.target instanceof Element && event.target.matches('.sc-catalog-search-input')) {
    scheduleAudit();
  }
};

export const initializeStoragePolicy = (): Cleanup => {
  if (started) return () => undefined;
  started = true;

  try {
    Object.defineProperty(Storage.prototype, 'setItem', {
      configurable: true,
      writable: true,
      value: guardedSetItem,
    });
  } catch {
    // Algunos navegadores no permiten redefinir Storage.prototype.
  }

  auditStorage();
  document.addEventListener('input', onInput, true);
  window.addEventListener('pagehide', auditStorage);
  if (document.readyState === 'complete') window.setTimeout(auditStorage, 0);
  else window.addEventListener('load', auditStorage, { once: true });

  return () => {
    if (!started) return;
    started = false;
    if (purgeTimer) clearTimeout(purgeTimer);
    purgeTimer = 0;
    document.removeEventListener('input', onInput, true);
    window.removeEventListener('pagehide', auditStorage);
    try {
      Object.defineProperty(Storage.prototype, 'setItem', {
        configurable: true,
        writable: true,
        value: nativeSetItem,
      });
    } catch {
      // Mantener el último estado válido si el prototipo está sellado.
    }
  };
};

export const storagePolicy = Object.freeze({
  allowedLocalStorage: [THEME_KEY, VIEW_KEY] as const,
  audit: auditStorage,
});
