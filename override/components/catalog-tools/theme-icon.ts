import type { ThemeMode } from '../../core/types.js';
import { motionTokens, queries } from '../../core/variables.js';
import { motion } from '../../motion/main.js';
import type { MotionHandle } from '../../motion/types.js';

export interface ThemeIconParts {
  readonly button: HTMLButtonElement;
  readonly svg: SVGElement;
  readonly rotor: SVGGraphicsElement;
  readonly core: SVGPathElement;
  readonly bite: SVGElement;
  readonly ring: SVGElement;
  readonly rays: SVGElement;
  readonly lines: SVGLineElement[];
}

const SUN_PATH = 'M12 7.3A4.7 4.7 0 1 1 12 16.7A4.7 4.7 0 1 1 12 7.3Z';
const MOON_PATH = 'M12 3A9 9 0 1 1 12 21A9 9 0 1 1 12 3Z';
const AUTO_PATH = 'M12 3.6a8.4 8.4 0 0 1 0 16.8z';
const MOON_BITE = { cx: 18.3, cy: 6.2, radius: 8.6 } as const;

export class ThemeIconController {
  readonly #partsCache = new WeakMap<HTMLElement, ThemeIconParts>();
  #geometryToken = 0;
  #handles: MotionHandle[] = [];

  parts(root: HTMLElement | null): ThemeIconParts | null {
    if (!root) return null;
    const cached = this.#partsCache.get(root);
    if (cached) return cached;

    const button = root.querySelector<HTMLButtonElement>('.sc-theme-toggle');
    const svg = button?.querySelector<SVGElement>('[data-sc-theme-icon]');
    const rotor = button?.querySelector<SVGGraphicsElement>('[data-sc-theme-rotor]');
    const core = button?.querySelector<SVGPathElement>('[data-sc-theme-core]');
    const bite = button?.querySelector<SVGElement>('[data-sc-theme-bite]');
    const ring = button?.querySelector<SVGElement>('[data-sc-theme-auto-ring]');
    const rays = button?.querySelector<SVGElement>('[data-sc-theme-rays]');
    const lines = button ? Array.from(button.querySelectorAll<SVGLineElement>('[data-sc-theme-rays] line')) : [];
    if (!button || !svg || !rotor || !core || !bite || !ring || !rays || lines.length !== 8) return null;

    const parts = { button, svg, rotor, core, bite, ring, rays, lines };
    this.#partsCache.set(root, parts);
    return parts;
  }

  stop(): void {
    this.#geometryToken += 1;
    const handles = this.#handles;
    this.#handles = [];
    for (const handle of handles) handle.cancel();
  }

  setStatic(root: HTMLElement, mode: ThemeMode): void {
    this.stop();
    this.applyStatic(root, mode);
  }

  applyStatic(root: HTMLElement, mode: ThemeMode): void {
    const parts = this.parts(root);
    if (!parts) return;

    parts.core.setAttribute('d', mode === 'system' ? AUTO_PATH : mode === 'dark' ? MOON_PATH : SUN_PATH);
    this.#setAttributes(parts.bite, {
      cx: MOON_BITE.cx,
      cy: MOON_BITE.cy,
      r: mode === 'dark' ? MOON_BITE.radius : 0,
    });
    this.#setAttributes(parts.ring, { r: 8.4 });
    parts.ring.style.opacity = mode === 'system' ? '1' : '0';
    this.#prepareRays(parts, mode === 'light' ? 0 : 1);
    parts.rays.style.opacity = mode === 'light' ? '1' : '0';
    parts.rotor.style.transform = 'rotate(0deg)';
    parts.rotor.style.removeProperty('will-change');
    parts.svg.setAttribute('data-sc-theme-glyph-state', mode);
    root.setAttribute('data-sc-theme-prepaint-ready', '1');
    root.removeAttribute('data-sc-theme-animating');
  }

  animate(root: HTMLElement, from: ThemeMode, to: ThemeMode): void {
    const parts = this.parts(root);
    if (!parts || from === to) return;
    if (queries.reducedMotion.matches) {
      this.setStatic(root, to);
      return;
    }

    const continuing = root.hasAttribute('data-sc-theme-animating');
    this.stop();
    const token = this.#geometryToken;
    if (!continuing) this.applyStatic(root, from);

    root.setAttribute('data-sc-theme-animating', 'true');
    parts.svg.setAttribute('data-sc-theme-glyph-state', to);
    parts.rotor.style.willChange = 'transform';
    const path = to === 'system' ? AUTO_PATH : to === 'dark' ? MOON_PATH : SUN_PATH;
    const direction = to === 'dark' ? -1 : 1;

    this.#track(motion.engine.springPath(parts.core, path, motionTokens.springs.spatial.fast));
    this.#track(motion.engine.springAttributes(
      parts.bite,
      { cx: MOON_BITE.cx, cy: MOON_BITE.cy, r: to === 'dark' ? MOON_BITE.radius : 0 },
      motionTokens.springs.spatial.fast,
    ));
    this.#track(motion.engine.springAttributes(parts.ring, { r: 8.4 }, motionTokens.springs.spatial.fast));
    this.#track(motion.engine.opacity(parts.ring, to === 'system' ? 1 : 0, {
      duration: motionTokens.durations.short3,
      ease: motionTokens.easings.standard,
    }));
    this.#track(motion.engine.springTransform(
      parts.rotor,
      { rotation: direction * 5.5 },
      motionTokens.springs.spatial.fast,
      {
        onComplete: () => {
          if (token !== this.#geometryToken) return;
          this.#track(motion.engine.springTransform(parts.rotor, { rotation: 0 }, motionTokens.springs.spatial.fast));
        },
      },
    ));

    for (const line of parts.lines) {
      if (line.getAttribute('pathLength') !== '1') line.setAttribute('pathLength', '1');
      line.style.strokeDasharray = '1';
    }
    if (to === 'light') {
      parts.rays.style.opacity = '1';
      parts.lines.forEach((line, index) => this.#springRay(
        line,
        0,
        index * (motionTokens.durations.short1 / 4),
      ));
    } else {
      [...parts.lines].reverse().forEach((line, index) => this.#springRay(
        line,
        1,
        index * (motionTokens.durations.short1 / 4),
      ));
      this.#track(motion.engine.opacity(parts.rays, 0, {
        duration: motionTokens.durations.short2,
        delay: motionTokens.durations.short1,
        ease: motionTokens.easings.accelerate,
      }));
    }

    this.#track(motion.engine.delay(motionTokens.durations.medium3, () => {
      if (token !== this.#geometryToken) return;
      this.#handles = [];
      this.applyStatic(root, to);
    }));
  }

  #setAttributes(node: Element, values: Readonly<Record<string, string | number>>): void {
    for (const [name, value] of Object.entries(values)) node.setAttribute(name, String(value));
  }

  #track(handle: MotionHandle): MotionHandle {
    this.#handles.push(handle);
    return handle;
  }

  #prepareRays(parts: ThemeIconParts, offset: number): void {
    for (const line of parts.lines) {
      if (line.getAttribute('pathLength') !== '1') line.setAttribute('pathLength', '1');
      line.style.strokeDasharray = '1';
      line.style.strokeDashoffset = String(offset);
    }
  }

  #springRay(line: SVGLineElement, to: number, delay: number): void {
    const from = Number.parseFloat(line.style.strokeDashoffset || line.getAttribute('stroke-dashoffset') || '0');
    this.#track(motion.engine.spring(motionTokens.springs.effects.fast, (progress) => {
      line.style.strokeDashoffset = String(from + (to - from) * progress);
    }, { delay }));
  }
}
