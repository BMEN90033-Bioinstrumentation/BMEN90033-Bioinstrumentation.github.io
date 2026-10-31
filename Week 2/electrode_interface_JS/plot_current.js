// Section 02 · Scrolling electrode-current trace over the last 6 s, and the
// live electrode-potential readout. The frame (axes, titles) is rebuilt on
// theme or size change; each animation frame only rewrites the trace path.
// Sign convention: positive for net reduction (cathodic current).
(function () {
    var sel = '#plot-current';
    var WIN = 6;                    // visible window, s
    var hist = [], tNow = 0, simT = 0;
    var f = null, x = null, y = null, path = null, raf = 0, last = 0;

    function build() {
        var B = window.ELI, css = window.CMP.cssVar;
        f = B.frame(sel, { margin: { top: 36, right: 24 } });
        x = d3.scaleLinear().domain([-WIN, 0]).range([0, f.iw]);
        y = d3.scaleLinear().domain([-1.1, 1.1]).range([f.ih, 0]);
        B.axes(f, f.g, x, y, f.ih, 0, {
            xTitle: 't - t_\\text{now}\\;[\\mathrm{s}]',
            yTitle: 'i\\;[\\text{normalised}]'
        });
        path = f.g.append('path').attr('class', 'trace').attr('stroke', css('--c-i')).attr('stroke-width', 2);
        draw();
    }

    function draw() {
        if (!path) return;
        path.attr('d', d3.line()
            .x(function (d) { return x(d[0] - tNow); })
            .y(function (d) { return y(d[1]); })(hist));
    }

    function readout(i) {
        var B = window.ELI, el = document.querySelector('[data-out="e"]');
        if (el) el.textContent = (B.potential(i, B.p.mode) >= 0 ? '+' : '') + B.potential(i, B.p.mode).toFixed(3) + ' V';
    }

    function tick(now) {
        raf = requestAnimationFrame(tick);
        var B = window.ELI, p = B.p;
        var dt = last ? (now - last) / 1000 : 0;
        last = now;
        if (p.paused || dt <= 0) return;
        dt = Math.min(dt, 0.05);
        tNow += dt;
        simT += dt * p.speed;
        var i = B.current(simT, p.mode);
        hist.push([tNow, i]);
        while (hist.length && hist[0][0] < tNow - WIN) hist.shift();
        readout(i);
        draw();
    }
    function start() { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

    // Mode-dependent readouts.
    var modeText = {
        equil:   ['equilibrium', '\\text{no net reaction}'],
        reduce:  ['reduction', '\\text{AgCl} + e^- \\rightarrow \\text{Ag} + \\text{Cl}^-'],
        oxidize: ['oxidation', '\\text{Ag} + \\text{Cl}^- \\rightarrow \\text{AgCl} + e^-']
    };
    function modeOut() {
        var m = modeText[window.ELI.p.mode];
        document.querySelectorAll('[data-out="mode"]').forEach(function (el) { el.textContent = m[0]; });
        document.querySelectorAll('[data-out="reaction"]').forEach(function (el) {
            if (window.katex) window.katex.render(m[1], el, { throwOnError: false });
        });
    }

    function init() {
        build();
        modeOut();
        readout(0);
        window.addEventListener('themechange', build);
        window.addEventListener('resize', build);
        window.addEventListener('elichange', function (e) {
            var k = e.detail && e.detail.key;
            if (k === 'reset') { hist = []; tNow = 0; simT = 0; draw(); readout(0); }
            if (k === 'mode' || k === 'reset') modeOut();
        });
        new IntersectionObserver(function (es) {
            es.forEach(function (e) { if (e.isIntersecting) start(); else stop(); });
        }, { threshold: 0.05 }).observe(document.querySelector(sel));
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
