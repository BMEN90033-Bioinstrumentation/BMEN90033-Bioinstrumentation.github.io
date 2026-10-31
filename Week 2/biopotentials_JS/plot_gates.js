// Section 03 · Gating variables m, h, n (top panel) and the conductances
// g_Na = gbar m^3 h and g_K = gbar n^4 (bottom panel) over the last 70 ms.
// Series are identified by the HTML legend; no in-plot text.
(function () {
    var sel = '#plot-gates';
    var B = window.BIO, refs = null;

    function render() {
        var css = window.CMP.cssVar;
        var f = B.frame(sel, {});
        var gap = 16, ph = (f.ih - gap) / 2;
        var x = B.timeScale(f.iw);
        var yX = d3.scaleLinear().domain([0, 1]).range([ph, 0]);
        var yG = d3.scaleLinear().domain([0, 40]).range([ph, 0]);

        var gT = f.g;
        var gB = f.svg.append('g').attr('transform', 'translate(' + f.m.left + ',' + (f.m.top + ph + gap) + ')');
        B.axes(f, gT, x, yX, ph, 0, { yTitle: 'm,\\ h,\\ n' });
        B.axes(f, gB, x, yG, ph, ph + gap, { yTitle: 'g\\;[\\mathrm{mS/cm^2}]', xTitle: 't\\;[\\mathrm{ms}]' });

        function path(g, c, w) { return g.append('path').attr('class', 'trace').attr('stroke', css(c)).attr('stroke-width', w); }
        refs = {
            x: x, yX: yX, yG: yG,
            m: path(gT, '--c-na', 2), h: path(gT, '--c-h', 2), n: path(gT, '--c-k', 2),
            gNa: path(gB, '--c-na', 2.2), gK: path(gB, '--c-k', 2.2)
        };
        tick();
    }

    function tick() {
        if (!refs) return;
        ['m', 'h', 'n'].forEach(function (k) { refs[k].attr('d', B.tracePath(B.buf[k], refs.x, refs.yX)); });
        ['gNa', 'gK'].forEach(function (k) { refs[k].attr('d', B.tracePath(B.buf[k], refs.x, refs.yG)); });
    }

    B.onRender(render);
    B.onTick(tick, document.querySelector(sel));
})();
