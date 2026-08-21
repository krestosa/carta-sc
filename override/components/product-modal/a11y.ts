export interface BackgroundLock {
  release(): void;
}

interface BackgroundSnapshot {
  readonly node: HTMLElement;
  readonly inertSupported: boolean;
  readonly inert?: boolean;
  readonly ariaHidden?: string | null;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function focusableElements(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden',
  );
}

export function lockBackground(modal: HTMLElement): BackgroundLock {
  const inertSupported = 'inert' in HTMLElement.prototype;
  const snapshots: BackgroundSnapshot[] = Array.from(document.body.children)
    .filter((node): node is HTMLElement => node instanceof HTMLElement && node !== modal)
    .map((node) => {
      if (inertSupported) {
        const snapshot: BackgroundSnapshot = { node, inertSupported, inert: node.inert };
        node.inert = true;
        return snapshot;
      }

      const snapshot: BackgroundSnapshot = {
        node,
        inertSupported,
        ariaHidden: node.getAttribute('aria-hidden'),
      };
      node.setAttribute('aria-hidden', 'true');
      return snapshot;
    });

  let released = false;
  return {
    release(): void {
      if (released) return;
      released = true;

      for (const snapshot of snapshots) {
        if (!document.documentElement.contains(snapshot.node)) continue;
        if (snapshot.inertSupported) {
          snapshot.node.inert = snapshot.inert ?? false;
        } else if (snapshot.ariaHidden === null) {
          snapshot.node.removeAttribute('aria-hidden');
        } else if (snapshot.ariaHidden !== undefined) {
          snapshot.node.setAttribute('aria-hidden', snapshot.ariaHidden);
        }
      }
    },
  };
}

export function trapTab(modal: HTMLElement, event: KeyboardEvent, dialogSelector: string): void {
  const dialog = modal.querySelector<HTMLElement>(dialogSelector);
  if (!dialog) return;

  const items = focusableElements(dialog);
  if (items.length === 0) {
    event.preventDefault();
    dialog.focus();
    return;
  }

  const first = items[0];
  const last = items.at(-1);
  if (!first || !last) return;

  const current = document.activeElement;
  if (event.shiftKey && (current === first || !dialog.contains(current))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && current === last) {
    event.preventDefault();
    first.focus();
  }
}

export function containFocus(modal: HTMLElement | null, event: FocusEvent, dialogSelector: string): void {
  if (!modal || modal.contains(event.target as Node)) return;
  const dialog = modal.querySelector<HTMLElement>(dialogSelector);
  if (!dialog) return;
  (focusableElements(dialog)[0] ?? dialog).focus();
}
