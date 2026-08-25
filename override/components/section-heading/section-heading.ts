// Documenta la responsabilidad de section heading dentro del componente section heading y mantiene esa lógica en su propietario.
import { SectionHeadingController } from './controller.js';

const controller = new SectionHeadingController();

export function initializeSectionHeadings(): () => void {
  return controller.start();
}

export function destroySectionHeadings(): void {
  controller.stop();
}
