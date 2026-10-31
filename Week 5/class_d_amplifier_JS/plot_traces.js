// Section 05 · The three signals of the chain on one time axis: input,
// PWM at the switching node (0 = ground, 1 = V_CC) and the filtered output.
// Each panel has its own y title, so no in-plot labels are needed.
(function () {
    var sel = '#plot-traces';
    var cur = null;

    function render() {
        var C = window.CLD, css = window.CMP.cssVar;
        var f = C.frame(sel, {});
        var P = C.panels(f, [
            { domain: [-1.15, 1.15], ticks: [-1, 0, 1], title: 'v_\\text{in} / \\hat{v}_c' },
            { domain: [-0.15, 1.15], ticks: [0, 1], title: 'v_\\text{sw} / V_{CC}' },
            { domain: [-0.05, 1.05], ticks: [0, 0.5, 1], title: 'v_\\text{out} / V_{CC}' }
        ], 18);
        var L = P.list;
        function trace(p, fn, col, w, n) {
            var pts = d3.range(0, n + 1).map(function (i) { var t = C.WINDOW * i / n; return [P.x(t), p.y(fn(t))]; });
            p.g.append('path').attr('class', 'trace').attr('stroke', css(col)).attr('stroke-width', w).attr('d', d3.line()(pts));
        }
        trace(L[0], C.inputSignal, '--c-vin', 2, 800);
        L[1].g.append('path').attr('class', 'trace').attr('stroke', css('--c-hi')).attr('stroke-width', 1.5)
            .attr('d', d3.line()(C.pwmSteps(0, C.WINDOW).map(function (d) { return [P.x(d[0]), L[1].y(d[1])]; })));
        function out(t) { return 0.5 + 0.5 * C.filteredSignal(t); }
        trace(L[2], out, '--c-hi', 2.4, Math.max(1200, C.p.ratio * 48));
        cur = C.cursor(P, [
            { panel: 0, col: '--c-vin', fn: C.inputSignal },
            { panel: 1, col: '--c-hi', fn: C.pwmSignal },
            { panel: 2, col: '--c-hi', fn: out }
        ]);
        tick();
    }

    function tick() { if (cur) cur.update(window.CLD.clock.th); }

    window.CLD.onRender(render);
    window.CLD.onTick(tick);
})();
