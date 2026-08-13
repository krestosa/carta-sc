(function () {
    'use strict';

    if (window.__scGsapMotionBooted) return;
    window.__scGsapMotionBooted = true;

    var GSAP_SRC = 'https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js';
    var SCROLL_TRIGGER_SRC = 'https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js';

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
            console.warn('[SushiClub motion] No se pudo cargar:', src);
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

        var mm = gsap.matchMedia();

        mm.add({
            desktop: '(min-width: 993px)',
            mobile: '(max-width: 992px)',
            touch: '(hover: none), (pointer: coarse)',
            reduceMotion: '(prefers-reduced-motion: reduce)'
        }, function (context) {
            var conditions = context.conditions || {};
            var reduceMotion = !!conditions.reduceMotion;
            var desktop = !!conditions.desktop;
            var touch = !!conditions.touch;
            var visibleHeader = visibleElements('.brandOnlyMobile, .topBar');
            var visibleTopShop = visibleElements('.topShop');

            if (reduceMotion) {
                gsap.set([
                    '.brandOnlyMobile',
                    '.topBar',
                    '.topShop',
                    '.titleShopSeccion',
                    '.productoShop'
                ], { clearProps: 'transform' });

                gsap.fromTo(
                    visibleHeader.concat(visibleTopShop),
                    { autoAlpha: 0 },
                    { autoAlpha: 1, duration: 0.2, stagger: 0.03, ease: 'power1.out' }
                );

                return;
            }

            /* Page entrance: layered rather than everything arriving at once. */
            var entrance = gsap.timeline({ defaults: { ease: 'power3.out' } });
            if (visibleHeader.length) {
                entrance.fromTo(
                    visibleHeader,
                    { autoAlpha: 0, y: -18 },
                    { autoAlpha: 1, y: 0, duration: 0.65, stagger: 0.08 },
                    0
                );
            }
            if (visibleTopShop.length) {
                entrance.fromTo(
                    visibleTopShop,
                    { autoAlpha: 0, y: -12 },
                    { autoAlpha: 1, y: 0, duration: 0.55 },
                    0.12
                );
            }

            /* Section headings reveal first and establish hierarchy. */
            gsap.utils.toArray('.titleShopSeccion').forEach(function (heading) {
                gsap.fromTo(heading,
                    { autoAlpha: 0, y: 28 },
                    {
                        autoAlpha: 1,
                        y: 0,
                        duration: 0.68,
                        ease: 'power3.out',
                        scrollTrigger: {
                            trigger: heading,
                            start: 'top 90%',
                            once: true
                        }
                    }
                );
            });

            /* Product groups reveal as a sequence, not as isolated pop-ins. */
            gsap.utils.toArray('.listadoShop').forEach(function (group) {
                var cards = group.querySelectorAll('.productoShop');
                if (!cards.length) return;

                gsap.fromTo(cards,
                    {
                        autoAlpha: 0,
                        y: desktop ? 42 : 24,
                        scale: 0.985
                    },
                    {
                        autoAlpha: 1,
                        y: 0,
                        scale: 1,
                        duration: desktop ? 0.62 : 0.48,
                        stagger: desktop ? 0.065 : 0.045,
                        ease: 'power3.out',
                        clearProps: 'transform',
                        scrollTrigger: {
                            trigger: group,
                            start: 'top 88%',
                            once: true
                        }
                    }
                );
            });

            /* Subtle image settle gives the reveals a more GSAP-like physical finish. */
            gsap.utils.toArray('.productoShop .imgShop').forEach(function (image) {
                gsap.fromTo(image,
                    { scale: 1.035 },
                    {
                        scale: 1,
                        duration: 0.9,
                        ease: 'power3.out',
                        scrollTrigger: {
                            trigger: image,
                            start: 'top 92%',
                            once: true
                        }
                    }
                );
            });

            /* Desktop hover: springy but controlled. Touch devices never get fake hover motion. */
            if (!touch) {
                gsap.utils.toArray('.productoShop').forEach(function (card) {
                    var image = card.querySelector('.imgShop');
                    var plus = card.querySelector('.sumar');

                    function enter() {
                        gsap.to(card, {
                            y: -6,
                            scale: 1.008,
                            duration: 0.34,
                            ease: 'power3.out',
                            overwrite: 'auto'
                        });
                        if (image) {
                            gsap.to(image, {
                                scale: 1.035,
                                duration: 0.5,
                                ease: 'power3.out',
                                overwrite: 'auto'
                            });
                        }
                        if (plus) {
                            gsap.to(plus, {
                                rotation: 90,
                                scale: 1.12,
                                duration: 0.32,
                                ease: 'back.out(1.7)',
                                overwrite: 'auto'
                            });
                        }
                    }

                    function leave() {
                        gsap.to(card, {
                            y: 0,
                            scale: 1,
                            duration: 0.46,
                            ease: 'power3.out',
                            overwrite: 'auto'
                        });
                        if (image) {
                            gsap.to(image, {
                                scale: 1,
                                duration: 0.52,
                                ease: 'power3.out',
                                overwrite: 'auto'
                            });
                        }
                        if (plus) {
                            gsap.to(plus, {
                                rotation: 0,
                                scale: 1,
                                duration: 0.4,
                                ease: 'power3.out',
                                overwrite: 'auto'
                            });
                        }
                    }

                    card.addEventListener('mouseenter', enter);
                    card.addEventListener('mouseleave', leave);
                    card.addEventListener('pointerdown', function () {
                        gsap.to(card, {
                            scale: 0.99,
                            duration: 0.11,
                            ease: 'power2.out',
                            overwrite: 'auto'
                        });
                    });
                    card.addEventListener('pointerup', enter);
                });

                gsap.utils.toArray('.nav-tabsTopShop .anchorLink, .nav-tabsTopShop .anchorLinkSub').forEach(function (link) {
                    link.addEventListener('mouseenter', function () {
                        gsap.to(link, { y: -2, duration: 0.22, ease: 'power3.out', overwrite: 'auto' });
                    });
                    link.addEventListener('mouseleave', function () {
                        gsap.to(link, { y: 0, duration: 0.3, ease: 'power3.out', overwrite: 'auto' });
                    });
                });
            }

            /* Bootstrap dropdowns get a directional entrance from their trigger. */
            if (window.jQuery) {
                window.jQuery(document).on('shown.bs.dropdown.scMotion', function (event) {
                    var menu = window.jQuery(event.target).find('> .dropdown-menu, .dropdown-menu').first()[0];
                    if (!menu) return;
                    gsap.fromTo(menu,
                        { autoAlpha: 0, y: -10, scale: 0.985, transformOrigin: '50% 0%' },
                        { autoAlpha: 1, y: 0, scale: 1, duration: 0.28, ease: 'power3.out', overwrite: true }
                    );
                });
            }

            /* Give ScrollTrigger one refresh after images/layout settle. */
            if (document.readyState === 'complete') {
                window.setTimeout(function () {
                    ScrollTrigger.refresh();
                }, 80);
            } else {
                window.addEventListener('load', function () {
                    window.setTimeout(function () {
                        ScrollTrigger.refresh();
                    }, 80);
                }, { once: true });
            }

            return function () {
                if (window.jQuery) {
                    window.jQuery(document).off('.scMotion');
                }
            };
        });
    }

    ready(function () {
        loadScript(GSAP_SRC, 'sc-gsap-core', function () {
            loadScript(SCROLL_TRIGGER_SRC, 'sc-gsap-scrolltrigger', initMotion);
        });
    });
})();