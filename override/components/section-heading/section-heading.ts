import { SectionHeadingController } from './controller.js';

const controller = new SectionHeadingController();

export function initializeSectionHeadings(): () => void {
  return controller.start();
}

export function destroySectionHeadings(): void {
  controller.stop();
}
