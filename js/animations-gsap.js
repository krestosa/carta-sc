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
            touch: '(hover: none), (pointer: coarse)',
            reduceMotion: '(prefers-reduced-motion: reduce)'
        }, function (context) {
            var conditions = context.conditions || {};
            var desktop = !!conditions.desktop;
            var touch = !!conditions.touch;
            var reduceMotion = !!conditions.reduceMotion;
            var header = visibleElements('.brandOnlyMobile, .topBar, .topShop');

            if (reduceMotion) {
                gsap.set('.titleShopSeccion, .productoShop, .productoShop .imgShop', {
                    clearProps: 'transform,opacity,visibility'
                });

                if (header.length) {
                    gsap.fromTo(header,
                        { autoAlpha: 0 },
                        {
                            autoAlpha: 1,
                            duration: 0.22,
                            stagger: 0.025,
                            ease: 'power1.out'
                        }
                    );
                }
                return;
            }

            /* Initial chrome: soft, short and almost imperceptible. */
            if (header.length) {
                gsap.fromTo(header,
                    { autoAlpha: 0, y: -10 },
                    {
                        autoAlpha: 1,
                        y: 0,
                        duration: 0.72,
                        stagger: 0.06,
                        ease: 'power3.out',
                        clearProps: 'transform'
                    }
                );
            }

            /* Section titles: gentle reveal as they enter the viewport. */
            gsap.utils.toArray('.titleShopSeccion').forEach(function (heading) {
                gsap.fromTo(heading,
                    { autoAlpha: 0, y: desktop ? 22 : 16 },
                    {
                        autoAlpha: 1,
                        y: 0,
                        duration: desktop ? 0.92 : 0.78,
                        ease: 'power3.out',
                        clearProps: 'transform',
                        scrollTrigger: {
                            trigger: heading,
                            start: 'top 91%',
                            once: true
                        }
                    }
                );
            });

            /* Product reveal: opacity + small vertical travel, batched by what enters the viewport. */
            var cards = gsap.utils.toArray('.productoShop');
            if (cards.length) {
                gsap.set(cards, {
                    autoAlpha: 0,
                    y: desktop ? 28 : 18,
                    force3D: true
                });

                ScrollTrigger.batch(cards, {
                    start: 'top 93%',
                    once: true,
                    interval: 0.12,
                    batchMax: desktop ? 6 : 3,
                    onEnter: function (batch) {
                        gsap.to(batch, {
                            autoAlpha: 1,
                            y: 0,
                            duration: desktop ? 0.92 : 0.76,
                            stagger: desktop ? 0.075 : 0.055,
                            ease: 'power3.out',
                            overwrite: 'auto',
                            clearProps: 'transform'
                        });
                    }
                });
            }

            /* Image content follows the card with an even softer settle. */
            gsap.utils.toArray('.productoShop .imgShop').forEach(function (image) {
                gsap.fromTo(image,
                    { autoAlpha: 0.82, y: desktop ? 10 : 6 },
                    {
                        autoAlpha: 1,
                        y: 0,
                        duration: desktop ? 1.05 : 0.88,
                        ease: 'power3.out',
                        clearProps: 'transform,opacity,visibility',
                        scrollTrigger: {
                            trigger: image,
                            start: 'top 94%',
                            once: true
                        }
                    }
                );
            });

            /* Desktop hover remains subtle; scroll reveal stays the main motion language. */
            if (!touch) {
                gsap.utils.toArray('.productoShop').forEach(function (card) {
                    var image = card.querySelector('.imgShop');
                    var plus = card.querySelector('.sumar');

                    card.addEventListener('mouseenter', function () {
                        gsap.to(card, {
                            y: -3,
                            duration: 0.38,
                            ease: 'power3.out',
                            overwrite: 'auto'
                        });

                        if (image) {
                            gsap.to(image, {
                                scale: 1.015,
                                duration: 0.55,
                                ease: 'power3.out',
                                overwrite: 'auto'
                            });
                        }

                        if (plus) {
                            gsap.to(plus, {
                                scale: 1.06,
                                duration: 0.34,
                                ease: 'power2.out',
                                overwrite: 'auto'
                            });
                        }
                    });

                    card.addEventListener('mouseleave', function () {
                        gsap.to(card, {
                            y: 0,
                            duration: 0.5,
                            ease: 'power3.out',
                            overwrite: 'auto'
                        });

                        if (image) {
                            gsap.to(image, {
                                scale: 1,
                                duration: 0.62,
                                ease: 'power3.out',
                                overwrite: 'auto'
                            });
                        }

                        if (plus) {
                            gsap.to(plus, {
                                scale: 1,
                                duration: 0.42,
                                ease: 'power3.out',
                                overwrite: 'auto'
                            });
                        }
                    });

                    card.addEventListener('pointerdown', function () {
                        gsap.to(card, {
                            scale: 0.992,
                            duration: 0.12,
                            ease: 'power2.out',
                            overwrite: 'auto'
                        });
                    });

                    card.addEventListener('pointerup', function () {
                        gsap.to(card, {
                            scale: 1,
                            duration: 0.3,
                            ease: 'power3.out',
                            overwrite: 'auto'
                        });
                    });
                });
            }

            /* Dropdowns: fade + tiny displacement, no bounce. */
            if (window.jQuery) {
                window.jQuery(document).on('shown.bs.dropdown.scMotion', function (event) {
                    var menu = window.jQuery(event.target).find('> .dropdown-menu, .dropdown-menu').first()[0];
                    if (!menu) return;

                    gsap.fromTo(menu,
                        { autoAlpha: 0, y: -6 },
                        {
                            autoAlpha: 1,
                            y: 0,
                            duration: 0.34,
                            ease: 'power3.out',
                            overwrite: true,
                            clearProps: 'transform'
                        }
                    );
                });
            }

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