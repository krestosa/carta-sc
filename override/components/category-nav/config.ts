import { queries } from '../../core/variables.js';

export const CATEGORY_SELECTORS = {
  select: '.JSgoMenu',
  scroller: '.sc-catalog-categories',
  mobileWrapper: '.fixedTopShop.wtopShopMenuMobile',
  mobileRail: '.topShopMenuMobile',
  mobileScroller: '.topShopMenuMobileScroller',
} as const;

export const CATEGORY_SCROLL = {
  offsetGap: 12,
  currentMarkOffset: 2,
  programmaticGraceMs: 180,
  minDuration: 0.72,
  maxDuration: 1.36,
  distanceScale: 2400,
  distancePower: 0.62,
  settleTolerance: 0.75,
} as const;

export const desktopCategories = queries.desktop;
