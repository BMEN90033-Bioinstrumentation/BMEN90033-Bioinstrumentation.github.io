// Section 02 · The fundamental (dashed), each active harmonic (faint) and
// their sum (bold) over three cycles. The y range grows with the sum so the
// combined trace is never clipped. Series are identified by the HTML legend.
(function () {
    var sel = '#plot-combined';

    function render() {
        var H = window.THD, p = H.p, css = window.CMP.cssVar;
        var f = H.frame(sel, {});
        var tEnd = H.CYCLES / p.f * 1000;
        var N = 900;
        var th = d3.range(0, N + 1).map(function (i) { return i / N * H.CYCLES * 2 * Math.PI; });
        var vmax = Math.max(1.2, d3.max(th, function (t) { return Math.abs(H.combined(t)); }) * 1.1);
        var x = d3.scaleLinear().domain([0, tEnd]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([-vmax, vmax]).range([f.ih, 0]).nice();
        H.axes(f, f.g, x, y, f.ih, 0, { xTitle: 't~[\\mathrm{ms}]', yTitle: 'v / V_1' });
        function trace(fn, col, w, op, dash) {
            var path = f.g.append('path').attr('class', 'trace').attr('stroke', col).attr('stroke-width', w)
                .attr('stroke-opacity', op)
                .attr('d', d3.line()(th.map(function (t, i) { return [x(i / N * tEnd), y(fn(t))]; })));
            if (dash) path.attr('stroke-dasharray', dash);
        }
        for (var n = 2; n <= 5; n++) {
            (function (k) {
                if (H.amp(k) < 0.001) return;
                trace(function (t) { return H.amp(k) * Math.sin(k * t); }, css(H.COL[k]), 1.6, 0.6);
            })(n);
        }
        trace(Math.sin, css('--c-ref'), 1.3, 1, '4 4');
        trace(H.combined, css('--c-fund'), 2.6, 1);
    }

    window.THD.onRender(render);
})();
