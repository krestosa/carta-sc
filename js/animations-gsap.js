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
        gsap.config({ force3D: true, nullTargetWarn: false });
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

            function copyBackgroundStyle(source, target) {
                var computed = window.getComputedStyle(source);
                target.style.backgroundImage = computed.backgroundImage;
                target.style.backgroundSize = computed.backgroundSize;
                target.style.backgroundPosition = computed.backgroundPosition;
                target.style.backgroundRepeat = computed.backgroundRepeat;
                target.style.backgroundColor = computed.backgroundColor;
            }

            function ensureMediaLayer(card) {
                var frame = card.querySelector('.imgShop');
                if (!frame) return null;

                var existing = frame.querySelector('.sc-gsap-media');
                if (existing) return existing;

                var layer = document.createElement('div');
                layer.className = 'sc-gsap-media';
                copyBackgroundStyle(frame, layer);
                frame.appendChild(layer);

                gsap.set(layer, {
                    scale: 1,
                    x: 0,
                    y: 0,
                    force3D: true,
                    transformOrigin: '50% 50%'
                });

                return layer;
            }

            function setupNearbyCompositorHints() {
                if (!finePointer || !('IntersectionObserver' in window)) return;

                var observer = new IntersectionObserver(function (entries) {
                    entries.forEach(function (entry) {
                        if (entry.isIntersecting) {
                            ensureMediaLayer(entry.target);
                            entry.target.classList.add('sc-gsap-near');
                        } else {
                            entry.target.classList.remove('sc-gsap-near');
                        }
                    });
                }, {
                    root: null,
                    rootMargin: '420px 0px 420px 0px',
                    threshold: 0
                });

                cards.forEach(function (card) {
                    observer.observe(card);
                });

                return function () {
                    observer.disconnect();
                };
            }

            var disconnectNearbyObserver = setupNearbyCompositorHints();

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

                return function () {
                    if (disconnectNearbyObserver) disconnectNearbyObserver();
                };
            }

            /* Soft initial entrance. */
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

            /* Smooth reveal-on-scroll for section titles. */
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

            /* Product reveal is compositor-only: opacity + translateY. */
            if (cards.length) {
                gsap.set(cards, {
                    autoAlpha: 0,
                    y: desktop ? 26 : 17,
                    force3D: true
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
                            force3D: true,
                            onComplete: function () {
                                batch.forEach(function (card) {
                                    gsap.set(card, { clearProps: 'transform' });
                                });
                            }
                        });
                    }
                });
            }

            /* Image content gets only a tiny opacity/vertical settle on reveal. */
            gsap.utils.toArray('.productoShop .imgShop').forEach(function (image) {
                gsap.fromTo(image,
                    { autoAlpha: 0.88, y: desktop ? 7 : 5 },
                    {
                        autoAlpha: 1,
                        y: 0,
                        duration: desktop ? 0.96 : 0.82,
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

            /*
             * Fine-pointer hover: the card geometry NEVER scales.
             * A dedicated inner background layer is scaled instead, clipped by .imgShop.
             * quickTo() continuously retargets from the current value, so rapid enter/leave
             * never restarts an animation or produces stepping.
             */
            if (finePointer) {
                cards.forEach(function (card) {
                    var plus = card.querySelector('.sumar');
                    var hotTimer = null;
                    var mediaScaleTo = null;
                    var plusScaleTo = null;

                    if (plus) {
                        gsap.set(plus, {
                            scale: 1,
                            force3D: true,
                            transformOrigin: '50% 50%'
                        });
                        plusScaleTo = gsap.quickTo(plus, 'scale', {
                            duration: 0.48,
                            ease: 'power2.out'
                        });
                    }

                    function prepareHotLayer() {
                        var media = ensureMediaLayer(card);
                        if (!media) return null;

                        if (!mediaScaleTo) {
                            mediaScaleTo = gsap.quickTo(media, 'scale', {
                                duration: 0.72,
                                ease: 'power2.out'
                            });
                        }

                        card.classList.add('sc-gsap-hot');
                        if (hotTimer) {
                            window.clearTimeout(hotTimer);
                            hotTimer = null;
                        }

                        return media;
                    }

                    function enter() {
                        if (!prepareHotLayer()) return;
                        mediaScaleTo(1.018);
                        if (plusScaleTo) plusScaleTo(1.045);
                    }

                    function leave() {
                        if (mediaScaleTo) mediaScaleTo(1);
                        if (plusScaleTo) plusScaleTo(1);

                        hotTimer = window.setTimeout(function () {
                            card.classList.remove('sc-gsap-hot');
                        }, 760);
                    }

                    card.addEventListener('pointerenter', enter, { passive: true });
                    card.addEventListener('pointerleave', leave, { passive: true });

                    card.addEventListener('pointerdown', function () {
                        if (plusScaleTo) plusScaleTo(0.985);
                    }, { passive: true });

                    card.addEventListener('pointerup', function () {
                        if (plusScaleTo) plusScaleTo(1.045);
                    }, { passive: true });
                });
            }

            /* Dropdowns stay understated and compositor-only. */
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
                if (disconnectNearbyObserver) disconnectNearbyObserver();
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