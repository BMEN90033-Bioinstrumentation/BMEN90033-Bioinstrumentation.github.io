// Section 04 · Switching node voltage (faint) and the LC-filtered output,
// both as a fraction of V_CC. The filtered trace is V_CC/2 plus V_CC/2 times
// the normalised model output. A cursor marks the present instant.
(function () {
    var sel = '#plot-filter';
    var cur = null;

    function render() {
        var C = window.CLD, css = window.CMP.cssVar;
        var f = C.frame(sel, {});
        var P = C.panels(f, [{ domain: [-0.05, 1.05], ticks: [0, 0.5, 1], title: 'v / V_{CC}' }]);
        var y = P.list[0].y;
        var steps = C.pwmSteps(0, C.WINDOW).map(function (d) { return [P.x(d[0]), y(d[1])]; });
        f.g.append('path').attr('class', 'trace').attr('stroke', css('--c-hi')).attr('stroke-width', 1.3)
            .attr('stroke-opacity', 0.3).attr('d', d3.line()(steps));
        var n = Math.max(1200, C.p.ratio * 2 * 24);
        var out = d3.range(0, n + 1).map(function (i) {
            var t = C.WINDOW * i / n; return [P.x(t), y(0.5 + 0.5 * C.filteredSignal(t))];
        });
        f.g.append('path').attr('class', 'trace').attr('stroke', css('--c-hi')).attr('stroke-width', 2.6).attr('d', d3.line()(out));
        cur = C.cursor(P, [{ panel: 0, col: '--c-hi', fn: function (t) { return 0.5 + 0.5 * C.filteredSignal(t); } }]);
        tick();
    }

    function tick() { if (cur) cur.update(window.CLD.clock.th); }

    window.CLD.onRender(render);
    window.CLD.onTick(tick);
})();
