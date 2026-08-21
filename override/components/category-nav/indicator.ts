import { CategoryIndicatorController } from './indicator-controller.js';

const indicator = new CategoryIndicatorController();

export function moveCategoryIndicator(target: Element | null, animateMotion: boolean): void {
  indicator.move(target, animateMotion);
}

export function markCategoryIndicatorDirty(): void {
  indicator.markDirty();
}

export function isCategoryIndicatorDirty(): boolean {
  return indicator.isDirty();
}

export function pauseCategoryIndicator(): void {
  indicator.pause();
}

export function resumeCategoryIndicator(): void {
  indicator.resume();
}
