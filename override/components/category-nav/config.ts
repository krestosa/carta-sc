import { systemTokens } from '../../core/tokens.generated.js';
import { queries } from '../../core/variables.js';

export const CATEGORY_SELECTORS = {
  select: '.JSgoMenu',
  scroller: '.sc-catalog-categories',
  mobileWrapper: '.fixedTopShop.wtopShopMenuMobile',
  mobileRail: '.topShopMenuMobile',
  mobileScroller: '.topShopMenuMobileScroller',
} as const;

export const CATEGORY_SCROLL = {
  offsetGap: Number.parseFloat(systemTokens.spacing.medium),
  currentMarkOffset: 2,
  programmaticGraceMs: 180,
  settleTolerance: 0.75,
} as const;

export const desktopCategories = queries.desktop;
