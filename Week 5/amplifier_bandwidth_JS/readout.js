// Fills every [data-out] readout value from the present parameters.
(function () {
    function render() {
        var A = window.AMP, p = A.p, s = A.state();
        var out = {
            w0: A.fmtFreq(s.w0),
            f0: A.fmtHz(s.w0),
            av: A.fmtAv(p.Av),
            avdb: (20 * Math.log10(p.Av)).toFixed(1) + ' dB',
            testhz: A.fmtHz(p.testFreq),
            ratio: s.ratio.toPrecision(3),
            mag: s.mag.toPrecision(4),
            angle: s.angle.toFixed(1) + '°',
            lag: '−' + s.angle.toFixed(1) + '°',
            gain: s.gain.toPrecision(4),
            gaindb: s.db.toFixed(1) + ' dB',
            gainratio: (s.gf * 100).toFixed(1) + '%',
            regime: s.regime,
            gbp: A.fmtFreq(p.GBP),
            gbphz: A.fmtHz(p.GBP),
            gbpw0: A.fmtFreq(p.GBP / p.Av),
            gbpf0: A.fmtHz(p.GBP / p.Av)
        };
        document.querySelectorAll('[data-out]').forEach(function (el) {
            el.textContent = out[el.dataset.out];
        });
    }

    window.AMP.onRender(render);
})();
