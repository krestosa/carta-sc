(function () {
    'use strict';

    if (window.__scUxMotionBooted) return;
    window.__scUxMotionBooted = true;

    var GSAP_SRC = 'https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js';
    var SCROLL_TRIGGER_SRC = 'https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js';
    var SCROLL_TO_SRC = 'https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollToPlugin.min.js';

    var MOTION = {
        header: 0.18,
        heading: 0.22,
        badgeUp: 0.07,
        badgeDown: 0.10,
        dropdown: 0.16
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
         * Navegación = motion funcional: desplazamiento espacial + orientación.
         * Se mantiene fuera de matchMedia para funcionar en todos los anchos.
         */
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

            var profile = desktop ? {
                headingY: 6,
                headingStart: 'clamp(top 91%)'
            } : tablet ? {
                headingY: 5,
                headingStart: 'clamp(top 92%)'
            } : {
                headingY: 4,
                headingStart: 'clamp(top 93%)'
            };

            var headings = gsap.utils.toArray('.titleShopSeccion, .subTitleShopSeccion');

            /*
             * El catálogo es contenido funcional y de alta frecuencia: las
             * cards no se ocultan ni se animan. El movimiento queda en la
             * estructura (header/títulos) y en feedback de acciones.
             */

            if (reduceMotion) {
                gsap.set(headings, {
                    clearProps: 'transform,opacity,visibility'
                });
                return;
            }

            var header = visibleElements('.brandOnlyMobile, .topBar, .topShop');
            if (header.length) {
                gsap.fromTo(header,
                    { autoAlpha: 0, y: -2 },
                    {
                        autoAlpha: 1,
                        y: 0,
                        duration: MOTION.header,
                        stagger: 0.015,
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
                    ease: EASE.enter,
                    clearProps: 'transform,opacity,visibility'
                };

                if (rect.top > window.innerHeight * 0.94) {
                    vars.immediateRender = false;
                    vars.scrollTrigger = {
                        trigger: heading,
                        start: profile.headingStart,
                        once: true
                    };
                }

                gsap.fromTo(heading,
                    { autoAlpha: 0, y: profile.headingY },
                    vars
                );
            });

            /* Confirmación ocasional: pulsa solo cuando cambia el badge. */
            gsap.utils.toArray('.shopMenuRightIcon .badge, .shopMenuRightIcon .badget').forEach(function (badge) {
                gsap.set(badge, { transformOrigin: '50% 50%' });

                var observer = new MutationObserver(function () {
                    gsap.killTweensOf(badge);
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

            /* Bootstrap dropdowns: puente corto, sin rebote ni escala. */
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

    function setupSectionNavigation(gsap, ScrollTrigger) {
        if (window.jQuery) {
            window.jQuery('a.anchorLink, a.anchorLinkSub').off('click');
            window.jQuery('.JSgoMenu').off('change');
        }

        var scroller = document.scrollingElement || document.documentElement;
        var activeTween = null;
        var activeTarget = null;
        var sectionTargets = [];
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
            sectionTargets = collectSectionTargets();
            stickyMarkerOffset = getStickyOffset() + 2;

            sectionMetrics = sectionTargets.map(function (target) {
                return {
                    target: target,
                    top: getDocumentTop(target)
                };
            });

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
            if (!target || target === activeTarget) return;
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
            /* Retarget duro: corta primero y cambia de dirección en el acto. */
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

        /*
         * Un solo tracker de scroll mantiene la orientación de categoría sin
         * crear un trigger por producto ni leer layouts en cada frame.
         */
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
            stopSectionTween(false);
            sectionTracker.kill();
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
