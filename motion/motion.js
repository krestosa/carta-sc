(function () {
    'use strict';

    if (window.__scUxMotionBooted) return;
    window.__scUxMotionBooted = true;

    var GSAP_SRC = 'https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js';
    var SCROLL_TRIGGER_SRC = 'https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js';
    var SCROLL_TO_SRC = 'https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollToPlugin.min.js';

    var MOTION = {
        instant: 0.10,
        fast: 0.16,
        ui: 0.22,
        reveal: 0.46
    };

    var SCROLL = {
        minDuration: 0.075,
        maxDuration: 0.45,
        nearSpeed: 4200,
        farSpeed: 26000,
        speedDistance: 7000
    };

    var EASE = {
        enter: 'power2.out',
        exit: 'power2.in',
        reveal: 'power2.out',
        scroll: 'back.out(1.05)'
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
            desktop: '(min-width: 993px)',
            reduceMotion: '(prefers-reduced-motion: reduce)'
        }, function (context) {
            var desktop = context.conditions.desktop;
            var reduceMotion = context.conditions.reduceMotion;
            var plusCleanups = [];
            var badgeObservers = [];

            if (reduceMotion) return;

            var header = visibleElements('.brandOnlyMobile, .topBar, .topShop');
            if (header.length) {
                gsap.fromTo(header,
                    { autoAlpha: 0, y: -4 },
                    {
                        autoAlpha: 1,
                        y: 0,
                        duration: 0.24,
                        stagger: 0.025,
                        ease: EASE.enter,
                        clearProps: 'transform,opacity,visibility'
                    }
                );
            }

            gsap.utils.toArray('.titleShopSeccion, .subTitleShopSeccion').forEach(function (heading) {
                gsap.fromTo(heading,
                    { autoAlpha: 0, y: desktop ? 12 : 9 },
                    {
                        autoAlpha: 1,
                        y: 0,
                        duration: 0.38,
                        ease: EASE.reveal,
                        clearProps: 'transform,opacity,visibility',
                        scrollTrigger: {
                            trigger: heading,
                            start: 'clamp(top 89%)',
                            once: true
                        }
                    }
                );
            });

            var cards = gsap.utils.toArray('.productoShop');
            if (cards.length) {
                gsap.set(cards, {
                    autoAlpha: 0,
                    y: desktop ? 14 : 10
                });

                ScrollTrigger.batch(cards, {
                    start: 'clamp(top 89%)',
                    once: true,
                    interval: 0.08,
                    batchMax: function () {
                        return window.innerWidth >= 993 ? 8 : 4;
                    },
                    onEnter: function (batch) {
                        gsap.to(batch, {
                            autoAlpha: 1,
                            y: 0,
                            duration: MOTION.reveal,
                            stagger: 0.035,
                            ease: EASE.reveal,
                            overwrite: 'auto',
                            onComplete: function () {
                                batch.forEach(function (card) {
                                    gsap.set(card, { clearProps: 'transform,opacity,visibility' });
                                });
                            }
                        });
                    }
                });
            }

            gsap.utils.toArray('.productoShop .sumar').forEach(function (plus) {
                gsap.set(plus, { transformOrigin: '50% 50%' });

                function press() {
                    gsap.to(plus, {
                        scale: 0.94,
                        duration: 0.07,
                        ease: EASE.enter,
                        overwrite: 'auto'
                    });
                }

                function release() {
                    gsap.to(plus, {
                        scale: 1,
                        duration: 0.13,
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
                            scale: 1.12,
                            duration: 0.09,
                            ease: EASE.enter
                        })
                        .to(badge, {
                            scale: 1,
                            duration: 0.11,
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
                        var menu = window.jQuery(event.target).find('> .dropdown-menu, .dropdown-menu').first()[0];
                        if (!menu) return;

                        gsap.fromTo(menu,
                            { autoAlpha: 0, y: -4 },
                            {
                                autoAlpha: 1,
                                y: 0,
                                duration: 0.20,
                                ease: EASE.enter,
                                overwrite: true,
                                clearProps: 'transform,opacity,visibility'
                            }
                        );
                    });
            }

            return function () {
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
            }, 100);
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
            return element.getBoundingClientRect().top + (window.pageYOffset || scroller.scrollTop || 0);
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

            /*
             * Cuanto mas lejos estan los TOPS de las secciones, mayor es la
             * velocidad de crucero. La curva sube rapido y luego satura.
             */
            var acceleratedProgress = 1 - Math.pow(1 - progress, 2.2);
            return SCROLL.nearSpeed + (SCROLL.farSpeed - SCROLL.nearSpeed) * acceleratedProgress;
        }

        function durationForTravel(actualDistance, sectionDistance) {
            if (actualDistance <= 1) return 0;

            var speed = speedForSectionDistance(sectionDistance);
            return clampDuration(actualDistance / speed);
        }

        function closeSectionMenus() {
            Array.prototype.forEach.call(document.querySelectorAll('.topPullDown.open'), function (menu) {
                menu.classList.remove('open');
            });
            Array.prototype.forEach.call(document.querySelectorAll('.topShopMenuMobile._open'), function (menu) {
                menu.classList.remove('_open');
            });
        }

        function updateHash(href) {
            if (!href || href.charAt(0) !== '#' || !window.history || !window.history.replaceState) return;
            if (window.location.hash === href) return;
            window.history.replaceState(null, document.title, href);
        }

        function focusSectionForKeyboard(target) {
            var focusTarget = target;

            if (target.tagName === 'A' && !target.textContent.trim() && target.nextElementSibling) {
                focusTarget = target.nextElementSibling;
            }

            if (!/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(focusTarget.tagName) && !focusTarget.hasAttribute('tabindex')) {
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
            if (keyboardTriggered) focusSectionForKeyboard(target);
        }

        function scrollToSection(target, href, keyboardTriggered) {
            /*
             * Retarget duro: el movimiento anterior se corta primero.
             * No se hereda velocidad ni direccion del tween anterior.
             */
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
                if (keyboardTriggered) focusSectionForKeyboard(target);
                return;
            }

            /*
             * La velocidad se decide con la distancia TOP->TOP entre secciones.
             * El tiempo final usa la distancia que realmente queda por recorrer.
             */
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
                    if (activeTween === tween) activeTween = null;
                }
            });

            activeTween = tween;
        }

        window.addEventListener('wheel', stopSectionTween, { passive: true });
        window.addEventListener('touchstart', stopSectionTween, { passive: true });
        window.addEventListener('keydown', function (event) {
            var keys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
            if (keys.indexOf(event.key) !== -1) stopSectionTween();
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