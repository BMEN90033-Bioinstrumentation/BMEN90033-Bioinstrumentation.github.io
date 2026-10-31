// Scales each display equation (.eq-block) down until it fits its column,
// to no less than 75 % of the normal size. Equations that still do not fit
// keep the horizontal scrollbar, and should be split over several lines.
// Runs after KaTeX and the web fonts have rendered, and again on resize.
(function () {
    var MIN = 0.75;

    function fit() {
        document.querySelectorAll('.eq-block').forEach(function (b) {
            b.style.setProperty('--eq-scale', '1');
            var cs = getComputedStyle(b);
            var pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
            var avail = b.clientWidth - pad, need = b.scrollWidth - pad;
            if (need > avail + 1) {
                b.style.setProperty('--eq-scale', Math.max(MIN, avail / need * 0.99).toFixed(3));
            }
        });
    }

    var t;
    function later() { clearTimeout(t); t = setTimeout(fit, 120); }
    window.addEventListener('load', function () {
        fit();
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    });
    window.addEventListener('resize', later);
})();
