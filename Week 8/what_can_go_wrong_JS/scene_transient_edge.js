(function () {
    var tauSlider, tauReadout, offsetSlider, offsetReadout;

    function draw() {
        var tau = +tauSlider.value;
        var initialOffset = +offsetSlider.value;
        tauReadout.textContent = tau.toFixed(2) + ' s';
        offsetReadout.textContent = initialOffset.toFixed(2) + ' mV';

        var out = window.WCGW.linspace(0, 6, 700).map(function (t) {
            var baseline = 0.10 * Math.sin(2 * Math.PI * 0.18 * t);
            var truth = 0.12 + baseline + 0.34 * window.WCGW.ecg(t, { st: 0.04 });
            var transient = initialOffset * Math.exp(-t / tau);
            return {
                t: t,
                truth: truth,
                transient: transient,
                measured: truth + transient,
                settled: truth + initialOffset * Math.exp(-5)
            };
        });

        var yMin = d3.min(out, function (d) { return Math.min(d.truth, d.measured); });
        var yMax = d3.max(out, function (d) { return Math.max(d.truth, d.measured); });
        var pad = 0.15 * Math.max(1, yMax - yMin);
        var P = window.WCGW.setupPlot('#plot-transient', {
            legend: [
                { key: 'clean', label: 'true analogue signal', opacity: 0.38 },
                { key: 'distort', label: 'with capacitor transient' },
                { key: 'fixed', label: 'after settling', opacity: 0.45, dash: true },
                { key: 'distort', band: true, label: 'first 5τ' }
            ],
            xDomain: [0, 6],
            yDomain: [yMin - pad, yMax + pad],
            xLabel: 't\\,[\\mathrm{s}]',
            yLabel: 'v\\,[\\mathrm{mV}]'
        });
        P.g.append('rect').attr('x', P.x(0)).attr('y', 0).attr('width', P.x(Math.min(6, 5 * tau))).attr('height', P.innerH)
            .attr('fill', P.colors.distort).attr('opacity', 0.08);
        window.WCGW.drawLine(P, out, function (d) { return d.t; }, function (d) { return d.truth; }, 'clean reference', P.y);
        window.WCGW.drawLine(P, out, function (d) { return d.t; }, function (d) { return d.measured; }, 'distort', P.y);
        window.WCGW.drawLine(P, out, function (d) { return d.t; }, function (d) { return d.settled; }, 'fixed faint', P.y);
    }

    document.addEventListener('DOMContentLoaded', function () {
        tauSlider = document.getElementById('transient-tau-slider');
        tauReadout = document.getElementById('transient-tau-val');
        offsetSlider = document.getElementById('transient-offset-slider');
        offsetReadout = document.getElementById('transient-offset-val');
        if (!tauSlider || !offsetSlider) return;
        tauSlider.addEventListener('input', draw);
        offsetSlider.addEventListener('input', draw);
        window.addEventListener('resize', window.WCGW.debounceResize(draw));
        draw();
    });
})();
