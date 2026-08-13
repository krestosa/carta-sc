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

    var EASE = {
        enter: 'power2.out',
        exit: 'power2.in',
        reveal: 'power2.out'
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

        var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var desktop = window.matchMedia('(min-width: 993px)').matches;

        setupSectionNavigation(gsap, ScrollTrigger, reduceMotion);

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
                        start: 'top 89%',
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
                start: 'top 89%',
                once: true,
                interval: 0.08,
                batchMax: desktop ? 8 : 4,
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
        });

        if (window.jQuery) {
            window.jQuery(document).on('shown.bs.dropdown.scUxMotion', function (event) {
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

    function setupSectionNavigation(gsap, ScrollTrigger, reduceMotion) {
        /*
         * El scroll legacy usa jQuery.animate(). Lo neutralizamos desde
         * nuestra capa para que exista un solo controlador de movimiento.
         */
        if (window.jQuery) {
            window.jQuery('a.anchorLink, a.anchorLinkSub').off('click');
            window.jQuery('.JSgoMenu').off('change');
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
            var y = target.getBoundingClientRect().top + window.pageYOffset - getStickyOffset();
            var maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
            return Math.max(0, Math.min(maxY, y));
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

        /*
         * Controlador inercial persistente.
         * Al cambiar de destino NO se reinicia una animacion: solo cambia
         * targetY. La velocidad existente se conserva y converge hacia la
         * nueva velocidad deseada.
         */
        var inertial = {
            active: false,
            position: window.pageYOffset || 0,
            velocity: 0,
            targetY: window.pageYOffset || 0,
            href: '',
            focusTarget: null,
            keyboardTriggered: false,
            nativeVelocity: 0
        };

        var clampVelocity = gsap.utils.clamp(-7000, 7000);

        /* GSAP expone la velocidad de scroll en px/s mediante ScrollTrigger. */
        var velocityProbe = ScrollTrigger.create({
            start: 0,
            end: 'max',
            onUpdate: function (self) {
                if (!inertial.active) {
                    inertial.nativeVelocity = self.getVelocity();
                }
            }
        });

        function desiredSpeedForDistance(distance) {
            /*
             * Curva saturante:
             *  100 px  -> ~280 px/s
             *  500 px  -> ~1.3k px/s
             * 1500 px  -> ~2.9k px/s
             * 3000 px  -> ~4.2k px/s
             * Muy cerca del destino la velocidad tiende a cero.
             */
            return 5200 * (1 - Math.exp(-distance / 1800));
        }

        function responsivenessForDistance(distance, directionChanged) {
            var nearFactor = 1 - Math.min(distance / 1200, 1);
            var response = 5.5 + nearFactor * 9.5;
            if (directionChanged) response += 2.5;
            return response;
        }

        function finishInertialScroll() {
            inertial.active = false;
            inertial.velocity = 0;
            inertial.position = inertial.targetY;
            window.scrollTo(0, inertial.targetY);

            updateHash(inertial.href);
            if (inertial.keyboardTriggered && inertial.focusTarget) {
                focusSectionForKeyboard(inertial.focusTarget);
            }

            inertial.focusTarget = null;
            inertial.keyboardTriggered = false;
        }

        function stopInertialScroll() {
            if (!inertial.active) return;
            inertial.active = false;
            inertial.position = window.pageYOffset || document.documentElement.scrollTop || 0;
            inertial.targetY = inertial.position;
            inertial.velocity = 0;
            inertial.href = '';
            inertial.focusTarget = null;
            inertial.keyboardTriggered = false;
        }

        function tick(time, deltaTime) {
            if (!inertial.active) return;

            var dt = Math.min(Math.max(deltaTime / 1000, 0.001), 0.032);
            var currentY = window.pageYOffset || document.documentElement.scrollTop || 0;

            /* Si algo externo movio mucho el scroll, sincronizamos posicion. */
            if (Math.abs(currentY - inertial.position) > 80) {
                inertial.position = currentY;
            }

            var remaining = inertial.targetY - inertial.position;
            var distance = Math.abs(remaining);

            if (distance < 0.75 && Math.abs(inertial.velocity) < 18) {
                finishInertialScroll();
                return;
            }

            var direction = remaining === 0 ? 0 : (remaining > 0 ? 1 : -1);
            var velocityDirection = inertial.velocity === 0 ? direction : (inertial.velocity > 0 ? 1 : -1);
            var directionChanged = direction !== 0 && velocityDirection !== direction;
            var desiredVelocity = direction * desiredSpeedForDistance(distance);
            var response = responsivenessForDistance(distance, directionChanged);
            var blend = 1 - Math.exp(-response * dt);

            /*
             * Conserva inercia: no se resetea velocity al retargetear.
             * Solo se la conduce progresivamente hacia la nueva velocidad.
             */
            inertial.velocity += (desiredVelocity - inertial.velocity) * blend;
            inertial.velocity = clampVelocity(inertial.velocity);

            var nextY = inertial.position + inertial.velocity * dt;
            var nextRemaining = inertial.targetY - nextY;

            /* Evita oscilacion visible al llegar al punto exacto. */
            if ((remaining > 0 && nextRemaining <= 0) || (remaining < 0 && nextRemaining >= 0)) {
                inertial.position = inertial.targetY;
                finishInertialScroll();
                return;
            }

            inertial.position = nextY;
            window.scrollTo(0, nextY);
        }

        gsap.ticker.add(tick);

        function scrollToSection(target, href, keyboardTriggered) {
            var targetY = getTargetY(target);

            if (reduceMotion) {
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
             * Si ya esta en movimiento, solo cambiamos el destino.
             * Si estaba quieto, heredamos una porcion de la velocidad real
             * del scroll para que un click durante una rueda/flick no corte seco.
             */
            if (!inertial.active) {
                inertial.position = window.pageYOffset || document.documentElement.scrollTop || 0;
                inertial.velocity = clampVelocity(inertial.nativeVelocity * 0.55);
                inertial.active = true;
            }

            inertial.targetY = targetY;
            inertial.href = href;
            inertial.focusTarget = target;
            inertial.keyboardTriggered = keyboardTriggered;
        }

        /* Interaccion manual siempre gana sobre el scroll programatico. */
        window.addEventListener('wheel', stopInertialScroll, { passive: true });
        window.addEventListener('touchstart', stopInertialScroll, { passive: true });
        window.addEventListener('keydown', function (event) {
            var keys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
            if (keys.indexOf(event.key) !== -1) stopInertialScroll();
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
    }

    ready(function () {
        loadScript(GSAP_SRC, 'sc-gsap-core', function () {
            loadScript(SCROLL_TRIGGER_SRC, 'sc-gsap-scrolltrigger', function () {
                loadScript(SCROLL_TO_SRC, 'sc-gsap-scrollto', initMotion);
            });
        });
    });
})();
