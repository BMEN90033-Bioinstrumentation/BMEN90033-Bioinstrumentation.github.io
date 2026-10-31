// Shared animation clock. Advances CLD.clock while any [data-anim] figure is
// on screen and calls every function registered with CLD.onTick. The input
// phase advances at p.speed rad/s (the original simTime rate) unless paused.
(function () {
    var C = window.CLD, fns = [], visible = new Set(), raf = 0, last = 0;

    C.onTick = function (fn) { fns.push(fn); };

    function frame(now) {
        var dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016;
        last = now;
        if (C.p.paused !== 'yes') {
            C.clock.th = (C.clock.th + dt * C.p.speed) % C.WINDOW;
            C.clock.t += dt;
        }
        fns.forEach(function (fn) { fn(); });
        raf = requestAnimationFrame(frame);
    }
    function start() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

    function init() {
        var io = new IntersectionObserver(function (es) {
            es.forEach(function (e) { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); });
            if (visible.size) start(); else stop();
        }, { threshold: 0.05 });
        document.querySelectorAll('[data-anim]').forEach(function (el) { io.observe(el); });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
