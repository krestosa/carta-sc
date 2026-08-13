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
        gsap.config({ nullTargetWarn: false });
        ScrollTrigger.config({ limitCallbacks: true });

        var mm = gsap.matchMedia();

        mm.add({
            desktop: '(min-width: 993px)',
            finePointer: '(hover: hover) and (pointer: fine)',
            reduceMotion: '(prefers-reduced-motion: reduce)'
        }, function (context) {
            var conditions = context.conditions || {};
            var desktop = !!conditions.desktop;
            var finePointer = !!conditions.finePointer;
            var reduceMotion = !!conditions.reduceMotion;
            var header = visibleElements('.brandOnlyMobile, .topBar, .topShop');
            var cards = gsap.utils.toArray('.productoShop');
            var cleanupFns = [];

            function makeRealImageLayer(card) {
                var frame = card.querySelector('.imgShop');
                if (!frame) return null;

                var existing = frame.querySelector('.sc-gsap-media-img');
                if (existing) return existing;

                var source = frame.querySelector('img[src]');
                if (!source || !source.getAttribute('src')) return null;

                var image = source.cloneNode(false);
                image.className = 'sc-gsap-media-img';
                image.removeAttribute('style');
                image.setAttribute('alt', '');
                image.setAttribute('aria-hidden', 'true');
                image.setAttribute('draggable', 'false');
                image.decoding = 'async';

                frame.appendChild(image);

                gsap.set(image, {
                    scale: 1,
                    transformOrigin: '50% 50%',
                    force3D: false
                });

                function activateImage() {
                    if (!image.naturalWidth) return;
                    frame.classList.add('sc-gsap-img-ready');
                    frame.style.backgroundImage = 'none';
                }

                if (image.complete && image.naturalWidth) {
                    activateImage();
                } else {
                    image.addEventListener('load', activateImage, { once: true });
                }

                return image;
            }

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

            /* Header: soft entrance only. */
            if (header.length) {
                gsap.fromTo(header,
                    { autoAlpha: 0, y: -8 },
                    {
                        autoAlpha: 1,
                        y: 0,
                        duration: 0.78,
                        stagger: 0.055,
                        ease: 'power3.out',
                        clearProps: 'transform'
                    }
                );
            }

            /* Titles reveal gently when entering the viewport. */
            gsap.utils.toArray('.titleShopSeccion').forEach(function (heading) {
                gsap.fromTo(heading,
                    { autoAlpha: 0, y: desktop ? 20 : 14 },
                    {
                        autoAlpha: 1,
                        y: 0,
                        duration: desktop ? 0.9 : 0.78,
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

            /* Product reveal: opacity + translate only. */
            if (cards.length) {
                gsap.set(cards, {
                    autoAlpha: 0,
                    y: desktop ? 26 : 17
                });

                ScrollTrigger.batch(cards, {
                    start: 'top 93%',
                    once: true,
                    interval: 0.11,
                    batchMax: desktop ? 6 : 3,
                    onEnter: function (batch) {
                        gsap.to(batch, {
                            autoAlpha: 1,
                            y: 0,
                            duration: desktop ? 0.88 : 0.74,
                            stagger: desktop ? 0.068 : 0.052,
                            ease: 'power3.out',
                            overwrite: 'auto',
                            onComplete: function () {
                                batch.forEach(function (card) {
                                    gsap.set(card, { clearProps: 'transform' });
                                });
                            }
                        });
                    }
                });
            }

            /* Image frame reveal. Never scale the frame itself. */
            gsap.utils.toArray('.productoShop .imgShop').forEach(function (frame) {
                gsap.fromTo(frame,
                    { autoAlpha: 0.9, y: desktop ? 7 : 5 },
                    {
                        autoAlpha: 1,
                        y: 0,
                        duration: desktop ? 0.96 : 0.82,
                        ease: 'power3.out',
                        clearProps: 'transform,opacity,visibility',
                        scrollTrigger: {
                            trigger: frame,
                            start: 'top 94%',
                            once: true
                        }
                    }
                );
            });

            /*
             * Hover implementation:
             * - Animate a real <img>, never a CSS background.
             * - Keep the product/card/frame geometry fixed.
             * - force3D:false avoids forcing the scale onto a 3D raster layer.
             * - One paused tween is played/reversed, so no new tween is created
             *   and no retargeting occurs while the pointer is stable.
             */
            if (finePointer) {
                cards.forEach(function (card) {
                    var media = makeRealImageLayer(card);
                    var plus = card.querySelector('.sumar');
                    if (!media) return;

                    var hoverTween = gsap.to(media, {
                        scale: 1.02,
                        duration: 0.62,
                        ease: 'power2.out',
                        paused: true,
                        force3D: false,
                        transformOrigin: '50% 50%',
                        overwrite: false
                    });

                    var plusTween = null;
                    if (plus) {
                        gsap.set(plus, {
                            scale: 1,
                            transformOrigin: '50% 50%',
                            force3D: false
                        });

                        plusTween = gsap.to(plus, {
                            scale: 1.04,
                            duration: 0.42,
                            ease: 'power2.out',
                            paused: true,
                            force3D: false,
                            overwrite: false
                        });
                    }

                    function onEnter() {
                        hoverTween.play();
                        if (plusTween) plusTween.play();
                    }

                    function onLeave() {
                        hoverTween.reverse();
                        if (plusTween) plusTween.reverse();
                    }

                    card.addEventListener('pointerenter', onEnter, { passive: true });
                    card.addEventListener('pointerleave', onLeave, { passive: true });

                    cleanupFns.push(function () {
                        card.removeEventListener('pointerenter', onEnter);
                        card.removeEventListener('pointerleave', onLeave);
                        hoverTween.kill();
                        if (plusTween) plusTween.kill();
                    });
                });
            }

            /* Dropdowns: small compositor-friendly reveal. */
            if (window.jQuery) {
                window.jQuery(document).on('shown.bs.dropdown.scMotion', function (event) {
                    var menu = window.jQuery(event.target).find('> .dropdown-menu, .dropdown-menu').first()[0];
                    if (!menu) return;

                    gsap.fromTo(menu,
                        { autoAlpha: 0, y: -5 },
                        {
                            autoAlpha: 1,
                            y: 0,
                            duration: 0.36,
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
                cleanupFns.forEach(function (fn) { fn(); });
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
