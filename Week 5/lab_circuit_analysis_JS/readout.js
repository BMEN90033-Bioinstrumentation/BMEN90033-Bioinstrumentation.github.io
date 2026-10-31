// Fills every [data-out] readout value from the present parameters and the
// cursor frequency.
(function () {
    function render() {
        var L = window.LCA, p = L.p, P = L.params();
        var tau = 2 * Math.PI;
        var h = L.evalH(tau * p.f, P);
        var magDb = 20 * Math.log10(Math.max(h.mag, 1e-12));
        var a360 = Math.atan2(h.im, h.re) * 180 / Math.PI;
        if (a360 < 0) a360 += 360;
        var midDb = 20 * Math.log10(P.Amid);
        var out = {
            ic: (P.IC * 1e3).toFixed(3) + ' mA',
            vce: P.sat ? 'saturated' : P.VCE.toFixed(2) + ' V',
            gm: (P.gm * 1e3).toFixed(2) + ' mA/V',
            rpi: L.fmtRes(P.r_pi),
            rin: L.fmtRes(P.Rin),
            amid: '−' + P.Amid.toFixed(1) + ' V/V',
            amiddb: midDb.toFixed(1) + ' dB',
            fl1: L.fmtFreq(P.wL1 / tau),
            fl2: L.fmtFreq(P.wL2 / tau),
            fl3: L.fmtFreq(P.wL3 / tau),
            fz: (P.wZ / tau).toFixed(1) + ' Hz',
            fh1: L.fmtFreq(P.wH1 / tau),
            fh2: L.fmtFreq(P.wH2 / tau),
            cmiller: (P.Cin_Miller * 1e12).toFixed(1) + ' pF',
            mag: h.mag.toFixed(2) + ' (' + magDb.toFixed(1) + ' dB)',
            phase: L.unwrappedPhase(P, p.f).toFixed(1) + '°',
            a360: a360.toFixed(1) + '°',
            re: h.re.toFixed(2),
            im: h.im.toFixed(2) + 'j'
        };
        document.querySelectorAll('[data-out]').forEach(function (el) {
            el.textContent = out[el.dataset.out];
            el.classList.toggle('warn', el.dataset.out === 'vce' && P.sat);
        });
    }

    window.LCA.onRender(render);
})();
