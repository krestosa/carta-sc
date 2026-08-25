import type { Cleanup } from './types.js';

const VIEW_KEY = 'sc:catalog:view';
const THEME_KEY = 'sc:theme';
const OWNED_PREFIX = 'sc:';
const ALLOWED_LOCAL_KEYS = new Set([THEME_KEY, VIEW_KEY]);

class StoragePolicyController {
  readonly #nativeSetItem = Storage.prototype.setItem;
  #started = false;

  initialize(): Cleanup {
    if (this.#started) return () => undefined;
    this.#started = true;
    this.#installGuard();
    return this.destroy;
  }

  destroy = (): void => {
    if (!this.#started) return;
    this.#started = false;
    this.#restoreNativeSetItem();
  };

  #safeLocalStorage(): Storage | null {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }

  #installGuard(): void {
    const controller = this;
    function guardedSetItem(this: Storage, key: string, value: string): void {
      const normalizedKey = String(key ?? '');
      if (!normalizedKey.startsWith(OWNED_PREFIX)) {
        controller.#nativeSetItem.call(this, key, value);
        return;
      }
      if (this === controller.#safeLocalStorage() && ALLOWED_LOCAL_KEYS.has(normalizedKey)) {
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
      // Some browsers do not allow Storage.prototype to be redefined.
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
      // Keep the last valid state if the prototype is sealed.
    }
  }
}

const storagePolicyController = new StoragePolicyController();

export function initializeStoragePolicy(): Cleanup {
  return storagePolicyController.initialize();
}

export const storagePolicy = Object.freeze({
  allowedLocalStorage: [THEME_KEY, VIEW_KEY] as const,
});
