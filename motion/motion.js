(function () {
    'use strict';

    if (window.__scUxMotionBooted) return;
    window.__scUxMotionBooted = true;

    var GSAP_SRC = 'https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js';
    var SCROLL_TRIGGER_SRC = 'https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js';
    var SCROLL_TO_SRC = 'https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollToPlugin.min.js';

    var MOTION = {
        header: 0.20,
        heading: 0.32,
        reveal: 0.40,
        stagger: 0.032,
        pressIn: 0.07,
        pressOut: 0.12,
        dropdown: 0.18
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
        reveal: 'power2.out',
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

        /*
         * La navegación de secciones no depende de breakpoint.
         * El mismo ScrollTo funciona en mobile, tablet y desktop.
         */
        setupSectionNavigation(gsap, ScrollTrigger);

        var mm = gsap.matchMedia();

        /*
         * Estos tres rangos cubren el viewport completo sin huecos:
         * mobile  <= 767
         * tablet  768 - 992
         * desktop >= 993
         *
         * Al cambiar de rango GSAP revierte automáticamente el contexto
         * anterior y construye el perfil nuevo sin duplicar ScrollTriggers.
         */
        mm.add({
            mobile: '(max-width: 767px)',
            tablet: '(min-width: 768px) and (max-width: 992px)',
            desktop: '(min-width: 993px)',
            reduceMotion: '(prefers-reduced-motion: reduce)'
        }, function (context) {
            var mobile = !!context.conditions.mobile;
            var tablet = !!context.conditions.tablet;
            var desktop = !!context.conditions.desktop;
            var reduceMotion = !!context.conditions.reduceMotion;

            var profile = desktop ? {
                headingY: 9,
                initialCardY: 10,
                cardY: 12,
                batchMax: 8
            } : tablet ? {
                headingY: 8,
                initialCardY: 8,
                cardY: 10,
                batchMax: 6
            } : {
                headingY: 7,
                initialCardY: 7,
                cardY: 9,
                batchMax: 4
            };

            var plusCleanups = [];
            var badgeObservers = [];
            var safetyTimer = null;
            var cards = gsap.utils.toArray('.productoShop');
            var headings = gsap.utils.toArray('.titleShopSeccion, .subTitleShopSeccion');

            if (reduceMotion) {
                gsap.set(cards.concat(headings), {
                    clearProps: 'transform,opacity,visibility'
                });
                return;
            }

            var header = visibleElements('.brandOnlyMobile, .topBar, .topShop');
            if (header.length) {
                gsap.fromTo(header,
                    { autoAlpha: 0, y: -3 },
                    {
                        autoAlpha: 1,
                        y: 0,
                        duration: MOTION.header,
                        stagger: 0.02,
                        ease: EASE.enter,
                        clearProps: 'transform,opacity,visibility'
                    }
                );
            }

            headings.forEach(function (heading) {
                var rect = heading.getBoundingClientRect();
                var vars = {
                    autoAlpha: 1,
                    y: 0,
                    duration: MOTION.heading,
                    ease: EASE.reveal,
                    clearProps: 'transform,opacity,visibility'
                };

                if (rect.top > window.innerHeight * 0.92) {
                    vars.scrollTrigger = {
                        trigger: heading,
                        start: 'clamp(top 90%)',
                        once: true
                    };
                }

                gsap.fromTo(heading,
                    { autoAlpha: 0, y: profile.headingY },
                    vars
                );
            });

            if (cards.length) {
                var initialCards = [];
                var deferredCards = [];

                cards.forEach(function (card) {
                    var rect = card.getBoundingClientRect();

                    if (rect.top <= window.innerHeight * 0.94) {
                        initialCards.push(card);
                    } else {
                        deferredCards.push(card);
                    }
                });

                /* Productos ya presentes al cargar: aparecen siempre. */
                if (initialCards.length) {
                    gsap.fromTo(initialCards,
                        {
                            autoAlpha: 0,
                            y: profile.initialCardY
                        },
                        {
                            autoAlpha: 1,
                            y: 0,
                            duration: 0.32,
                            stagger: 0.025,
                            ease: EASE.reveal,
                            overwrite: 'auto',
                            onComplete: function () {
                                initialCards.forEach(function (card) {
                                    gsap.set(card, {
                                        clearProps: 'transform,opacity,visibility'
                                    });
                                });
                            }
                        }
                    );
                }

                /* Productos fuera del viewport: reveal por ScrollTrigger. */
                if (deferredCards.length) {
                    gsap.set(deferredCards, {
                        autoAlpha: 0,
                        y: profile.cardY
                    });

                    ScrollTrigger.batch(deferredCards, {
                        start: 'clamp(top 90%)',
                        once: true,
                        interval: 0.07,
                        batchMax: profile.batchMax,
                        onEnter: function (batch) {
                            gsap.to(batch, {
                                autoAlpha: 1,
                                y: 0,
                                duration: MOTION.reveal,
                                stagger: MOTION.stagger,
                                ease: EASE.reveal,
                                overwrite: 'auto',
                                onComplete: function () {
                                    batch.forEach(function (card) {
                                        gsap.set(card, {
                                            clearProps: 'transform,opacity,visibility'
                                        });
                                    });
                                }
                            });
                        }
                    });
                }

                /*
                 * Fallback de layout tardío (imgLiquid/imágenes/etc.).
                 * Ningún producto que ya debería verse puede quedar oculto.
                 */
                safetyTimer = window.setTimeout(function () {
                    cards.forEach(function (card) {
                        var rect = card.getBoundingClientRect();
                        var style = window.getComputedStyle(card);
                        var opacity = parseFloat(style.opacity);

                        if (rect.top <= window.innerHeight * 1.05 &&
                            rect.bottom >= -40 &&
                            (style.visibility === 'hidden' || opacity < 0.05)) {
                            gsap.killTweensOf(card);
                            gsap.set(card, {
                                autoAlpha: 1,
                                y: 0,
                                clearProps: 'transform,opacity,visibility'
                            });
                        }
                    });
                    ScrollTrigger.refresh();
                }, 900);
            }

            gsap.utils.toArray('.productoShop .sumar').forEach(function (plus) {
                gsap.set(plus, { transformOrigin: '50% 50%' });

                function press() {
                    gsap.to(plus, {
                        scale: 0.94,
                        duration: MOTION.pressIn,
                        ease: EASE.enter,
                        overwrite: 'auto'
                    });
                }

                function release() {
                    gsap.to(plus, {
                        scale: 1,
                        duration: MOTION.pressOut,
                        ease: EASE.enter,
                        overwrite: 'auto'
                    });
                }

                plus.addEventListener('pointerdown', press, { passive: true });
                plus.addEventListener('pointerup', release, { passive: true });
                plus.addEventListener('pointercancel', release, { passive: true });
                plus.addEventListener('pointerleave', release, { passive: true });

                plusCleanups.push(function () {
                    plus.removeEventListener('pointerdown', press);
                    plus.removeEventListener('pointerup', release);
                    plus.removeEventListener('pointercancel', release);
                    plus.removeEventListener('pointerleave', release);
                });
            });

            gsap.utils.toArray('.shopMenuRightIcon .badge, .shopMenuRightIcon .badget').forEach(function (badge) {
                gsap.set(badge, { transformOrigin: '50% 50%' });

                var observer = new MutationObserver(function () {
                    gsap.killTweensOf(badge);
                    gsap.timeline()
                        .to(badge, {
                            scale: 1.10,
                            duration: 0.08,
                            ease: EASE.enter
                        })
                        .to(badge, {
                            scale: 1,
                            duration: 0.10,
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
                            { autoAlpha: 0, y: -3 },
                            {
                                autoAlpha: 1,
                                y: 0,
                                duration: MOTION.dropdown,
                                ease: EASE.enter,
                                overwrite: true,
                                clearProps: 'transform,opacity,visibility'
                            }
                        );
                    });
            }

            return function () {
                if (safetyTimer) window.clearTimeout(safetyTimer);
                plusCleanups.forEach(function (cleanup) { cleanup(); });
                badgeObservers.forEach(function (observer) { observer.disconnect(); });

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
    }

    function setupSectionNavigation(gsap, ScrollTrigger) {
        if (window.jQuery) {
            window.jQuery('a.anchorLink, a.anchorLinkSub').off('click');
            window.jQuery('.JSgoMenu').off('change');
        }

        var scroller = document.scrollingElement || document.documentElement;
        var activeTween = null;
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

        function currentSectionTop(currentY) {
            var targets = collectSectionTargets();
            if (!targets.length) return currentY;

            var markerY = currentY + getStickyOffset() + 2;
            var current = null;

            for (var i = 0; i < targets.length; i += 1) {
                var top = getDocumentTop(targets[i]);

                if (top <= markerY) {
                    current = targets[i];
                } else {
                    break;
                }
            }

            return current ? getDocumentTop(current) : currentY;
        }

        function logicalSectionDistance(target, currentY) {
            var sourceTop = currentSectionTop(currentY);
            var targetTop = getDocumentTop(target);
            return Math.abs(targetTop - sourceTop);
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

        function stopSectionTween() {
            if (!activeTween) return;
            activeTween.kill();
            activeTween = null;
            ScrollTrigger.update();
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
            updateHash(href);

            if (keyboardTriggered) {
                focusSectionForKeyboard(target);
            }
        }

        function scrollToSection(target, href, keyboardTriggered) {
            /* Retarget duro: corta primero, mide después. */
            stopSectionTween();

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
                    }
                }
            });

            activeTween = tween;
        }

        window.addEventListener('wheel', stopSectionTween, { passive: true });
        window.addEventListener('touchstart', stopSectionTween, { passive: true });

        window.addEventListener('keydown', function (event) {
            var keys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
            if (keys.indexOf(event.key) !== -1) {
                stopSectionTween();
            }
        });

        document.addEventListener('click', function (event) {
            if (event.button && event.button !== 0) return;
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

            var link = event.target.closest ?
                event.target.closest('a.anchorLink, a.anchorLinkSub') :
                null;

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

            if (!select || !select.matches || !select.matches('.JSgoMenu')) {
                return;
            }

            var href = select.value;
            var target = resolveAnchorTarget(href);
            if (!target) return;

            event.preventDefault();
            scrollToSection(target, href, false);
        });

        window.addEventListener('beforeunload', function () {
            stopSectionTween();
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