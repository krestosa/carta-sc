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
let overlay: HTMLElement | null = null;
let activeAnimations: CancellableAnimation[] = [];
let transitionToken = 0;

export function capturePalette(): PaletteSnapshot {
  const style = getComputedStyle(root);
  return {
    '--sc-color-ink': style.getPropertyValue('--sc-color-ink').trim(),
    '--sc-color-surface': style.getPropertyValue('--sc-color-surface').trim(),
  };
}

function overlayElement(): HTMLElement | null {
  if (overlay && document.documentElement.contains(overlay)) return overlay;
  if (!document.body) return null;

  overlay = document.createElement('div');
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
  return overlay;
}

function stopAnimations(): void {
  const animations = activeAnimations;
  activeAnimations = [];
  for (const animation of animations) {
    try { animation.cancel(); } catch { /* La animación ya puede haber terminado. */ }
  }
}

function resetOverlay(): void {
  if (!overlay) return;
  overlay.style.opacity = '0';
  overlay.style.backgroundColor = 'transparent';
  overlay.style.removeProperty('will-change');
}

export function cancelPaletteTransition(): void {
  transitionToken += 1;
  stopAnimations();
  resetOverlay();
}

function fade(
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
  activeAnimations.push(animation);
  void animation.finished.then(() => {
    if (token !== transitionToken) return;
    node.style.opacity = String(to);
    done();
  }).catch(() => undefined);
  return true;
}

export function transitionPalette(
  commit: () => void,
  prepared?: (context: PaletteTransitionContext) => void,
): PaletteTransitionContext {
  const from = capturePalette();
  const node = overlayElement();
  cancelPaletteTransition();
  const token = transitionToken;
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
    if (token !== transitionToken) return;
    stopAnimations();
    resetOverlay();
  };
  const reveal = (): void => {
    if (token !== transitionToken) return;
    requestAnimationFrame(() => {
      if (token !== transitionToken) return;
      if (!fade(node, 1, 0, half * 1000, finish, token)) finish();
    });
  };
  const swap = (): void => {
    if (token !== transitionToken) return;
    commit();
    reveal();
  };

  if (!fade(node, 0, 1, half * 1000, swap, token)) {
    commit();
    resetOverlay();
  }
  return context;
}
