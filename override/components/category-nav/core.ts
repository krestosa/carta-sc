export {
  CATEGORY_SCROLL,
  CATEGORY_SELECTORS,
  desktopCategories,
} from './config.js';
export {
  anchorForHref,
  categoryLinks,
  cleanCategoryHash,
  closeLegacyCategoryMenus,
  isParentCategoryLink,
  subcategoryOwner,
} from './targets.js';
export {
  categoryOffset,
  categoryScrollPlan,
  categoryTargetY,
  confirmCategoryTarget,
  invalidateCategoryOffset,
  type ScrollPlan,
} from './scroll-geometry.js';
export {
  ProgrammaticCategoryScroll,
  type ProgrammaticScrollCallbacks,
} from './programmatic-scroll.js';
