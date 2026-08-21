import { ProductModalController } from './controller.js';

const productModal = new ProductModalController();

export function closeProductModal(event?: Event): void {
  event?.preventDefault();
  productModal.close();
}

export function openProductModal(link: HTMLElement): void {
  productModal.open(link);
}

export function initializeProductModal(): () => void {
  return productModal.initialize();
}

export function destroyProductModal(): void {
  productModal.destroy();
}

export function getActiveProductModal(): HTMLElement | null {
  return productModal.activeModal;
}

export function isProductModalClosing(): boolean {
  return productModal.isClosing;
}
