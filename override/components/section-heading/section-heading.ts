// Explica la responsabilidad de este archivo dentro del código propio y mantiene su lógica en el ámbito que le corresponde.
import { SectionHeadingController } from './controller.js';

const controller = new SectionHeadingController();

export function initializeSectionHeadings(): () => void {
  return controller.start();
}

export function destroySectionHeadings(): void {
  controller.stop();
}
