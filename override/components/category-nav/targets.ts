import { selectors } from '../../core/variables.js';

export function anchorForHref(href: string | null): HTMLElement | null {
  if (!href?.startsWith('#') || href === '#') return null;
  let id = href.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {
    // El hash puede contener escapes legacy inválidos.
  }
  return document.getElementById(id)
    ?? (document.getElementsByName(id)[0] as HTMLElement | undefined)
    ?? null;
}

export function isParentCategoryLink(element: Element): element is HTMLAnchorElement {
  return element.matches('a.anchorLink[href^="#"]')
    && !element.classList.contains('anchorLinkSub')
    && !element.closest('.topPullDown,.dropdown-menu');
}

export function categoryLinks(root: ParentNode = document): HTMLAnchorElement[] {
  return Array.from(root.querySelectorAll<HTMLAnchorElement>('a.anchorLink[href^="#"]'))
    .filter(isParentCategoryLink);
}

export function subcategoryOwner(link: Element | null): HTMLElement | null {
  if (!link) return null;
  const parentHref = link.getAttribute('data-sc-parent-href');
  if (parentHref) return anchorForHref(parentHref);

  const nested = link.closest('.topPullDown');
  const parent = nested?.closest('.nav-top-li')
    ?.querySelector<HTMLAnchorElement>(':scope > a.anchorLink[href^="#"]');
  return parent ? anchorForHref(parent.getAttribute('href')) : null;
}

export function closeLegacyCategoryMenus(): void {
  document.querySelectorAll(selectors.legacyPullDownOpen)
    .forEach((node) => node.classList.remove('open'));
  document.querySelectorAll(selectors.legacyMobileOpen)
    .forEach((node) => node.classList.remove('_open'));
}

export function cleanCategoryHash(): void {
  if (!/^#anchor/i.test(location.hash)) return;
  try {
    history.replaceState(history.state, document.title, location.pathname + location.search);
  } catch {
    // history puede estar restringido.
  }
}
