import type { CatalogViewMode } from '../../core/types.js';
import { catalogViewIcon } from './view-icon-geometry.js';

export function ensureCatalogViewIconPresentation(host: SVGElement): void {
  catalogViewIcon.ensurePresentation(host);
}

export function stopCatalogViewIconMotion(host: SVGElement): void {
  catalogViewIcon.stop(host);
}

export function syncCatalogViewControl(root: HTMLElement, mode: CatalogViewMode, animate = false): void {
  catalogViewIcon.syncControl(root, mode, animate);
}
