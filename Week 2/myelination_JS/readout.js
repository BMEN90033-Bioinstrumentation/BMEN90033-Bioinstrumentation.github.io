// Section 01 readout: speed ratio of the two fronts in the animation, from
// the simulated times each front takes to cross the 60-unit axon.
(function () {
    var M = window.MYE;
    // Time at which key first reaches x, interpolated between samples.
    M.crossTime = function (run, key, x) {
        for (var i = 1; i < run.length; i++) {
            var a = run[i - 1], b = run[i];
            if (a[key] < x && b[key] >= x) return a.t + (b.t - a.t) * (x - a[key]) / (b[key] - a[key]);
        }
        return NaN;
    };
    M.onRender(function () {
        var run = M.simulate(), L = M.HALF_LEN;
        var ratio = M.crossTime(run, 'u', L) / M.crossTime(run, 'm', L);
        var el = document.querySelector('[data-ratio]');
        if (el) el.textContent = ratio.toFixed(1) + '×';
    });
})();
