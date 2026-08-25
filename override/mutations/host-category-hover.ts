import { selectors } from '../core/variables.js';
import { type Cleanup } from '../core/types.js';

const REPAIR_DELAYS = [0, 120] as const;

export function closeHostCategoryMenus(): void {
  document.querySelectorAll<Element>(selectors.hostPullDownOpen).forEach((node) => node.classList.remove('open'));
  document.querySelectorAll<Element>(selectors.hostMobileOpen).forEach((node) => node.classList.remove('_open'));
}

export function stripHostCategoryHoverHandlers(): void {
  closeHostCategoryMenus();
  if (!window.jQuery) return;
  window.jQuery('.nav-tabsTopShop .anchorLink').off('mouseenter');
  window.jQuery('.nav-top-li').off('mouseleave');
}

export function initializeHostCategoryHover(): Cleanup {
  let active = true;
  const timers = new Set<number>();

  stripHostCategoryHoverHandlers();
  for (const delay of REPAIR_DELAYS) {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      if (active) stripHostCategoryHoverHandlers();
    }, delay);
    timers.add(timer);
  }

  return () => {
    active = false;
    timers.forEach(clearTimeout);
    timers.clear();
  };
}
