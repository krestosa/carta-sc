(function () {
    'use strict';

    if (window.__scUxMotionBooted) return;
    window.__scUxMotionBooted = true;

    var GSAP_SRC = 'https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js';
    var SCROLL_TRIGGER_SRC = 'https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js';

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
        if (!window.gsap || !window.ScrollTrigger) return;

        var gsap = window.gsap;
        var ScrollTrigger = window.ScrollTrigger;
        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.config({ limitCallbacks: true });

        var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var desktop = window.matchMedia('(min-width: 993px)').matches;

        if (reduceMotion) return;

        /* Header: casi inmediato; no compite con el contenido. */
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

        /* Titulos: reveal corto, una sola vez y antes del borde inferior. */
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

        /* Producto = una unidad visual. Imagen, texto y precio entran juntos. */
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

        /* Feedback directo: solo el control + responde al press/tap. */
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

        /* Confirmacion real: el badge pulsa solo cuando cambia su contenido. */
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

        /* Dropdown: contexto espacial, sin rebote ni escala. */
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

    ready(function () {
        loadScript(GSAP_SRC, 'sc-gsap-core', function () {
            loadScript(SCROLL_TRIGGER_SRC, 'sc-gsap-scrolltrigger', initMotion);
        });
    });
})();
