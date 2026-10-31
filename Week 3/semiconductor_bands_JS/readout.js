// Fills every [data-out] readout value from the present state.
(function () {
    function render() {
        var B = window.BANDS, p = B.p, s = B.state();
        var ni = B.niSi(p.temp);
        var out = {
            material: s.cfg.label,
            eg: s.cfg.bandGapEV,
            gap: s.gap > 0.05 ? s.gap.toFixed(2) + ' units' : 'touching',
            free: s.numFree + ' / ' + s.numValence,
            cond: s.conductivity,
            temp: Math.round(p.temp) + ' K',
            egsi: B.egSi(p.temp).toFixed(3) + ' eV',
            kt: (B.K_B * p.temp * 1e3).toFixed(1) + ' meV'
        };
        document.querySelectorAll('[data-out]').forEach(function (el) {
            var k = el.dataset.out;
            if (k === 'ni') {
                var tex = ni < 1e-3 ? '< 10^{-3}\\,\\text{cm}^{-3}' : B.fmtSci(ni) + '\\,\\text{cm}^{-3}';
                if (window.katex) window.katex.render(tex, el, { throwOnError: false });
                else el.textContent = ni.toExponential(2);
                return;
            }
            el.textContent = out[k];
            if (k === 'material') el.style.color = window.CMP.cssVar(s.cfg.colorVar);
        });
        var sw = document.getElementById('sw-nucleus');
        if (sw) sw.style.background = window.CMP.cssVar(s.cfg.nucleusVar);
    }

    window.BANDS.onRender(render);
})();
