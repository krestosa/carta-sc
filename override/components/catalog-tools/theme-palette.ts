import { queries } from '../../core/variables.js';

export interface PaletteSnapshot {
  readonly [property: string]: string;
}

export interface PaletteTransitionContext {
  readonly from: PaletteSnapshot;
  readonly to: PaletteSnapshot;
  readonly duration: number;
  readonly token: number;
  readonly fade: boolean;
}

type CancellableAnimation = Pick<Animation, 'cancel'>;

const root = document.documentElement;

class ThemePaletteTransitionController {
  #overlay: HTMLElement | null = null;
  #activeAnimations: CancellableAnimation[] = [];
  #transitionToken = 0;

  capture(): PaletteSnapshot {
    const style = getComputedStyle(root);
    return {
      '--sc-color-ink': style.getPropertyValue('--sc-color-ink').trim(),
      '--sc-color-surface': style.getPropertyValue('--sc-color-surface').trim(),
    };
  }

  cancel(): void {
    this.#transitionToken += 1;
    this.#stopAnimations();
    this.#resetOverlay();
  }

  transition(
    commit: () => void,
    prepared?: (context: PaletteTransitionContext) => void,
  ): PaletteTransitionContext {
    const from = this.capture();
    const node = this.#overlayElement();
    this.cancel();
    const token = this.#transitionToken;
    const duration = queries.reducedMotion.matches ? 0.18 : 0.56;
    const half = duration / 2;
    const context: PaletteTransitionContext = { from, to: from, duration, token, fade: true };

    if (!node) {
      commit();
      return context;
    }

    node.style.backgroundColor = from['--sc-color-surface'] || '#000';
    node.style.opacity = '0';
    node.style.willChange = 'opacity';
    prepared?.(context);

    const finish = (): void => {
      if (token !== this.#transitionToken) return;
      this.#stopAnimations();
      this.#resetOverlay();
    };
    const reveal = (): void => {
      if (token !== this.#transitionToken) return;
      requestAnimationFrame(() => {
        if (token !== this.#transitionToken) return;
        if (!this.#fade(node, 1, 0, half * 1000, finish, token)) finish();
      });
    };
    const swap = (): void => {
      if (token !== this.#transitionToken) return;
      commit();
      reveal();
    };

    if (!this.#fade(node, 0, 1, half * 1000, swap, token)) {
      commit();
      this.#resetOverlay();
    }
    return context;
  }

  #overlayElement(): HTMLElement | null {
    if (this.#overlay && document.documentElement.contains(this.#overlay)) return this.#overlay;
    if (!document.body) return null;

    const overlay = document.createElement('div');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.className = 'sc-theme-fade-layer';
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483646',
      pointerEvents: 'none',
      opacity: '0',
      backgroundColor: 'transparent',
      transform: 'translateZ(0)',
      backfaceVisibility: 'hidden',
      contain: 'strict',
    });
    document.body.append(overlay);
    this.#overlay = overlay;
    return overlay;
  }

  #stopAnimations(): void {
    const animations = this.#activeAnimations.splice(0);
    for (const animation of animations) {
      try {
        animation.cancel();
      } catch {
        // La animación ya puede haber terminado.
      }
    }
  }

  #resetOverlay(): void {
    if (!this.#overlay) return;
    this.#overlay.style.opacity = '0';
    this.#overlay.style.backgroundColor = 'transparent';
    this.#overlay.style.removeProperty('will-change');
  }

  #fade(
    node: HTMLElement,
    from: number,
    to: number,
    durationMs: number,
    done: () => void,
    token: number,
  ): boolean {
    if (typeof node.animate !== 'function') return false;
    const animation = node.animate([{ opacity: from }, { opacity: to }], {
      duration: durationMs,
      easing: 'cubic-bezier(.37,0,.63,1)',
      fill: 'forwards',
    });
    this.#activeAnimations.push(animation);
    void animation.finished.then(() => {
      if (token !== this.#transitionToken) return;
      node.style.opacity = String(to);
      done();
    }).catch(() => undefined);
    return true;
  }
}

const paletteTransition = new ThemePaletteTransitionController();

export function capturePalette(): PaletteSnapshot {
  return paletteTransition.capture();
}

export function cancelPaletteTransition(): void {
  paletteTransition.cancel();
}

export function transitionPalette(
  commit: () => void,
  prepared?: (context: PaletteTransitionContext) => void,
): PaletteTransitionContext {
  return paletteTransition.transition(commit, prepared);
}
