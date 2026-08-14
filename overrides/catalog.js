(function () {
  'use strict';

  if (window.__scCatalogOverrideBooted) return;
  window.__scCatalogOverrideBooted = true;

  var desktopQuery = window.matchMedia('(min-width: 993px)');
  var nav = null;
  var navHome = null;
  var navNext = null;
  var toolbar = null;
  var inlineStyles = new Map();
  var activeModal = null;
  var previousFocus = null;

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function text(node) {
    return node ? node.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  function imageSource(card) {
    var img = card.querySelector('.imgShop img, .imgLiquidNoFillShop img');
    if (img && img.getAttribute('src')) return img.getAttribute('src');

    var box = card.querySelector('.imgShop, .imgLiquidNoFillShop');
    if (!box) return '';

    var background = box.style.backgroundImage || window.getComputedStyle(box).backgroundImage || '';
    var match = background.match(/^url\(["']?(.*?)["']?\)$/);
    return match ? match[1] : '';
  }

  function normalizeParentLinks(root) {
    root.querySelectorAll('.nav-top-li > a.anchorLink').forEach(function (link) {
      if (!inlineStyles.has(link)) inlineStyles.set(link, link.getAttribute('style'));
      link.style.removeProperty('font-size');
    });
  }

  function restoreParentLinks() {
    inlineStyles.forEach(function (style, link) {
      if (!document.documentElement.contains(link)) return;
      if (style === null) link.removeAttribute('style');
      else link.setAttribute('style', style);
    });
  }

  function makeToolbar(container) {
    var root = document.createElement('div');
    root.className = 'sc-catalog-toolbar';
    root.setAttribute('aria-label', 'Categorías de la carta');

    var scroller = document.createElement('div');
    scroller.className = 'sc-catalog-categories';
    root.appendChild(scroller);

    container.insertBefore(root, container.firstChild);
    return root;
  }

  function refreshMotion() {
    window.requestAnimationFrame(function () {
      if (window.ScrollTrigger && typeof window.ScrollTrigger.refresh === 'function') {
        window.ScrollTrigger.refresh();
      }
      window.dispatchEvent(new Event('resize'));
    });
  }

  function applyDesktop() {
    if (!desktopQuery.matches) return;

    var container = document.querySelector('.containerShop');
    if (!container) return;

    container.querySelectorAll('.listadoShop.sc-first-catalog-section').forEach(function (list) {
      list.classList.remove('sc-first-catalog-section');
    });
    var firstSection = Array.prototype.find.call(container.querySelectorAll('.listadoShop'), function (list) {
      return !!list.querySelector('.productoShop, .titleShopSeccion');
    });
    if (firstSection) firstSection.classList.add('sc-first-catalog-section');

    if (!nav) {
      nav = document.querySelector('.fixedTopShop.wtopShopMenuMobile .wrapp-nav-tabsTopShop');
      if (!nav) return;
      navHome = nav.parentNode;
      navNext = nav.nextSibling;
    }

    if (!toolbar || !document.documentElement.contains(toolbar)) {
      toolbar = makeToolbar(container);
    }

    var scroller = toolbar.querySelector('.sc-catalog-categories');
    if (nav.parentNode !== scroller) scroller.appendChild(nav);

    normalizeParentLinks(nav);
    document.body.classList.add('sc-catalog-layout-ready');
    refreshMotion();
  }

  function restoreDesktop() {
    document.body.classList.remove('sc-catalog-layout-ready');
    document.querySelectorAll('.listadoShop.sc-first-catalog-section').forEach(function (list) {
      list.classList.remove('sc-first-catalog-section');
    });

    if (nav && navHome) {
      if (navNext && navNext.parentNode === navHome) navHome.insertBefore(nav, navNext);
      else navHome.appendChild(nav);
    }

    restoreParentLinks();

    if (toolbar && toolbar.parentNode) toolbar.parentNode.removeChild(toolbar);
    toolbar = null;
    refreshMotion();
  }

  function syncLayout() {
    if (desktopQuery.matches) applyDesktop();
    else restoreDesktop();
  }

  function cloneFlavorIcons(card, target) {
    var source = card.querySelector('.title-shop1 .sabores');
    if (!source || !source.children.length) return;

    var flavors = source.cloneNode(true);
    flavors.querySelectorAll('img').forEach(function (img) {
      if (!img.getAttribute('alt')) {
        img.setAttribute('alt', img.getAttribute('data-original-title') || '');
      }
      img.removeAttribute('data-toggle');
    });
    target.appendChild(flavors);
  }

  function closeModal(event) {
    if (event) event.preventDefault();
    if (!activeModal) return;

    var modal = activeModal;
    activeModal = null;
    modal.classList.remove('is-visible');
    document.body.classList.remove('sc-product-modal-open');

    window.setTimeout(function () {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 190);

    if (previousFocus && document.documentElement.contains(previousFocus)) {
      try { previousFocus.focus({ preventScroll: true }); }
      catch (error) { previousFocus.focus(); }
    }
    previousFocus = null;
  }

  function buildModal(link) {
    var card = link.closest('.productoShop');
    if (!card || !desktopQuery.matches) return null;

    var productName = text(card.querySelector('.title-shop1'));
    var description = text(card.querySelector('.descrip'));
    var src = imageSource(card);
    var titleId = 'sc-product-modal-title';

    var overlay = document.createElement('div');
    overlay.className = 'sc-product-modal';
    overlay.setAttribute('role', 'presentation');

    var dialog = document.createElement('section');
    dialog.className = 'sc-product-modal__dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', titleId);
    dialog.setAttribute('tabindex', '-1');

    var close = document.createElement('button');
    close.className = 'sc-product-modal__close';
    close.type = 'button';
    close.setAttribute('aria-label', 'Cerrar detalle del producto');
    close.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/></svg>';
    close.addEventListener('click', closeModal);

    var stage = document.createElement('div');
    stage.className = 'sc-product-modal__image-stage';
    if (src) {
      var image = document.createElement('img');
      image.className = 'sc-product-modal__image';
      image.src = src;
      image.alt = productName;
      image.decoding = 'async';
      stage.appendChild(image);
    }

    var content = document.createElement('div');
    content.className = 'sc-product-modal__content';

    var title = document.createElement('h2');
    title.className = 'sc-product-modal__title';
    title.id = titleId;
    cloneFlavorIcons(card, title);
    title.appendChild(document.createTextNode(productName));
    content.appendChild(title);

    if (description) {
      var copy = document.createElement('p');
      copy.className = 'sc-product-modal__description';
      copy.textContent = description;
      content.appendChild(copy);
    }

    var sourcePrice = card.querySelector('.priceRow');
    if (sourcePrice) {
      var price = sourcePrice.cloneNode(true);
      price.className = 'sc-product-modal__price-row';
      price.querySelectorAll('.sumar, input, button').forEach(function (node) { node.remove(); });
      content.appendChild(price);
    }

    dialog.appendChild(close);
    dialog.appendChild(stage);
    dialog.appendChild(content);
    overlay.appendChild(dialog);

    overlay.addEventListener('mousedown', function (event) {
      if (event.target === overlay) closeModal(event);
    });

    return overlay;
  }

  function openModal(link) {
    if (activeModal) closeModal();

    var modal = buildModal(link);
    if (!modal) return;

    previousFocus = link;
    document.body.appendChild(modal);
    document.body.classList.add('sc-product-modal-open');
    activeModal = modal;

    window.requestAnimationFrame(function () {
      if (activeModal !== modal) return;
      modal.classList.add('is-visible');
      var dialog = modal.querySelector('.sc-product-modal__dialog');
      try { dialog.focus({ preventScroll: true }); }
      catch (error) { dialog.focus(); }
    });
  }

  function enhanceProductLinks() {
    document.querySelectorAll('a.fancyboxModalAddProd').forEach(function (link) {
      var card = link.closest('.productoShop');
      var name = text(card && card.querySelector('.title-shop1'));
      link.setAttribute('aria-haspopup', 'dialog');
      if (name) link.setAttribute('aria-label', 'Ver detalle de ' + name);
    });
  }

  function installModal() {
    enhanceProductLinks();

    document.addEventListener('click', function (event) {
      var link = event.target.closest && event.target.closest('a.fancyboxModalAddProd');
      if (!link || !desktopQuery.matches) return;
      if (event.button && event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      openModal(link);
    }, true);

    document.addEventListener('keydown', function (event) {
      if (!activeModal) return;
      if (event.key === 'Escape' || event.key === 'Esc') {
        event.preventDefault();
        closeModal();
      }
    });
  }

  ready(function () {
    syncLayout();
    installModal();

    if (desktopQuery.addEventListener) desktopQuery.addEventListener('change', syncLayout);
    else desktopQuery.addListener(syncLayout);
  });
})();
