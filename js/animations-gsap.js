(function () {
    'use strict';
    if (window.__scDedicatedMotionRequested) return;
    window.__scDedicatedMotionRequested = true;

    var script = document.createElement('script');
    script.src = 'motion/motion.js';
    script.async = true;
    document.head.appendChild(script);
})();
