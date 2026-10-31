// Section 02 · Comparator waveforms. Top panel: input and triangle carrier.
// Bottom panel: PWM output (0 = low, 1 = high). A cursor marks the instant
// shown by the comparator schematic. Series are identified by the HTML legend.
(function () {
    var sel = '#plot-pwm';
    var cur = null;

    function render() {
        var C = window.CLD, css = window.CMP.cssVar;
        var f = C.frame(sel, {});
        var P = C.panels(f, [
            { domain: [-1.15, 1.15], ticks: [-1, 0, 1], title: 'v / \\hat{v}_c' },
            { domain: [-0.2, 1.2], ticks: [0, 1], title: '\\text{PWM}', yFormat: function (v) { return v ? 'HIGH' : 'LOW'; } }
        ], 22);
        var T0 = P.list[0], T1 = P.list[1];
        var n = Math.max(800, Math.ceil(C.p.ratio * 2 * 16));
        var car = d3.range(0, n + 1).map(function (i) { var t = C.WINDOW * i / n; return [P.x(t), T0.y(C.triangleCarrier(t))]; });
        T0.g.append('path').attr('class', 'trace').attr('stroke', css('--c-car')).attr('stroke-width', 1.5)
            .attr('stroke-opacity', 0.8).attr('d', d3.line()(car));
        var vin = d3.range(0, 801).map(function (i) { var t = C.WINDOW * i / 800; return [P.x(t), T0.y(C.inputSignal(t))]; });
        T0.g.append('path').attr('class', 'trace').attr('stroke', css('--c-vin')).attr('stroke-width', 2.2).attr('d', d3.line()(vin));
        var steps = C.pwmSteps(0, C.WINDOW).map(function (d) { return [P.x(d[0]), T1.y(d[1])]; });
        T1.g.append('path').attr('class', 'trace').attr('stroke', css('--c-hi')).attr('stroke-width', 1.8).attr('d', d3.line()(steps));
        cur = C.cursor(P, [
            { panel: 0, col: '--c-vin', fn: C.inputSignal },
            { panel: 0, col: '--c-car', fn: C.triangleCarrier },
            { panel: 1, col: '--c-hi', fn: C.pwmSignal }
        ]);
        tick();
    }

    function tick() { if (cur) cur.update(window.CLD.clock.th); }

    window.CLD.onRender(render);
    window.CLD.onTick(tick);
})();
