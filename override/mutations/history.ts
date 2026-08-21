export function restoreNativeHistory(): void {
  try {
    const prototype = window.History?.prototype;
    if (!prototype || typeof prototype.replaceState !== 'function') return;

    if (Object.prototype.hasOwnProperty.call(window.history, 'replaceState')) {
      try {
        Reflect.deleteProperty(window.history, 'replaceState');
      } catch {
        // El objeto History puede estar sellado por el navegador o una extensión.
      }
    }

    if (window.history.replaceState !== prototype.replaceState) {
      try {
        Object.defineProperty(window.history, 'replaceState', {
          configurable: true,
          writable: true,
          value: prototype.replaceState.bind(window.history),
        });
      } catch {
        // Conservar la implementación actual si la propiedad no es redefinible.
      }
    }
  } catch {
    // La restauración es defensiva; nunca debe bloquear el arranque del catálogo.
  }
}

export function cleanCategoryHash(): void {
  if (!/^#anchor/i.test(location.hash)) return;
  try {
    history.replaceState(history.state, document.title, location.pathname + location.search);
  } catch {
    // La navegación sigue siendo válida aunque el navegador rechace replaceState.
  }
}

export function initializeHistoryNormalization(): () => void {
  restoreNativeHistory();
  const finish = (): void => {
    restoreNativeHistory();
    cleanCategoryHash();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', finish, { once: true });
    return () => document.removeEventListener('DOMContentLoaded', finish);
  }

  finish();
  return () => undefined;
}
