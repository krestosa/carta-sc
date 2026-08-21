import { selectors } from '../core/variables.js';
import { type Cleanup } from '../core/types.js';

const REPAIR_DELAYS = [0, 120] as const;

export function closeLegacyCategoryMenus(): void {
  document.querySelectorAll<Element>(selectors.legacyPullDownOpen).forEach((node) => node.classList.remove('open'));
  document.querySelectorAll<Element>(selectors.legacyMobileOpen).forEach((node) => node.classList.remove('_open'));
}

export function stripLegacyCategoryHoverHandlers(): void {
  closeLegacyCategoryMenus();
  if (!window.jQuery) return;
  window.jQuery('.nav-tabsTopShop .anchorLink').off('mouseenter');
  window.jQuery('.nav-top-li').off('mouseleave');
}

export function initializeLegacyCategoryHover(): Cleanup {
  let active = true;
  const timers = new Set<number>();

  stripLegacyCategoryHoverHandlers();
  for (const delay of REPAIR_DELAYS) {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      if (active) stripLegacyCategoryHoverHandlers();
    }, delay);
    timers.add(timer);
  }

  return () => {
    active = false;
    timers.forEach(clearTimeout);
    timers.clear();
  };
}
