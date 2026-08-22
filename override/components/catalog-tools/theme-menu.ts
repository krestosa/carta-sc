import type { Cleanup } from '../../core/types.js';
import { anchoredPopoverMotion } from '../../motion/popover-motion.js';

export interface ThemeMenuCallbacks {
  readonly select: (value: string) => void;
}

export class ThemeMenuController {
  readonly #root: HTMLElement;
  readonly #button: HTMLButtonElement;
  readonly #menu: HTMLElement;
  readonly #control: HTMLElement;
  readonly #items: HTMLElement[];
  readonly #callbacks: ThemeMenuCallbacks;

  constructor(root: HTMLElement, callbacks: ThemeMenuCallbacks) {
    const button = root.querySelector<HTMLButtonElement>('.sc-theme-toggle');
    const menu = root.querySelector<HTMLElement>('.sc-theme-menu');
    const control = button?.closest<HTMLElement>('.sc-theme-control');
    if (!button || !menu || !control) throw new Error('[SushiClub theme] Control incompleto');

    this.#root = root;
    this.#button = button;
    this.#menu = menu;
    this.#control = control;
    this.#items = Array.from(root.querySelectorAll<HTMLElement>('[data-sc-theme-option]'));
    this.#callbacks = callbacks;
  }

  static create(root: HTMLElement, callbacks: ThemeMenuCallbacks): ThemeMenuController | null {
    const button = root.querySelector('.sc-theme-toggle');
    const menu = root.querySelector('.sc-theme-menu');
    const control = button?.closest('.sc-theme-control');
    return button && menu && control ? new ThemeMenuController(root, callbacks) : null;
  }

  get button(): HTMLButtonElement {
    return this.#button;
  }

  install(): Cleanup {
    this.#button.addEventListener('click', this.#onToggle);
    this.#menu.addEventListener('click', this.#onChoose);
    this.#root.addEventListener('keydown', this.#onKeyDown);
    document.addEventListener('pointerdown', this.#onOutsidePointer, true);

    return () => {
      this.#button.removeEventListener('click', this.#onToggle);
      this.#menu.removeEventListener('click', this.#onChoose);
      this.#root.removeEventListener('keydown', this.#onKeyDown);
      document.removeEventListener('pointerdown', this.#onOutsidePointer, true);
      anchoredPopoverMotion.cancel(this.#menu);
      this.#menu.classList.remove('sc-theme-menu-open');
      this.#menu.setAttribute('aria-hidden', 'true');
    };
  }

  setOpen(open: boolean, focusOption = false): void {
    this.#button.setAttribute('aria-expanded', String(open));

    if (open) {
      this.#menu.classList.add('sc-theme-menu-open');
      this.#menu.setAttribute('aria-hidden', 'false');
      anchoredPopoverMotion.open(this.#menu, this.#button);
      if (focusOption) {
        (this.#menu.querySelector<HTMLElement>('[aria-checked="true"]')
          ?? this.#menu.querySelector<HTMLElement>('.sc-theme-option'))?.focus();
      }
      return;
    }

    anchoredPopoverMotion.close(this.#menu, this.#button, () => {
      this.#menu.classList.remove('sc-theme-menu-open');
      this.#menu.setAttribute('aria-hidden', 'true');
    });
  }

  #onToggle = (event: MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    this.setOpen(this.#button.getAttribute('aria-expanded') !== 'true');
  };

  #onChoose = (event: MouseEvent): void => {
    const option = event.target instanceof Element
      ? event.target.closest<HTMLElement>('[data-sc-theme-option]')
      : null;
    if (!option || !this.#menu.contains(option)) return;

    event.preventDefault();
    event.stopPropagation();
    this.#callbacks.select(option.getAttribute('data-sc-theme-option') ?? '');
    this.setOpen(false);
    this.#button.focus();
  };

  #onOutsidePointer = (event: PointerEvent): void => {
    if (this.#button.getAttribute('aria-expanded') !== 'true') return;
    if (event.target instanceof Node && !this.#control.contains(event.target)) this.setOpen(false);
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const index = target ? this.#items.indexOf(target) : -1;

    if (target === this.#button && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      this.setOpen(true, true);
      return;
    }
    if (this.#button.getAttribute('aria-expanded') !== 'true') return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.setOpen(false);
      this.#button.focus();
      return;
    }
    if (index < 0 || this.#items.length === 0) return;

    const nextIndex = this.#nextIndex(event.key, index);
    if (nextIndex === null) return;
    event.preventDefault();
    this.#items[nextIndex]?.focus();
  };

  #nextIndex(key: string, index: number): number | null {
    if (key === 'ArrowDown' || key === 'ArrowRight') return (index + 1) % this.#items.length;
    if (key === 'ArrowUp' || key === 'ArrowLeft') return (index - 1 + this.#items.length) % this.#items.length;
    if (key === 'Home') return 0;
    if (key === 'End') return this.#items.length - 1;
    return null;
  }
}
