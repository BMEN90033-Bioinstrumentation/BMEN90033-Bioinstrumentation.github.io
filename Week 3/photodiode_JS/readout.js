// Fills every [data-out] readout value from the present parameters.
(function () {
    function render() {
        var PD = window.PD, p = PD.p, m = PD.mat();
        var R = PD.responsivity(m.peakWavelength, m);
        var out = {
            vr: p.vr.toFixed(1) + ' V',
            depl: '×' + (PD.deplFrac(p.vr) / PD.deplFrac(0)).toFixed(2),
            mat: m.name,
            eg: m.bandgap.toFixed(2) + ' eV',
            lc: m.cutoffWavelength + ' nm',
            lp: m.peakWavelength + ' nm',
            R: R.toFixed(2) + ' A/W',
            P: (p.light / 100 * PD.P_MAX_UW).toFixed(0) + ' µW',
            iph: PD.photocurrent().toFixed(1) + ' µA'
        };
        document.querySelectorAll('[data-out]').forEach(function (el) { el.textContent = out[el.dataset.out]; });
    }
    window.PD.onRender(render);
})();
