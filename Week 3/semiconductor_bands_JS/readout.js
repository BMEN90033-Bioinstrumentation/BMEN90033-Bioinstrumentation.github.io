// Fills every [data-out] readout value from the present state.
(function () {
    function render() {
        var B = window.BANDS, p = B.p, s = B.state();
        var ni = B.niSi(p.temp);
        var out = {
            material: s.cfg.label,
            eg: p.mode === 'semiconductor' ? s.eg.toFixed(3) + ' eV' : s.cfg.bandGapEV,
            gap: s.gap > 0.05 ? s.gap.toFixed(2) + ' units' : 'touching',
            free: s.numFree + ' / ' + s.numValence,
            temp: Math.round(p.temp) + ' K',
            egsi: B.egSi(p.temp).toFixed(3) + ' eV',
            kt: (B.K_B * p.temp * 1e3).toFixed(1) + ' meV'
        };
        document.querySelectorAll('[data-out]').forEach(function (el) {
            var k = el.dataset.out;
            if (k === 'ni' || k === 'cond') {
                var v = k === 'ni' ? ni : s.sigma, lim = k === 'ni' ? -3 : -20;
                var unit = k === 'ni' ? '\\,\\text{cm}^{-3}' : '\\,\\text{S/cm}';
                var tex = (v < Math.pow(10, lim) ? '< 10^{' + lim + '}' : B.fmtSci(v)) + unit;
                if (window.katex) window.katex.render(tex, el, { throwOnError: false });
                else el.textContent = v.toExponential(2);
                return;
            }
            el.textContent = out[k];
        });
    }

    window.BANDS.onRender(render);
})();
