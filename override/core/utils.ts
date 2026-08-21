import { motion } from '../motion/main.js';

export const text = (node: Node | null | undefined): string =>
  node?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

export const ready = (callback: () => void): void => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
    return;
  }
  callback();
};

export const each = <T>(
  list: ArrayLike<T> | null | undefined,
  callback: (value: T, index: number) => void,
): void => {
  Array.from(list ?? []).forEach(callback);
};

export const matches = (
  node: Element | null | undefined,
  selector: string,
): boolean => Boolean(node?.matches(selector));

export const visible = (node: HTMLElement | null | undefined): node is HTMLElement => {
  if (!node) return false;
  const rect = node.getBoundingClientRect();
  return rect.height > 0 && (node.offsetParent !== null || node.getClientRects().length > 0);
};

export const refreshMotion = (delay = 0): void => {
  requestAnimationFrame(() => motion.refresh(delay));
};
