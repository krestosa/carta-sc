import type { Cleanup } from '../core/types.js';
import type { MicroInteractionOptions, MotionEngine, MotionHandle } from './types.js';

export function bindMicroInteraction(
  engine: MotionEngine,
  reducedMotion: () => boolean,
  control: HTMLElement,
  target: HTMLElement | SVGElement,
  options: MicroInteractionOptions = {},
): Cleanup {
  let activeTween: MotionHandle | null = null;
  let destroyed = false;
  let hovered = false;
  let focused = false;
  let pressed = false;

  const focusVisible = (): boolean => {
    try {
      return control.matches(':focus-visible');
    } catch {
      return document.activeElement === control;
    }
  };

  const stopTween = (): void => {
    activeTween?.cancel();
    activeTween = null;
  };

  const rotationFor = (kind: 'active' | 'press'): number => {
    const value = Number(options[kind]?.rotation);
    return Number.isFinite(value) && value !== 0 ? value : kind === 'press' ? -6 : 12;
  };

  const clearTransform = (): void => {
    target.style.removeProperty('transform');
    target.style.removeProperty('will-change');
  };

  const move = (rotation: number, duration: number, easing: string, clearAtEnd: boolean): void => {
    if (destroyed) return;
    stopTween();
    if (reducedMotion()) {
      clearTransform();
      return;
    }

    target.style.transformOrigin = options.transformOrigin ?? '50% 50%';
    activeTween = engine.transform(target, { rotation }, {
      duration,
      ease: easing,
      onComplete: () => {
        activeTween = null;
        if (clearAtEnd) clearTransform();
      },
    });
  };

  const moveActive = (): void => move(
    rotationFor('active'),
    options.enterDuration ?? 0.1,
    options.enterEase ?? 'quart.out',
    false,
  );
  const moveHome = (): void => move(0, options.exitDuration ?? 0.14, options.exitEase ?? 'quart.out', true);

  const pulsePress = (): void => {
    if (destroyed) return;
    stopTween();
    if (reducedMotion()) {
      clearTransform();
      return;
    }

    const returnAngle = hovered || focused ? rotationFor('active') : 0;
    activeTween = engine.transform(target, { rotation: rotationFor('press') }, {
      duration: options.pressDuration ?? 0.055,
      ease: 'cubic.out',
      onComplete: () => {
        activeTween = engine.transform(target, { rotation: returnAngle }, {
          duration: options.pressReturnDuration ?? 0.085,
          ease: 'quart.out',
          onComplete: () => {
            activeTween = null;
            if (returnAngle === 0) clearTransform();
          },
        });
      },
    });
  };

  const onPointerEnter = (event: PointerEvent): void => {
    if (event.pointerType === 'touch' || hovered) return;
    hovered = true;
    if (!pressed) moveActive();
  };
  const onPointerLeave = (): void => {
    hovered = false;
    pressed = false;
    focused ? moveActive() : moveHome();
  };
  const onPointerDown = (): void => {
    pressed = true;
    pulsePress();
  };
  const onPointerUp = (): void => {
    pressed = false;
    hovered || focused ? moveActive() : moveHome();
  };
  const onFocus = (): void => {
    if (!focusVisible() || focused) return;
    focused = true;
    if (!pressed) moveActive();
  };
  const onBlur = (): void => {
    focused = false;
    pressed = false;
    hovered ? moveActive() : moveHome();
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return;
    pressed = true;
    pulsePress();
  };
  const onKeyUp = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    pressed = false;
    hovered || focused ? moveActive() : moveHome();
  };

  control.addEventListener('pointerenter', onPointerEnter);
  control.addEventListener('pointerleave', onPointerLeave);
  control.addEventListener('pointerdown', onPointerDown);
  control.addEventListener('pointerup', onPointerUp);
  control.addEventListener('pointercancel', onPointerLeave);
  control.addEventListener('focus', onFocus);
  control.addEventListener('blur', onBlur);
  control.addEventListener('keydown', onKeyDown);
  control.addEventListener('keyup', onKeyUp);

  return () => {
    if (destroyed) return;
    destroyed = true;
    control.removeEventListener('pointerenter', onPointerEnter);
    control.removeEventListener('pointerleave', onPointerLeave);
    control.removeEventListener('pointerdown', onPointerDown);
    control.removeEventListener('pointerup', onPointerUp);
    control.removeEventListener('pointercancel', onPointerLeave);
    control.removeEventListener('focus', onFocus);
    control.removeEventListener('blur', onBlur);
    control.removeEventListener('keydown', onKeyDown);
    control.removeEventListener('keyup', onKeyUp);
    stopTween();
    clearTransform();
  };
}
