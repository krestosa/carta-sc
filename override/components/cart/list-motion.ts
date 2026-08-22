import { motion } from '../../motion/main.js';
import { motionTokens } from '../../core/variables.js';
import type { MotionEngine, MotionHandle } from '../../motion/types.js';

const LIST_MOTION = {
  offsetY: 4,
  stagger: motionTokens.durations.short1 / 2,
  reducedStagger: motionTokens.durations.short1 / 2,
  refreshDelay: 80,
} as const;

function visibleRows(table: HTMLElement): HTMLTableRowElement[] {
  return Array.from(table.querySelectorAll<HTMLTableRowElement>('tr')).filter(
    (row) => !row.matches('.total, .subtotal, .ahorro') && (row.offsetParent !== null || row.getClientRects().length > 0),
  );
}

function elementFromNode(node: Node | null): Element | null {
  if (node instanceof Element) return node;
  return node?.parentElement ?? null;
}

function affectsCart(mutation: MutationRecord): boolean {
  if (elementFromNode(mutation.target)?.closest('.carritoTable')) return true;
  return Array.from(mutation.addedNodes).some(
    (node) => node instanceof Element && (node.matches('.carritoTable,tr,.carritoFixedContent,.carritoBox,.shop_carrito') || Boolean(node.querySelector('.carritoTable,tr'))),
  );
}

export function setupCartList(engine: MotionEngine, reduced: boolean): () => void {
  const animatedRows = new WeakSet<HTMLTableRowElement>();
  const active = new WeakMap<HTMLTableRowElement, MotionHandle[]>();
  let observer: MutationObserver | null = null;
  let frame = 0;

  const clear = (row: HTMLTableRowElement): void => {
    for (const property of ['transform', 'opacity', 'visibility', 'will-change']) row.style.removeProperty(property);
  };
  const stop = (row: HTMLTableRowElement): void => {
    for (const handle of active.get(row) ?? []) handle.cancel();
    active.delete(row);
  };

  const animateRow = (row: HTMLTableRowElement, index: number): void => {
    stop(row);
    const delay = index * (reduced ? LIST_MOTION.reducedStagger : LIST_MOTION.stagger);
    row.style.opacity = '0';
    row.style.visibility = 'visible';
    if (!reduced) row.style.transform = `translate3d(0,${LIST_MOTION.offsetY}px,0)`;

    const fadeDuration = reduced ? motionTokens.durations.short2 : motionTokens.durations.short4;
    const handles: MotionHandle[] = [
      engine.opacity(row, 1, {
        duration: fadeDuration,
        delay,
        ease: motionTokens.easings.decelerate,
      }),
    ];
    if (reduced) {
      handles.push(engine.delay(delay + fadeDuration, () => {
        active.delete(row);
        clear(row);
      }));
    } else {
      handles.push(engine.springTransform(row, { y: 0 }, motionTokens.springs.spatial.default, {
        delay,
        clear: true,
        onComplete: () => {
          active.delete(row);
          clear(row);
        },
      }));
    }
    active.set(row, handles);
  };

  const scan = (): void => {
    frame = 0;
    let changed = false;
    for (const table of document.querySelectorAll<HTMLElement>('.carritoTable')) {
      const fresh = visibleRows(table).filter((row) => !animatedRows.has(row));
      if (fresh.length === 0) continue;
      fresh.forEach((row) => animatedRows.add(row));
      fresh.forEach(animateRow);
      changed = true;
    }
    if (changed) motion.refresh(LIST_MOTION.refreshDelay);
  };

  const schedule = (): void => {
    if (!frame) frame = requestAnimationFrame(scan);
  };

  scan();
  if (document.body) {
    observer = new MutationObserver((mutations) => {
      if (mutations.some(affectsCart)) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  return () => {
    observer?.disconnect();
    if (frame) cancelAnimationFrame(frame);
    for (const row of document.querySelectorAll<HTMLTableRowElement>('.carritoTable tr')) {
      stop(row);
      clear(row);
    }
  };
}
