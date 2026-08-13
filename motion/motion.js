(function () {
    'use strict';

    if (window.__scUxMotionBooted) return;
    window.__scUxMotionBooted = true;

    var GSAP_SRC = 'https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js';
    var SCROLL_TRIGGER_SRC = 'https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js';
    var SCROLL_TO_SRC = 'https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollToPlugin.min.js';

    var MOTION = {
        productInitial: 0.34,
        productReveal: 0.34,
        productStagger: 0.030,
        cartList: 0.18,
        cartStagger: 0.028,
        cartFollow: 0.14,
        badgeUp: 0.07,
        badgeDown: 0.10,
        dropdown: 0.16,
        indicatorNear: 0.18,
        indicatorFar: 0.40,
        indicatorDistance: 680
    };

    var SCROLL = {
        minDuration: 0.10,
        maxDuration: 0.65,
        nearSpeed: 3000,
        farSpeed: 18000,
        speedDistance: 7000
    };

    var EASE = {
        enter: 'power2.out',
        follow: 'power3.out',
        indicatorLead: 'power3.out',
        indicatorSettle: 'power2.inOut',
        scroll: 'power2.inOut'
    };

    function loadScript(src, id, done) {
        var existing = document.getElementById(id);

        if (existing) {
            if (existing.getAttribute('data-loaded') === 'true') {
                done();
                return;
            }
            existing.addEventListener('load', done, { once: true });
            return;
        }

        var script = document.createElement('script');
        script.id = id;
        script.src = src;
        script.async = true;
        script.onload = function () {
            script.setAttribute('data-loaded', 'true');
            done();
        };
        script.onerror = function () {
            console.warn('[SushiClub UX motion] No se pudo cargar:', src);
        };
        document.head.appendChild(script);
    }

    function ready(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn, { once: true });
        } else {
            fn();
        }
    }

    function visibleElements(selector) {
        return Array.prototype.filter.call(document.querySelectorAll(selector), function (element) {
            return element.offsetParent !== null || element.getClientRects().length > 0;
        });
    }

    function initMotion() {
        if (!window.gsap || !window.ScrollTrigger || !window.ScrollToPlugin) return;

        var gsap = window.gsap;
        var ScrollTrigger = window.ScrollTrigger;
        var ScrollToPlugin = window.ScrollToPlugin;

        gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
        ScrollTrigger.config({ limitCallbacks: true });

        if (ScrollToPlugin.config) {
            ScrollToPlugin.config({ autoKill: true });
        }

        setupSectionNavigation(gsap, ScrollTrigger);

        var mm = gsap.matchMedia();

        mm.add({
            mobile: '(max-width: 767px)',
            tablet: '(min-width: 768px) and (max-width: 992px)',
            desktop: '(min-width: 993px)',
            reduceMotion: '(prefers-reduced-motion: reduce)'
        }, function (context) {
            var tablet = !!context.conditions.tablet;
            var desktop = !!context.conditions.desktop;
            var reduceMotion = !!context.conditions.reduceMotion;
            var badgeObservers = [];

            var productProfile = desktop ? {
                initialY: 10,
                revealY: 12,
                batchMax: 8,
                start: 'clamp(top 91%)'
            } : tablet ? {
                initialY: 9,
                revealY: 10,
                batchMax: 6,
                start: 'clamp(top 92%)'
            } : {
                initialY: 8,
                revealY: 8,
                batchMax: 4,
                start: 'clamp(top 93%)'
            };

            var cartProfile = desktop ? {
                maxLag: 14,
                velocityScale: 0.0032
            } : tablet ? {
                maxLag: 10,
                velocityScale: 0.0028
            } : {
                maxLag: 8,
                velocityScale: 0.0024
            };

            var cleanupProductReveal = setupProductReveal(gsap, ScrollTrigger, productProfile, reduceMotion);
            var cleanupCartList = setupCartListMotion(gsap, ScrollTrigger, reduceMotion);
            var cleanupCartScroll = setupCartScrollMotion(gsap, ScrollTrigger, cartProfile, reduceMotion);

            gsap.utils.toArray('.shopMenuRightIcon .badge, .shopMenuRightIcon .badget').forEach(function (badge) {
                gsap.set(badge, { transformOrigin: '50% 50%' });

                var observer = new MutationObserver(function () {
                    gsap.killTweensOf(badge);

                    if (reduceMotion) {
                        gsap.fromTo(badge,
                            { autoAlpha: 0.72 },
                            {
                                autoAlpha: 1,
                                duration: 0.12,
                                ease: EASE.enter,
                                overwrite: true,
                                clearProps: 'opacity,visibility'
                            }
                        );
                        return;
                    }

                    gsap.timeline()
                        .to(badge, {
                            scale: 1.08,
                            duration: MOTION.badgeUp,
                            ease: EASE.enter
                        })
                        .to(badge, {
                            scale: 1,
                            duration: MOTION.badgeDown,
                            ease: EASE.enter
                        });
                });

                observer.observe(badge, {
                    childList: true,
                    characterData: true,
                    subtree: true
                });
                badgeObservers.push(observer);
            });

            if (window.jQuery) {
                window.jQuery(document)
                    .off('shown.bs.dropdown.scUxMotion')
                    .on('shown.bs.dropdown.scUxMotion', function (event) {
                        var menu = window.jQuery(event.target)
                            .find('> .dropdown-menu, .dropdown-menu')
                            .first()[0];

                        if (!menu) return;

                        gsap.fromTo(menu,
                            {
                                autoAlpha: 0,
                                y: reduceMotion ? 0 : -3
                            },
                            {
                                autoAlpha: 1,
                                y: 0,
                                duration: reduceMotion ? 0.12 : MOTION.dropdown,
                                ease: EASE.enter,
                                overwrite: true,
                                clearProps: 'transform,opacity,visibility'
                            }
                        );
                    });
            }

            return function () {
                cleanupProductReveal();
                cleanupCartList();
                cleanupCartScroll();

                badgeObservers.forEach(function (observer) {
                    observer.disconnect();
                });

                if (window.jQuery) {
                    window.jQuery(document).off('shown.bs.dropdown.scUxMotion');
                }
            };
        });

        function refreshTriggers() {
            window.setTimeout(function () {
                ScrollTrigger.refresh();
            }, 120);
        }

        if (document.readyState === 'complete') {
            refreshTriggers();
        } else {
            window.addEventListener('load', refreshTriggers, { once: true });
        }

        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(refreshTriggers).catch(function () {});
        }
    }

    function setupProductReveal(gsap, ScrollTrigger, profile, reduceMotion) {
        var cards = gsap.utils.toArray('.listadoShop .productoShop');
        var batchTriggers = [];
        var safetyTimer = null;
        var initialRafA = 0;
        var initialRafB = 0;

        function noop() {}

        if (!cards.length) return noop;

        if (reduceMotion) {
            gsap.set(cards, { clearProps: 'transform,opacity,visibility' });
            return noop;
        }

        var initialCards = [];
        var deferredCards = [];

        cards.forEach(function (card) {
            var rect = card.getBoundingClientRect();

            if (rect.bottom < -20) {
                gsap.set(card, {
                    autoAlpha: 1,
                    y: 0,
                    clearProps: 'transform,opacity,visibility'
                });
                return;
            }

            if (rect.top <= window.innerHeight * 0.96) {
                initialCards.push(card);
            } else {
                deferredCards.push(card);
            }
        });

        if (initialCards.length) {
            /*
             * Fuerza un estado inicial pintado antes del tween. Separar set/to
             * por dos frames evita que el navegador colapse ambos estados y
             * haga que las primeras cards parezcan aparecer instantáneamente.
             */
            gsap.set(initialCards, {
                autoAlpha: 0,
                y: profile.initialY
            });

            initialRafA = window.requestAnimationFrame(function () {
                initialRafA = 0;
                initialRafB = window.requestAnimationFrame(function () {
                    initialRafB = 0;

                    gsap.to(initialCards, {
                        autoAlpha: 1,
                        y: 0,
                        duration: MOTION.productInitial,
                        stagger: 0.032,
                        ease: EASE.enter,
                        overwrite: 'auto',
                        onComplete: function () {
                            initialCards.forEach(function (card) {
                                gsap.set(card, { clearProps: 'transform,opacity,visibility' });
                            });
                        }
                    });
                });
            });
        }

        function revealBatch(batch) {
            gsap.to(batch, {
                autoAlpha: 1,
                y: 0,
                duration: MOTION.productReveal,
                stagger: MOTION.productStagger,
                ease: EASE.enter,
                overwrite: 'auto',
                onComplete: function () {
                    batch.forEach(function (card) {
                        gsap.set(card, { clearProps: 'transform,opacity,visibility' });
                    });
                }
            });
        }

        if (deferredCards.length) {
            gsap.set(deferredCards, {
                autoAlpha: 0,
                y: profile.revealY
            });

            batchTriggers = ScrollTrigger.batch(deferredCards, {
                start: profile.start,
                once: true,
                interval: 0.06,
                batchMax: profile.batchMax,
                onEnter: revealBatch,
                onEnterBack: revealBatch
            }) || [];

            safetyTimer = window.setTimeout(function () {
                deferredCards.forEach(function (card) {
                    var rect = card.getBoundingClientRect();
                    var style = window.getComputedStyle(card);
                    var opacity = parseFloat(style.opacity);

                    if (rect.top <= window.innerHeight * 1.03 &&
                        rect.bottom >= -30 &&
                        (style.visibility === 'hidden' || opacity < 0.05)) {
                        gsap.killTweensOf(card);
                        gsap.to(card, {
                            autoAlpha: 1,
                            y: 0,
                            duration: 0.20,
                            ease: EASE.enter,
                            overwrite: true,
                            clearProps: 'transform,opacity,visibility'
                        });
                    }
                });

                ScrollTrigger.refresh();
            }, 900);
        }

        return function () {
            if (initialRafA) window.cancelAnimationFrame(initialRafA);
            if (initialRafB) window.cancelAnimationFrame(initialRafB);
            if (safetyTimer) window.clearTimeout(safetyTimer);

            batchTriggers.forEach(function (trigger) {
                if (trigger && trigger.kill) trigger.kill();
            });

            gsap.killTweensOf(cards);
            gsap.set(cards, { clearProps: 'transform,opacity,visibility' });
        };
    }

    function setupCartListMotion(gsap, ScrollTrigger, reduceMotion) {
        var animatedRoots = new WeakSet();
        var observer = null;
        var rafId = 0;
        var refreshTimer = null;

        function cartRoot(table) {
            return table.closest('.carritoFixedContent, .carritoBox, .shop_carrito') || table;
        }

        function productRows(table) {
            return Array.prototype.filter.call(
                table.querySelectorAll('tr'),
                function (row) {
                    if (row.matches('.total, .subtotal, .ahorro')) return false;
                    return row.offsetParent !== null || row.getClientRects().length > 0;
                }
            );
        }

        function animatePendingLists() {
            rafId = 0;
            var animatedAny = false;

            gsap.utils.toArray('.carritoTable').forEach(function (table) {
                var root = cartRoot(table);
                if (animatedRoots.has(root)) return;

                var rows = productRows(table);
                if (!rows.length) return;

                animatedRoots.add(root);
                animatedAny = true;

                if (reduceMotion) {
                    gsap.fromTo(rows,
                        { autoAlpha: 0 },
                        {
                            autoAlpha: 1,
                            duration: 0.12,
                            stagger: 0.018,
                            ease: EASE.enter,
                            overwrite: 'auto',
                            clearProps: 'opacity,visibility'
                        }
                    );
                    return;
                }

                gsap.fromTo(rows,
                    { autoAlpha: 0, y: 4 },
                    {
                        autoAlpha: 1,
                        y: 0,
                        duration: MOTION.cartList,
                        stagger: MOTION.cartStagger,
                        ease: EASE.enter,
                        overwrite: 'auto',
                        clearProps: 'transform,opacity,visibility'
                    }
                );
            });

            if (animatedAny) {
                if (refreshTimer) window.clearTimeout(refreshTimer);
                refreshTimer = window.setTimeout(function () {
                    ScrollTrigger.refresh();
                }, 80);
            }
        }

        function scheduleScan() {
            if (rafId) return;
            rafId = window.requestAnimationFrame(animatePendingLists);
        }

        animatePendingLists();

        if (document.body) {
            observer = new MutationObserver(function (mutations) {
                for (var i = 0; i < mutations.length; i += 1) {
                    if (mutations[i].addedNodes && mutations[i].addedNodes.length) {
                        scheduleScan();
                        break;
                    }
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });
        }

        return function () {
            if (observer) observer.disconnect();
            if (rafId) window.cancelAnimationFrame(rafId);
            if (refreshTimer) window.clearTimeout(refreshTimer);
        };
    }

    function setupCartScrollMotion(gsap, ScrollTrigger, profile, reduceMotion) {
        var entries = [];
        var observer = null;
        var rafId = 0;
        var settleTimer = null;
        var clampLag = gsap.utils.clamp(-profile.maxLag, profile.maxLag);

        function targetForWrapper(wrapper) {
            return wrapper.querySelector('.carritoBox') ||
                wrapper.querySelector('.shop_carrito') ||
                wrapper.firstElementChild ||
                wrapper;
        }

        function hasTarget(target) {
            for (var i = 0; i < entries.length; i += 1) {
                if (entries[i].target === target) return true;
            }
            return false;
        }

        function discoverTargets() {
            rafId = 0;

            entries = entries.filter(function (entry) {
                if (document.documentElement.contains(entry.target)) return true;
                entry.target.classList.remove('sc-cart-scroll-motion');
                return false;
            });

            gsap.utils.toArray('.carritoFixed').forEach(function (wrapper) {
                var target = targetForWrapper(wrapper);
                if (!target || hasTarget(target)) return;

                target.classList.add('sc-cart-scroll-motion');

                entries.push({
                    target: target,
                    moveTo: reduceMotion ? null : gsap.quickTo(target, 'y', {
                        duration: MOTION.cartFollow,
                        ease: EASE.follow,
                        overwrite: 'auto'
                    })
                });
            });
        }

        function scheduleDiscover() {
            if (rafId) return;
            rafId = window.requestAnimationFrame(discoverTargets);
        }

        function moveCartTo(value) {
            for (var i = 0; i < entries.length; i += 1) {
                if (entries[i].moveTo) entries[i].moveTo(value);
            }
        }

        function settleCart() {
            settleTimer = null;
            moveCartTo(0);
        }

        discoverTargets();

        if (document.body) {
            observer = new MutationObserver(function (mutations) {
                for (var i = 0; i < mutations.length; i += 1) {
                    if (mutations[i].addedNodes && mutations[i].addedNodes.length) {
                        scheduleDiscover();
                        break;
                    }
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });
        }

        if (reduceMotion) {
            return function () {
                if (observer) observer.disconnect();
                if (rafId) window.cancelAnimationFrame(rafId);

                entries.forEach(function (entry) {
                    entry.target.classList.remove('sc-cart-scroll-motion');
                });
            };
        }

        var tracker = ScrollTrigger.create({
            start: 0,
            end: 'max',
            onUpdate: function (self) {
                var velocity = self.getVelocity();
                var lag = Math.abs(velocity) < 55 ? 0 : clampLag(velocity * profile.velocityScale);

                moveCartTo(lag);

                if (settleTimer) window.clearTimeout(settleTimer);
                settleTimer = window.setTimeout(settleCart, 70);
            },
            onRefresh: function () {
                moveCartTo(0);
            }
        });

        return function () {
            if (observer) observer.disconnect();
            if (rafId) window.cancelAnimationFrame(rafId);
            if (settleTimer) window.clearTimeout(settleTimer);
            tracker.kill();

            entries.forEach(function (entry) {
                gsap.killTweensOf(entry.target);
                gsap.set(entry.target, { y: 0, clearProps: 'transform' });
                entry.target.classList.remove('sc-cart-scroll-motion');
            });
        };
    }

    function setupSectionNavigation(gsap, ScrollTrigger) {
        if (window.jQuery) {
            window.jQuery('a.anchorLink, a.anchorLinkSub').off('click');
            window.jQuery('.JSgoMenu').off('change');
        }

        var scroller = document.scrollingElement || document.documentElement;
        var activeTween = null;
        var activeTarget = null;
        var sectionMetrics = [];
        var stickyMarkerOffset = 0;
        var clampUnit = gsap.utils.clamp(0, 1);
        var clampDuration = gsap.utils.clamp(SCROLL.minDuration, SCROLL.maxDuration);

        function prefersReducedMotion() {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        }

        function resolveAnchorTarget(href) {
            if (!href || href.charAt(0) !== '#' || href === '#') return null;

            var rawId = href.slice(1);
            var id = rawId;

            try {
                id = decodeURIComponent(rawId);
            } catch (error) {
                id = rawId;
            }

            return document.getElementById(id) || document.getElementsByName(id)[0] || null;
        }

        var categoryIndicator = createCategoryIndicator();

        function createCategoryIndicator() {
            var entries = [];
            var rootSelector = [
                '.wrapp-nav-tabsTopShop .nav-tabsTopShop',
                '.wtopShopMenuMobile .topShopMenuMobile .nav-tabs',
                '.topShopMenuMobileScroller .nav-tabsTopShop'
            ].join(', ');

            function rootEntry(root) {
                for (var i = 0; i < entries.length; i += 1) {
                    if (entries[i].root === root) return entries[i];
                }

                var indicator = document.createElement('span');
                indicator.className = 'sc-category-indicator';
                indicator.setAttribute('aria-hidden', 'true');

                root.classList.add('sc-category-motion-root');
                root.appendChild(indicator);

                var entry = {
                    root: root,
                    indicator: indicator,
                    timeline: null,
                    initialized: false
                };

                entries.push(entry);
                return entry;
            }

            function pruneAndDiscover() {
                entries = entries.filter(function (entry) {
                    if (document.documentElement.contains(entry.root)) return true;
                    if (entry.timeline) entry.timeline.kill();
                    return false;
                });

                Array.prototype.forEach.call(document.querySelectorAll(rootSelector), function (root) {
                    if (!root.querySelector('a.anchorLink, a.anchorLinkSub')) return;
                    rootEntry(root);
                });
            }

            function isVisibleLink(link) {
                if (!link) return false;
                var rect = link.getBoundingClientRect();
                return rect.width > 1 &&
                    rect.height > 1 &&
                    (link.offsetParent !== null || link.getClientRects().length > 0);
            }

            function linkForTarget(root, target) {
                var links = root.querySelectorAll('a.anchorLink[href^="#"], a.anchorLinkSub[href^="#"]');
                var hiddenMatch = null;

                for (var i = 0; i < links.length; i += 1) {
                    if (resolveAnchorTarget(links[i].getAttribute('href')) !== target) continue;
                    if (isVisibleLink(links[i])) return links[i];
                    hiddenMatch = links[i];
                }

                if (hiddenMatch) {
                    var parentItem = hiddenMatch.closest ? hiddenMatch.closest('.nav-top-li') : null;

                    if (parentItem && root.contains(parentItem)) {
                        var parentLinks = parentItem.querySelectorAll('a.anchorLink');
                        for (var j = 0; j < parentLinks.length; j += 1) {
                            if (isVisibleLink(parentLinks[j])) return parentLinks[j];
                        }
                    }
                }

                return null;
            }

            function geometry(entry, link) {
                var rootRect = entry.root.getBoundingClientRect();
                var linkRect = link.getBoundingClientRect();
                var localScale = 1;

                if (entry.root.offsetWidth > 0 && rootRect.width > 0) {
                    localScale = rootRect.width / entry.root.offsetWidth;
                }

                if (!isFinite(localScale) || localScale <= 0) localScale = 1;

                var x = (linkRect.left - rootRect.left) / localScale +
                    (entry.root.scrollLeft || 0);
                var width = linkRect.width / localScale;
                var inset = Math.min(2, Math.max(0, width * 0.04));

                return {
                    x: x + inset,
                    width: Math.max(8, width - inset * 2)
                };
            }

            function durationForDistance(distance) {
                var progress = clampUnit(distance / MOTION.indicatorDistance);
                var shaped = Math.pow(progress, 0.58);

                return MOTION.indicatorNear +
                    (MOTION.indicatorFar - MOTION.indicatorNear) * shaped;
            }

            function moveEntry(entry, link, animate) {
                var target = geometry(entry, link);
                if (!target) return;

                if (entry.timeline) {
                    entry.timeline.kill();
                    entry.timeline = null;
                }

                var currentX = Number(gsap.getProperty(entry.indicator, 'x')) || 0;
                var currentWidth = Math.abs(Number(gsap.getProperty(entry.indicator, 'scaleX'))) || 1;

                if (!entry.initialized || !animate || prefersReducedMotion()) {
                    gsap.set(entry.indicator, {
                        x: target.x,
                        scaleX: target.width,
                        autoAlpha: 1,
                        transformOrigin: '0% 50%'
                    });
                    entry.initialized = true;
                    return;
                }

                var currentCenter = currentX + currentWidth / 2;
                var targetCenter = target.x + target.width / 2;
                var delta = targetCenter - currentCenter;
                var distance = Math.abs(delta);

                if (distance < 1 && Math.abs(target.width - currentWidth) < 1) {
                    gsap.set(entry.indicator, { x: target.x, scaleX: target.width });
                    return;
                }

                var duration = durationForDistance(distance);
                var stretch = gsap.utils.clamp(
                    8,
                    72,
                    distance * 0.16 + Math.abs(target.width - currentWidth) * 0.20
                );
                var leadDuration = duration * 0.46;
                var settleDuration = duration - leadDuration;
                var stageX;
                var stageWidth;

                if (delta >= 0) {
                    stageX = target.x - Math.min(stretch * 0.70, distance * 0.36);
                    stageWidth = target.width + stretch;
                } else {
                    stageX = target.x - Math.min(stretch * 0.30, distance * 0.22);
                    stageWidth = target.width + stretch;
                }

                entry.timeline = gsap.timeline({
                    defaults: { overwrite: 'auto' },
                    onComplete: function () {
                        entry.timeline = null;
                    }
                });

                entry.timeline
                    .to(entry.indicator, {
                        x: stageX,
                        scaleX: stageWidth,
                        duration: leadDuration,
                        ease: EASE.indicatorLead
                    }, 0)
                    .to(entry.indicator, {
                        x: target.x,
                        scaleX: target.width,
                        duration: settleDuration,
                        ease: EASE.indicatorSettle
                    });
            }

            function move(target, animate) {
                if (!target) return;
                pruneAndDiscover();

                entries.forEach(function (entry) {
                    var link = linkForTarget(entry.root, target);
                    if (!link) return;
                    moveEntry(entry, link, animate);
                });
            }

            function refresh(target) {
                if (!target) return;
                pruneAndDiscover();

                entries.forEach(function (entry) {
                    var link = linkForTarget(entry.root, target);
                    if (!link) return;
                    moveEntry(entry, link, false);
                });
            }

            function destroy() {
                entries.forEach(function (entry) {
                    if (entry.timeline) entry.timeline.kill();
                    if (entry.indicator.parentNode) {
                        entry.indicator.parentNode.removeChild(entry.indicator);
                    }
                    entry.root.classList.remove('sc-category-motion-root');
                });
                entries = [];
            }

            return {
                move: move,
                refresh: refresh,
                destroy: destroy
            };
        }

        function getDocumentTop(element) {
            return element.getBoundingClientRect().top +
                (window.pageYOffset || scroller.scrollTop || 0);
        }

        function getStickyOffset() {
            var maxBottom = 0;
            var selectors = [
                '.topBar',
                '.topShop',
                '.wtopShopMenuMobile',
                '.topShopMenuMobile'
            ];

            selectors.forEach(function (selector) {
                visibleElements(selector).forEach(function (element) {
                    var style = window.getComputedStyle(element);
                    if (style.position !== 'fixed' && style.position !== 'sticky') return;

                    var rect = element.getBoundingClientRect();
                    if (rect.height <= 0 || rect.bottom <= 0) return;

                    if (rect.top <= 2 && rect.bottom > 0) {
                        maxBottom = Math.max(maxBottom, rect.bottom);
                    }
                });
            });

            return Math.max(0, Math.ceil(maxBottom)) + 12;
        }

        function getTargetY(target) {
            var y = getDocumentTop(target) - getStickyOffset();
            var maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
            return Math.max(0, Math.min(maxY, y));
        }

        function collectSectionTargets() {
            var targets = [];

            function addTarget(target) {
                if (!target || targets.indexOf(target) !== -1) return;
                targets.push(target);
            }

            Array.prototype.forEach.call(
                document.querySelectorAll('a.anchorLink[href^="#"], a.anchorLinkSub[href^="#"]'),
                function (link) {
                    addTarget(resolveAnchorTarget(link.getAttribute('href')));
                }
            );

            Array.prototype.forEach.call(
                document.querySelectorAll('.JSgoMenu option[value^="#"]'),
                function (option) {
                    addTarget(resolveAnchorTarget(option.value));
                }
            );

            targets.sort(function (a, b) {
                return getDocumentTop(a) - getDocumentTop(b);
            });

            return targets;
        }

        function refreshSectionMetrics() {
            var sectionTargets = collectSectionTargets();
            stickyMarkerOffset = getStickyOffset() + 2;

            sectionMetrics = sectionTargets.map(function (target) {
                return {
                    target: target,
                    top: getDocumentTop(target)
                };
            });

            if (activeTarget) {
                categoryIndicator.refresh(activeTarget);
            }

            syncActiveSectionFromScroll();
        }

        function currentSectionTarget(currentY) {
            if (!sectionMetrics.length) return null;

            var markerY = currentY + stickyMarkerOffset;
            var current = sectionMetrics[0].target;

            for (var i = 0; i < sectionMetrics.length; i += 1) {
                if (sectionMetrics[i].top <= markerY) {
                    current = sectionMetrics[i].target;
                } else {
                    break;
                }
            }

            return current;
        }

        function targetTopFromMetrics(target) {
            for (var i = 0; i < sectionMetrics.length; i += 1) {
                if (sectionMetrics[i].target === target) return sectionMetrics[i].top;
            }
            return getDocumentTop(target);
        }

        function logicalSectionDistance(target, currentY) {
            var source = currentSectionTarget(currentY);
            if (!source) return Math.abs(getDocumentTop(target) - currentY);

            return Math.abs(
                targetTopFromMetrics(target) - targetTopFromMetrics(source)
            );
        }

        function setActiveSection(target) {
            if (!target) return;

            var changed = target !== activeTarget;
            activeTarget = target;

            Array.prototype.forEach.call(
                document.querySelectorAll('a.anchorLink[href^="#"], a.anchorLinkSub[href^="#"]'),
                function (link) {
                    var isCurrent = resolveAnchorTarget(link.getAttribute('href')) === target;
                    link.classList.toggle('sc-motion-current', isCurrent);

                    if (isCurrent) {
                        link.setAttribute('aria-current', 'location');
                    } else if (link.getAttribute('aria-current') === 'location') {
                        link.removeAttribute('aria-current');
                    }
                }
            );

            Array.prototype.forEach.call(document.querySelectorAll('.JSgoMenu'), function (select) {
                var options = select.options || [];

                for (var i = 0; i < options.length; i += 1) {
                    if (resolveAnchorTarget(options[i].value) === target) {
                        if (select.value !== options[i].value) {
                            select.value = options[i].value;
                        }
                        break;
                    }
                }
            });

            categoryIndicator.move(target, changed);
        }

        function syncActiveSectionFromScroll() {
            if (activeTween) return;
            setActiveSection(currentSectionTarget(scroller.scrollTop || 0));
        }

        function speedForSectionDistance(sectionDistance) {
            var progress = clampUnit(sectionDistance / SCROLL.speedDistance);
            var acceleratedProgress = 1 - Math.pow(1 - progress, 2.2);

            return SCROLL.nearSpeed +
                (SCROLL.farSpeed - SCROLL.nearSpeed) * acceleratedProgress;
        }

        function durationForTravel(actualDistance, sectionDistance) {
            if (actualDistance <= 1) return 0;

            var speed = speedForSectionDistance(sectionDistance);
            return clampDuration(actualDistance / speed);
        }

        function closeSectionMenus() {
            Array.prototype.forEach.call(
                document.querySelectorAll('.topPullDown.open'),
                function (menu) {
                    menu.classList.remove('open');
                }
            );

            Array.prototype.forEach.call(
                document.querySelectorAll('.topShopMenuMobile._open'),
                function (menu) {
                    menu.classList.remove('_open');
                }
            );
        }

        function updateHash(href) {
            if (!href ||
                href.charAt(0) !== '#' ||
                !window.history ||
                !window.history.replaceState ||
                window.location.hash === href) {
                return;
            }

            window.history.replaceState(null, document.title, href);
        }

        function focusSectionForKeyboard(target) {
            var focusTarget = target;

            if (target.tagName === 'A' &&
                !target.textContent.trim() &&
                target.nextElementSibling) {
                focusTarget = target.nextElementSibling;
            }

            if (!/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(focusTarget.tagName) &&
                !focusTarget.hasAttribute('tabindex')) {
                focusTarget.setAttribute('tabindex', '-1');
            }

            if (typeof focusTarget.focus === 'function') {
                try {
                    focusTarget.focus({ preventScroll: true });
                } catch (error) {
                    focusTarget.focus();
                }
            }
        }

        function stopSectionTween(syncAfterStop) {
            if (activeTween) {
                var tween = activeTween;
                activeTween = null;
                tween.kill();
                ScrollTrigger.update();
            }

            if (syncAfterStop !== false) {
                syncActiveSectionFromScroll();
            }
        }

        function finishSectionScroll(targetY, href, target, keyboardTriggered) {
            activeTween = null;

            gsap.set(window, {
                scrollTo: {
                    y: targetY,
                    autoKill: false
                }
            });

            ScrollTrigger.update();
            setActiveSection(target);
            updateHash(href);

            if (keyboardTriggered) {
                focusSectionForKeyboard(target);
            }
        }

        function scrollToSection(target, href, keyboardTriggered) {
            stopSectionTween(false);
            setActiveSection(target);

            var currentY = scroller.scrollTop || 0;
            var targetY = getTargetY(target);
            var actualDistance = Math.abs(targetY - currentY);

            if (actualDistance < 1) {
                finishSectionScroll(targetY, href, target, keyboardTriggered);
                return;
            }

            if (prefersReducedMotion()) {
                gsap.set(window, {
                    scrollTo: {
                        y: targetY,
                        autoKill: true
                    }
                });
                setActiveSection(target);
                updateHash(href);

                if (keyboardTriggered) {
                    focusSectionForKeyboard(target);
                }
                return;
            }

            var sectionDistance = logicalSectionDistance(target, currentY);
            var duration = durationForTravel(actualDistance, sectionDistance);

            var tween = gsap.to(window, {
                duration: duration,
                scrollTo: {
                    y: targetY,
                    autoKill: true
                },
                ease: EASE.scroll,
                overwrite: true,
                onUpdate: function () {
                    ScrollTrigger.update();
                },
                onComplete: function () {
                    if (activeTween !== tween) return;
                    finishSectionScroll(targetY, href, target, keyboardTriggered);
                },
                onInterrupt: function () {
                    if (activeTween === tween) {
                        activeTween = null;
                        syncActiveSectionFromScroll();
                    }
                }
            });

            activeTween = tween;
        }

        var sectionTracker = ScrollTrigger.create({
            start: 0,
            end: 'max',
            onUpdate: syncActiveSectionFromScroll,
            onRefresh: refreshSectionMetrics
        });

        refreshSectionMetrics();

        window.addEventListener('wheel', function () {
            stopSectionTween(true);
        }, { passive: true });

        window.addEventListener('touchstart', function () {
            stopSectionTween(true);
        }, { passive: true });

        window.addEventListener('keydown', function (event) {
            var keys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
            if (keys.indexOf(event.key) !== -1) {
                stopSectionTween(true);
            }
        });

        document.addEventListener('click', function (event) {
            if (event.button && event.button !== 0) return;
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

            var link = event.target.closest ? event.target.closest('a.anchorLink, a.anchorLinkSub') : null;
            if (!link) return;

            var href = link.getAttribute('href');
            var target = resolveAnchorTarget(href);
            if (!target) return;

            event.preventDefault();
            closeSectionMenus();
            scrollToSection(target, href, event.detail === 0);
        });

        document.addEventListener('change', function (event) {
            var select = event.target;
            if (!select || !select.matches || !select.matches('.JSgoMenu')) return;

            var href = select.value;
            var target = resolveAnchorTarget(href);
            if (!target) return;

            event.preventDefault();
            scrollToSection(target, href, false);
        });

        window.addEventListener('beforeunload', function () {
            stopSectionTween(false);
            sectionTracker.kill();
            categoryIndicator.destroy();
        }, { once: true });
    }

    ready(function () {
        loadScript(GSAP_SRC, 'sc-gsap-core', function () {
            loadScript(SCROLL_TRIGGER_SRC, 'sc-gsap-scrolltrigger', function () {
                loadScript(SCROLL_TO_SRC, 'sc-gsap-scrollto', initMotion);
            });
        });
    });
})();
